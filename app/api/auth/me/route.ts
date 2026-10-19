import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getUserChatCount,
  getUserTotalMessageCount,
  MAX_CHATS_PER_USER,
  MAX_MESSAGES_PER_CHAT,
  MAX_USER_TOTAL_MESSAGES,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [chatCount, userTotalMessages] = await Promise.all([
    getUserChatCount(user.id),
    getUserTotalMessageCount(user.id),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    limits: {
      chatCount,
      maxChats: MAX_CHATS_PER_USER,
      isChatLimitReached: chatCount >= MAX_CHATS_PER_USER,
      userTotalMessages,
      maxUserTotalMessages: MAX_USER_TOTAL_MESSAGES,
      isAccountMessageLimitReached: userTotalMessages >= MAX_USER_TOTAL_MESSAGES,
      maxChatMessages: MAX_MESSAGES_PER_CHAT,
    },
  });
}
