# Noviq AI — Modern AI Chatbot with Turso Database & Authentication

> **"Think. Ask. Discover."**

Noviq AI is a full-stack AI chatbot web application inspired by ChatGPT, powered by Google Gemini and backed by **Turso hosted SQLite** with secure HTTP-only cookie authentication and server-enforced conversation limits.

---

## 🌟 Key Features

1. **Authentication & Session Management**:
   - Clean registration (`/register`) and login (`/login`) interface matching the Noviq AI Midnight palette.
   - Passwords securely hashed using **bcryptjs** (salt rounds: 10).
   - Tamper-proof session tokens signed with **jose** stored in secure, **HTTP-only SameSite cookies**.
   - Server-side route protection via Next.js `middleware.ts`.
   - Single-click logout.

2. **Turso Hosted SQLite Database**:
   - Powered by `@libsql/client`.
   - Parameterized queries with zero string concatenation.
   - Clean relational schema (`users`, `chats`, `messages`) with foreign keys and cascade deletions.
   - Fast B-Tree indexing on `user_id`, `chat_id`, and timestamps.
   - Local persistent SQLite fallback (`file:noviq.db`) if cloud credentials are being configured.

3. **Server-Enforced Message & Chat Limits**:
   - **Maximum 5 conversations per user**: Prevents chat bloat; user must delete an older conversation to create another.
   - **Maximum 10 messages per conversation**: Counting both user prompts and AI responses (`X/10 msgs` badge in the UI).
   - **Maximum 50 stored messages per user**: Account-wide capacity check across all conversations.
   - **Maximum 2,000 characters per user message**: Interactive live character counter with validation.
   - **Capacity restoration on delete**: Deleting a conversation removes its messages and instantly restores available quota.
   - **Failure-safe rollback**: If an AI request fails mid-stream, the user message is rolled back to avoid wasting message quota.

4. **Gemini Streaming Integration**:
   - Server-side streaming endpoint in `app/api/chat/route.ts`.
   - Streaming text with word-by-word progressive rendering and pulsing cursor.
   - Stop generation button and auto-scroll handling.
   - Full GitHub-Flavored Markdown support with syntax-styled code blocks and copy buttons.

---

## 📋 Environment Configuration

Create or update `.env.local` in your root directory:

```env
# 1. Turso Database (Host & Token)
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your_turso_database_token

# 2. Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# 3. Authentication Secret (Minimum 32 characters)
AUTH_SECRET=your_long_random_auth_secret_minimum_32_characters
```

*(Refer to `.env.example` as a template).*

---

## 🛠️ Turso Database Setup Guide

### 1. Create a Turso Account
1. Install the Turso CLI:
   - **Windows (PowerShell)**: `irm https://get.tur.so/install.ps1 | iex`
   - **macOS / Linux**: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Run `turso auth signup` or `turso auth login`.

### 2. Create a Database
Run:
```bash
turso db create noviq-ai
```

### 3. Obtain Database URL & Auth Token
- Get database URL:
  ```bash
  turso db show noviq-ai --url
  ```
- Generate an authentication token for the database:
  ```bash
  turso db tokens create noviq-ai
  ```
- Copy the URL into `TURSO_DATABASE_URL` and the token into `TURSO_AUTH_TOKEN` in `.env.local`.

---

## ⚙️ Running Database Migrations

Initialize the schema and indexes on Turso:
```bash
npm run db:init
```

Output:
```text
Connecting to database at: libsql://noviq-ai.turso.io...
Creating "users" table...
Creating "chats" table...
Creating "messages" table...
Creating database indexes...
✅ Database schema and migrations applied successfully!
```

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Navigate to: `http://localhost:3000`

---

## 🧪 Testing Acceptance Criteria

An automated test suite is provided in `scripts/test-e2e.mjs`.

Run all tests:
```bash
node scripts/test-e2e.mjs
```

### Verification Checklist:
- [x] **Registration**: Visit `/register`, submit a new account.
- [x] **Duplicate Rejection**: Submitting an existing email shows an error.
- [x] **Password Security**: Passwords hashed with bcrypt before storing.
- [x] **Login & Logout**: Login sets `noviq_session` cookie; logout clears it and redirects to `/login`.
- [x] **Protected Access**: Unauthenticated access to `/` or `/api/chats` redirects to `/login` or returns 401.
- [x] **5 Conversations Limit**: User can create up to 5 chats; the 6th is rejected with `LIMIT_MAX_CHATS_REACHED`.
- [x] **10 Messages Limit**: Each chat tracks message count; once at 10, the composer is disabled with a call to action.
- [x] **50 Stored Messages Limit**: Account total is enforced across all conversations.
- [x] **2,000 Characters Limit**: Real-time counter and server rejection on messages > 2,000 characters.
- [x] **Capacity Restoration**: Deleting an old chat deletes its messages and restores room to create new chats.

---

## 🌐 Deployment Guide (Vercel)

1. Push your code to a GitHub repository (ensure `.env.local` is ignored).
2. Import the project into [Vercel](https://vercel.com/).
3. Add the environment variables under **Settings > Environment Variables**:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `GEMINI_API_KEY`
   - `AUTH_SECRET`
4. Deploy! Next.js will automatically build the production bundle and deploy Edge middleware and serverless routes.

---

## 📁 Project Architecture

```text
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # Login endpoint with credential verification
│   │   │   ├── logout/route.ts      # Logout endpoint clearing session cookie
│   │   │   ├── me/route.ts          # Profile and limit quota endpoint
│   │   │   └── register/route.ts    # Registration and password hashing
│   │   ├── chat/route.ts            # Gemini stream with Turso persistence & limits
│   │   ├── chats/
│   │   │   ├── route.ts             # List and create user chats (max 5)
│   │   │   └── [chatId]/route.ts    # Single chat GET, PATCH (rename), DELETE
│   │   └── health/route.ts          # Server and model health probe
│   ├── login/page.tsx               # Noviq AI login page
│   ├── register/page.tsx            # Noviq AI registration page
│   ├── globals.css                  # Global styles and Midnight theme
│   ├── layout.tsx                   # Root layout, Inter font, metadata
│   ├── not-found.tsx                # Custom 404 page
│   └── page.tsx                     # Main chat interface orchestrating Turso state
├── components/
│   ├── chat-message.tsx             # Markdown, code syntax blocks, copy actions
│   ├── chat-sidebar.tsx             # Collapsible sidebar with user info & logout
│   ├── chat-window.tsx              # Chat stream reader, limits badge & banner
│   ├── message-input.tsx            # Textarea with 2,000 char counter & disabled CTA
│   ├── noviq-logo.tsx               # Text-and-sparkle logo
│   ├── settings-dialog.tsx          # Settings with quota metrics & database status
│   ├── theme-toggle.tsx             # Dark / Light theme switcher
│   └── welcome-screen.tsx           # Starter prompt cards
├── lib/
│   ├── auth.ts                      # Bcrypt hashing and jose JWT session tokens
│   ├── chat-storage.ts              # Theme preference storage
│   ├── db.ts                        # Turso SQLite client, queries, and limits
│   ├── gemini.ts                    # Google GenAI client and rate limiter
│   └── utils.ts                     # Formatting, ID generator, and utilities
├── middleware.ts                    # Session authentication middleware
├── scripts/
│   ├── init-db.mjs                  # Database schema migration script
│   └── test-e2e.mjs                 # Automated end-to-end test runner
├── .env.example
├── .env.local
├── package.json
└── tsconfig.json
```
