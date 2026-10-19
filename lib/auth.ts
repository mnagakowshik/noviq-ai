import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { User } from '@/types/chat';
import { getUserById } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'noviq_session';
const TOKEN_EXPIRY = '7d';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'noviq-ai-super-secret-auth-key-change-in-production-min32chars';
  return new TextEncoder().encode(secret);
}

// -------------------------------------------------------------
// PASSWORD HASHING
// -------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// -------------------------------------------------------------
// JWT SESSION TOKEN GENERATION & VERIFICATION
// -------------------------------------------------------------

export async function createSessionToken(userId: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// CURRENT USER HELPER FOR ROUTE HANDLERS & SERVER COMPONENTS
// -------------------------------------------------------------

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const verification = await verifySessionToken(sessionCookie.value);
    if (!verification) {
      return null;
    }

    return await getUserById(verification.userId);
  } catch (error) {
    console.error('Error verifying session user:', error);
    return null;
  }
}
