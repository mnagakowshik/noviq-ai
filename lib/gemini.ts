import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '@/types/chat';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Simple in-memory rate limiter to mitigate denial-of-service / rapid spamming
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25; // 25 requests per minute per IP/client

export function checkRateLimit(clientIdentifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIdentifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIdentifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
}

export function validateAndFormatMessages(messages: unknown): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('INVALID_MESSAGES_EMPTY');
  }

  // Limit conversation history to latest 20 turns to prevent payload abuse
  const recentMessages = messages.slice(-20) as ChatMessage[];

  const formatted: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const msg of recentMessages) {
    if (!msg || typeof msg !== 'object') continue;
    if (typeof msg.content !== 'string' || msg.content.trim() === '') continue;

    // Limit individual message size to 12,000 characters
    const trimmedContent = msg.content.trim().slice(0, 12000);
    const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

    formatted.push({
      role,
      parts: [{ text: trimmedContent }],
    });
  }

  if (formatted.length === 0) {
    throw new Error('INVALID_MESSAGES_EMPTY');
  }

  // Ensure conversation starts with user turn for Gemini requirements
  while (formatted.length > 0 && formatted[0].role !== 'user') {
    formatted.shift();
  }

  if (formatted.length === 0) {
    throw new Error('INVALID_MESSAGES_NO_USER_TURN');
  }

  return formatted;
}
