// Comprehensive automated test script for Noviq AI
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Noviq AI End-to-End Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testUser = {
    name: 'Dev Tester',
    email: `tester_${timestamp}@noviq.ai`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  let sessionCookie = '';

  // TEST 1: Unauthenticated access to /api/chats should return 401
  try {
    const res = await fetch(`${BASE_URL}/api/chats`);
    assert(res.status === 401, 'Unauthenticated access to /api/chats is rejected with 401');
  } catch (err) {
    assert(false, `Test 1 failed with network error: ${err.message}`);
  }

  // TEST 2: Register new user
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const data = await res.json();
    assert(res.status === 200 && data.user && data.user.email === testUser.email, 'New user registration succeeds');

    const cookieHeader = res.headers.get('set-cookie');
    if (cookieHeader) {
      sessionCookie = cookieHeader.split(';')[0];
    }
    assert(sessionCookie.includes('noviq_session='), 'HTTP-only session cookie is issued on registration');
  } catch (err) {
    assert(false, `Registration failed: ${err.message}`);
  }

  // TEST 3: Duplicate email registration is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    assert(res.status === 409, 'Duplicate email registration is rejected with 409 Conflict');
  } catch (err) {
    assert(false, `Duplicate email test failed: ${err.message}`);
  }

  // TEST 4: Get Profile & Limits (/api/auth/me)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.user.email === testUser.email && data.limits.chatCount === 0,
      'Authenticated profile returns user data and zero initial chats'
    );
  } catch (err) {
    assert(false, `/api/auth/me failed: ${err.message}`);
  }

  // TEST 5: Create 5 Conversations (Max limit test)
  const createdChatIds = [];
  try {
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${BASE_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ title: `Test Conversation ${i}` }),
      });
      const data = await res.json();
      if (res.status === 201 && data.chat?.id) {
        createdChatIds.push(data.chat.id);
      }
    }
    assert(createdChatIds.length === 5, 'Successfully created 5 conversations');

    // Attempting 6th conversation should be rejected with 403
    const res6 = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title: 'Over limit chat' }),
    });
    const data6 = await res6.json();
    assert(
      res6.status === 403 && data6.code === 'LIMIT_MAX_CHATS_REACHED',
      'Creating 6th conversation is blocked with 403 LIMIT_MAX_CHATS_REACHED'
    );
  } catch (err) {
    assert(false, `Conversation limit test failed: ${err.message}`);
  }

  // TEST 6: Message length limit (> 2,000 characters)
  try {
    const longMessage = 'A'.repeat(2005);
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        chatId: createdChatIds[0],
        message: longMessage,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.code === 'MESSAGE_LENGTH_EXCEEDED',
      'Messages > 2,000 characters are rejected with 400 MESSAGE_LENGTH_EXCEEDED'
    );
  } catch (err) {
    assert(false, `Message length test failed: ${err.message}`);
  }

  // TEST 7: AI Chat message send and stream completion
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        chatId: createdChatIds[0],
        message: 'Say "Noviq AI Test OK"',
      }),
    });

    assert(res.status === 200, 'AI chat route accepted message with 200 streaming response');

    const text = await res.text();
    assert(text.length > 0, `Received streamed AI response (length: ${text.length} chars)`);

    // Verify messages saved in DB
    const chatDetailsRes = await fetch(`${BASE_URL}/api/chats/${createdChatIds[0]}`, {
      headers: { Cookie: sessionCookie },
    });
    const chatDetails = await chatDetailsRes.json();
    assert(
      chatDetails.chat.messages.length >= 2,
      `Conversation saved user and assistant messages in database (count: ${chatDetails.chat.messages.length})`
    );
  } catch (err) {
    assert(false, `AI Chat test failed: ${err.message}`);
  }

  // TEST 8: Rename Conversation
  try {
    const renameRes = await fetch(`${BASE_URL}/api/chats/${createdChatIds[0]}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title: 'Renamed Conversation 1' }),
    });
    const renameData = await renameRes.json();
    assert(renameRes.status === 200 && renameData.title === 'Renamed Conversation 1', 'Rename conversation works');
  } catch (err) {
    assert(false, `Rename test failed: ${err.message}`);
  }

  // TEST 9: Delete Conversation & verify capacity restoration
  try {
    const delRes = await fetch(`${BASE_URL}/api/chats/${createdChatIds[4]}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    assert(delRes.status === 200, 'Deleted conversation 5');

    // Now we should be able to create another conversation because capacity is 4/5
    const newChatRes = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title: 'Restored Capacity Conversation' }),
    });
    assert(newChatRes.status === 201, 'Deleting conversation restored capacity allowing new chat creation');
  } catch (err) {
    assert(false, `Delete and restore capacity test failed: ${err.message}`);
  }

  // TEST 10: Logout
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    assert(logoutRes.status === 200, 'Logout succeeds and clears session');
  } catch (err) {
    assert(false, `Logout test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
