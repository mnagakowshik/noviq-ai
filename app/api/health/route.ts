import { NextResponse } from 'next/server';
import { GEMINI_MODEL } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  return NextResponse.json({
    status: 'ok',
    app: 'Noviq AI',
    model: GEMINI_MODEL,
    hasApiKey: hasKey,
    timestamp: Date.now(),
  });
}
