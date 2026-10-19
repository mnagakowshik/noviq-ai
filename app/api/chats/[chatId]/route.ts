import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getChatById, updateChatTitle, deleteChat } from '@/lib/db';
import { truncateTitle } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;
  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  const chat = await getChatById(chatId, user.id);
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found or access denied.' }, { status: 404 });
  }

  return NextResponse.json({ chat });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Valid title is required' }, { status: 400 });
  }

  const cleanTitle = truncateTitle(body.title.trim(), 40);

  try {
    await updateChatTitle(chatId, user.id, cleanTitle);
    return NextResponse.json({ success: true, title: cleanTitle });
  } catch {
    return NextResponse.json({ error: 'Chat not found or access denied.' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;

  try {
    await deleteChat(chatId, user.id);
    return NextResponse.json({ success: true, message: 'Chat deleted successfully.' });
  } catch {
    return NextResponse.json({ error: 'Chat not found or access denied.' }, { status: 404 });
  }
}
