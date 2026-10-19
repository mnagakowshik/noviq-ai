import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getChatById,
  createChat,
  addChatMessage,
  deleteChatMessage,
  getChatMessageCount,
  getUserTotalMessageCount,
  getUserChatCount,
  MAX_CHATS_PER_USER,
  MAX_MESSAGES_PER_CHAT,
  MAX_USER_TOTAL_MESSAGES,
  MAX_USER_MESSAGE_LENGTH,
} from '@/lib/db';
import { getGeminiClient, checkRateLimit, GEMINI_MODEL } from '@/lib/gemini';
import { generateId, truncateTitle } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate User
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to continue chatting.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting per user ID
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment before sending another message.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // 3. Validate Gemini API Key Presence
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.',
          code: 'API_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    // 4. Parse Request
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.', code: 'INVALID_REQUEST' }, { status: 400 });
    }

    let chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
    const userMessageContent = typeof body.message === 'string' ? body.message.trim() : '';

    if (!userMessageContent) {
      return NextResponse.json({ error: 'Message content cannot be empty.', code: 'EMPTY_MESSAGE' }, { status: 400 });
    }

    // 5. Enforce 2,000 character limit on user message
    if (userMessageContent.length > MAX_USER_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `Message exceeds the maximum limit of ${MAX_USER_MESSAGE_LENGTH.toLocaleString()} characters (length: ${userMessageContent.length}).`,
          code: 'MESSAGE_LENGTH_EXCEEDED',
        },
        { status: 400 }
      );
    }

    // 6. Verify or create Chat
    let chat = chatId ? await getChatById(chatId, user.id) : null;

    if (!chat) {
      // Check 5 chats limit before creating new chat
      const currentChatCount = await getUserChatCount(user.id);
      if (currentChatCount >= MAX_CHATS_PER_USER) {
        return NextResponse.json(
          {
            error: `You have reached the maximum limit of ${MAX_CHATS_PER_USER} conversations. Please delete an older conversation before creating a new one.`,
            code: 'LIMIT_MAX_CHATS_REACHED',
          },
          { status: 403 }
        );
      }

      chatId = chatId || generateId();
      chat = await createChat(chatId, user.id, truncateTitle(userMessageContent, 35));
    }

    // 7. Enforce Limits before processing
    const currentChatMessages = await getChatMessageCount(chatId);
    if (currentChatMessages >= MAX_MESSAGES_PER_CHAT) {
      return NextResponse.json(
        {
          error: `This chat has reached its message limit (${MAX_MESSAGES_PER_CHAT}/${MAX_MESSAGES_PER_CHAT}). Start a new chat to continue.`,
          code: 'LIMIT_CHAT_MESSAGES_REACHED',
        },
        { status: 403 }
      );
    }

    const currentTotalMessages = await getUserTotalMessageCount(user.id);
    if (currentTotalMessages >= MAX_USER_TOTAL_MESSAGES) {
      return NextResponse.json(
        {
          error: `You have reached your account limit of ${MAX_USER_TOTAL_MESSAGES} stored messages across all chats. Please delete an older conversation to free up storage.`,
          code: 'LIMIT_USER_TOTAL_MESSAGES_REACHED',
        },
        { status: 403 }
      );
    }

    // 8. Persist User Message into Database
    const userMsgId = generateId();
    await addChatMessage(userMsgId, chatId, user.id, 'user', userMessageContent);

    // 9. Load Conversation History from Turso for Gemini context
    const updatedChat = await getChatById(chatId, user.id);
    const history = updatedChat?.messages || [];

    // Format for Gemini API (user and model roles)
    const formattedContents = history.map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    // Ensure conversation starts with user turn
    while (formattedContents.length > 0 && formattedContents[0].role !== 'user') {
      formattedContents.shift();
    }

    // 10. Invoke Gemini API Stream
    const ai = getGeminiClient();
    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: formattedContents,
      config: {
        systemInstruction: {
          parts: [
            {
              text: 'You are Noviq AI, an intelligent, helpful, and concise AI assistant built with Google Gemini. Provide clear, well-structured, and helpful answers formatted in Markdown. For code, always specify language tags in code blocks. Maintain an encouraging and professional tone.',
            },
          ],
        },
      },
    });

    // 11. Stream response and persist completed assistant message
    const encoder = new TextEncoder();
    let accumulatedText = '';
    let savedSuccessfully = false;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              accumulatedText += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Persist the completed assistant response to Turso
          if (accumulatedText.trim().length > 0) {
            const assistantMsgId = generateId();
            await addChatMessage(assistantMsgId, chatId, user.id, 'assistant', accumulatedText);
            savedSuccessfully = true;
          }

          controller.close();
        } catch (streamError: unknown) {
          console.error('Error during streaming Gemini response:', streamError);
          const errorMessage =
            streamError instanceof Error
              ? streamError.message
              : 'An error occurred while streaming the AI response.';

          // If generation failed completely without saving, we can safely rollback the user message
          // so the user does not lose message quota on failed requests!
          if (!savedSuccessfully && accumulatedText.trim().length === 0) {
            try {
              await deleteChatMessage(userMsgId, chatId);
            } catch (rollbackErr) {
              console.warn('Failed to rollback user message after AI error:', rollbackErr);
            }
          }

          controller.enqueue(
            encoder.encode(`\n\n*[Error: ${errorMessage}. Please check your connection or try again.]*`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Chat-Id': chatId,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('Error handling /api/chat:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    let status = 500;
    let friendlyMessage = message;

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      status = 401;
      friendlyMessage = 'The provided Gemini API key is invalid. Please check your GEMINI_API_KEY setting.';
    } else if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
      status = 429;
      friendlyMessage = 'Gemini API quota exceeded or rate limit reached. Please try again in a few moments.';
    } else if (message.includes('LIMIT_CHAT_MESSAGES_REACHED')) {
      status = 403;
      friendlyMessage = 'This chat has reached its message limit (10 messages). Start a new chat to continue.';
    } else if (message.includes('LIMIT_USER_TOTAL_MESSAGES_REACHED')) {
      status = 403;
      friendlyMessage = 'Storage limit reached (50 messages max across all chats). Please delete old chats.';
    } else if (message.includes('LIMIT_MAX_CHATS_REACHED')) {
      status = 403;
      friendlyMessage = 'Conversation limit reached (5 conversations max). Please delete old chats.';
    }

    return NextResponse.json({ error: friendlyMessage, code: 'CHAT_REQUEST_ERROR' }, { status });
  }
}
