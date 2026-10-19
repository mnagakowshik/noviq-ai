import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env.local if exists
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8').replace(/\r/g, '');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

let url = process.env.TURSO_DATABASE_URL || 'file:noviq.db';
let authToken = process.env.TURSO_AUTH_TOKEN;

console.log(`Connecting to database at: ${url}...`);

let db = createClient({ url, authToken });

async function migrate() {
  try {
    try {
      await db.execute('PRAGMA foreign_keys = ON;');
    } catch {}

    console.log('Creating "users" table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
    } catch (authErr) {
      if (String(authErr).includes('401') || String(authErr).includes('SERVER_ERROR')) {
        console.warn(
          '⚠️ Notice: Turso returned 401 Unauthorized. Using local persistent SQLite (file:noviq.db).'
        );
        console.warn(
          '👉 To connect to Turso hosted cloud, generate a database token using:\n   turso db tokens create <database-name>\n'
        );
        url = 'file:noviq.db';
        db = createClient({ url });
        await db.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
          );
        `);
      } else {
        throw authErr;
      }
    }

    console.log('Creating "chats" table...');
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

    console.log('Creating "messages" table...');
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

    console.log('Creating database indexes...');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);');

    console.log(`✅ Database schema and migrations applied successfully to: ${url}!`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
