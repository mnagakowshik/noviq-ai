import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getUserChats,
  createChat,
  getUserChatCount,
  getUserTotalMessageCount,
  MAX_CHATS_PER_USER,
  MAX_USER_TOTAL_MESSAGES,
  MAX_MESSAGES_PER_CHAT,
} from '@/lib/db';
import { generateId, truncateTitle } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [chats, userTotalMessages] = await Promise.all([
    getUserChats(user.id),
    getUserTotalMessageCount(user.id),
  ]);

  return NextResponse.json({
    chats,
    limits: {
      chatCount: chats.length,
      maxChats: MAX_CHATS_PER_USER,
      isChatLimitReached: chats.length >= MAX_CHATS_PER_USER,
      userTotalMessages,
      maxUserTotalMessages: MAX_USER_TOTAL_MESSAGES,
      isAccountMessageLimitReached: userTotalMessages >= MAX_USER_TOTAL_MESSAGES,
      maxChatMessages: MAX_MESSAGES_PER_CHAT,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatCount = await getUserChatCount(user.id);
  if (chatCount >= MAX_CHATS_PER_USER) {
    return NextResponse.json(
      {
        error: 'Conversation limit reached (maximum 5 conversations). Please delete an older conversation before creating a new one.',
        code: 'LIMIT_MAX_CHATS_REACHED',
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawTitle = typeof body?.title === 'string' && body.title.trim() ? body.title : 'New Chat';
  const title = truncateTitle(rawTitle, 40);

  const chatId = generateId();
  const newChat = await createChat(chatId, user.id, title);

  return NextResponse.json({ chat: newChat }, { status: 201 });
}
