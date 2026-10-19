import { createClient, type Client } from '@libsql/client';
import { User, ChatSession, ChatMessage } from '@/types/chat';

export const MAX_CHATS_PER_USER = 5;
export const MAX_MESSAGES_PER_CHAT = 10;
export const MAX_USER_TOTAL_MESSAGES = 50;
export const MAX_USER_MESSAGE_LENGTH = 2000;

let dbClient: Client | null = null;
let dbInitialized = false;

export function getDb(): Client {
  if (dbClient) return dbClient;

  const url = process.env.TURSO_DATABASE_URL || 'file:noviq.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  dbClient = createClient({
    url,
    authToken,
  });

  return dbClient;
}

export async function initDb(): Promise<void> {
  if (dbInitialized) return;
  let db = getDb();

  // Helper to run schema creation
  const runMigrations = async (client: Client) => {
    try {
      await client.execute('PRAGMA foreign_keys = ON;');
    } catch {
      // Ignored if not supported
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  };

  try {
    await runMigrations(db);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('401') || errMsg.includes('SERVER_ERROR') || errMsg.includes('AUTH')) {
      console.warn(
        '⚠️ Notice: Turso returned 401 Unauthorized. Using local persistent SQLite (file:noviq.db) as fallback. To use Turso, generate a database token using "turso db tokens create <db-name>".'
      );
      dbClient = createClient({ url: 'file:noviq.db' });
      db = dbClient;
      await runMigrations(db);
    } else {
      throw err;
    }
  }

  // Create Chats table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create Messages table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);

  // Create Indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
  `);

  dbInitialized = true;
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? COLLATE NOCASE LIMIT 1;',
    args: [email.trim().toLowerCase()],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    password_hash: String(row.password_hash),
    createdAt: Number(row.created_at),
  };
}

export async function getUserById(id: string): Promise<User | null> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1;',
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    createdAt: Number(row.created_at),
  };
}

export async function createUser(id: string, name: string, email: string, passwordHash: string): Promise<User> {
  await initDb();
  const db = getDb();
  const createdAt = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?);',
    args: [id, name.trim(), normalizedEmail, passwordHash, createdAt],
  });

  return {
    id,
    name: name.trim(),
    email: normalizedEmail,
    createdAt,
  };
}

// -------------------------------------------------------------
// CHAT & LIMIT METRICS OPERATIONS
// -------------------------------------------------------------

export async function getUserChatCount(userId: string): Promise<number> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM chats WHERE user_id = ?;',
    args: [userId],
  });
  return Number(result.rows[0]?.count || 0);
}

export async function getUserTotalMessageCount(userId: string): Promise<number> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT COUNT(m.id) as count
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ?;
    `,
    args: [userId],
  });
  return Number(result.rows[0]?.count || 0);
}

export async function getChatMessageCount(chatId: string): Promise<number> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?;',
    args: [chatId],
  });
  return Number(result.rows[0]?.count || 0);
}

export async function getUserChats(userId: string): Promise<ChatSession[]> {
  await initDb();
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as message_count
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.updated_at DESC;
    `,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    messages: [], // Populated on demand when chat is selected
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    messageCount: Number(row.message_count || 0),
  }));
}

export async function getChatById(chatId: string, userId: string): Promise<ChatSession | null> {
  await initDb();
  const db = getDb();
  const chatRes = await db.execute({
    sql: 'SELECT id, user_id, title, created_at, updated_at FROM chats WHERE id = ? AND user_id = ? LIMIT 1;',
    args: [chatId, userId],
  });

  if (chatRes.rows.length === 0) return null;
  const chatRow = chatRes.rows[0];

  const messagesRes = await db.execute({
    sql: 'SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC;',
    args: [chatId],
  });

  const messages: ChatMessage[] = messagesRes.rows.map((m) => ({
    id: String(m.id),
    role: m.role as 'user' | 'assistant',
    content: String(m.content),
    createdAt: Number(m.created_at),
  }));

  return {
    id: String(chatRow.id),
    title: String(chatRow.title),
    messages,
    createdAt: Number(chatRow.created_at),
    updatedAt: Number(chatRow.updated_at),
    messageCount: messages.length,
  };
}

export async function createChat(chatId: string, userId: string, title: string): Promise<ChatSession> {
  await initDb();
  const db = getDb();

  // Enforce Max 5 chats per user
  const currentChatCount = await getUserChatCount(userId);
  if (currentChatCount >= MAX_CHATS_PER_USER) {
    throw new Error('LIMIT_MAX_CHATS_REACHED');
  }

  const now = Date.now();
  await db.execute({
    sql: 'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    args: [chatId, userId, title.trim() || 'New Chat', now, now],
  });

  return {
    id: chatId,
    title: title.trim() || 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export async function updateChatTitle(chatId: string, userId: string, title: string): Promise<void> {
  await initDb();
  const db = getDb();
  const now = Date.now();

  const res = await db.execute({
    sql: 'UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?;',
    args: [title.trim(), now, chatId, userId],
  });

  if (res.rowsAffected === 0) {
    throw new Error('CHAT_NOT_FOUND_OR_FORBIDDEN');
  }
}

export async function deleteChat(chatId: string, userId: string): Promise<void> {
  await initDb();
  const db = getDb();

  // Delete messages belonging to this chat first to guarantee referential cleanup
  await db.execute({
    sql: `
      DELETE FROM messages
      WHERE chat_id = ?
        AND chat_id IN (SELECT id FROM chats WHERE id = ? AND user_id = ?);
    `,
    args: [chatId, chatId, userId],
  });

  const res = await db.execute({
    sql: 'DELETE FROM chats WHERE id = ? AND user_id = ?;',
    args: [chatId, userId],
  });

  if (res.rowsAffected === 0) {
    throw new Error('CHAT_NOT_FOUND_OR_FORBIDDEN');
  }
}

// -------------------------------------------------------------
// MESSAGE OPERATIONS & CAPACITY CHECK
// -------------------------------------------------------------

export async function addChatMessage(
  messageId: string,
  chatId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  await initDb();
  const db = getDb();

  // Verify chat ownership
  const chat = await getChatById(chatId, userId);
  if (!chat) {
    throw new Error('CHAT_NOT_FOUND_OR_FORBIDDEN');
  }

  // If user message, enforce 2000 character limit
  if (role === 'user' && content.length > MAX_USER_MESSAGE_LENGTH) {
    throw new Error('MESSAGE_LENGTH_EXCEEDED');
  }

  // Check conversation message limit (10 messages max)
  const chatMsgCount = await getChatMessageCount(chatId);
  if (chatMsgCount >= MAX_MESSAGES_PER_CHAT) {
    throw new Error('LIMIT_CHAT_MESSAGES_REACHED');
  }

  // Check account-wide total message limit (50 messages max)
  const userTotalMsgCount = await getUserTotalMessageCount(userId);
  if (userTotalMsgCount >= MAX_USER_TOTAL_MESSAGES) {
    throw new Error('LIMIT_USER_TOTAL_MESSAGES_REACHED');
  }

  const now = Date.now();

  await db.execute({
    sql: 'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);',
    args: [messageId, chatId, role, content, now],
  });

  // Update chat updated_at
  await db.execute({
    sql: 'UPDATE chats SET updated_at = ? WHERE id = ?;',
    args: [now, chatId],
  });

  return {
    id: messageId,
    role,
    content,
    createdAt: now,
  };
}

export async function deleteChatMessage(messageId: string, chatId: string): Promise<void> {
  await initDb();
  const db = getDb();
  await db.execute({
    sql: 'DELETE FROM messages WHERE id = ? AND chat_id = ?;',
    args: [messageId, chatId],
  });
}
