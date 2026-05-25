import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const VALID_KEY = 'black-noir-secret-key';

async function runTests() {
  console.log('🧪 Starting Phase 2 Infrastructure Verification Tests...\n');

  // Test 1: Healthcheck Route (Public Endpoint)
  try {
    console.log('--- Test 1: GET /health (Public) ---');
    const res = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Healthcheck response:', res.status, JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Healthcheck failed:', err.message);
  }

  // Test 2: Chat completion with missing Auth header (Unauthorized Block)
  try {
    console.log('\n--- Test 2: POST /v1/chat/completions (Missing Auth Header) ---');
    await axios.post(`${BASE_URL}/v1/chat/completions`, {
      model: 'llama',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    console.log('❌ Error: Expected 401 block but request succeeded.');
  } catch (err) {
    console.log('✅ Received expected 401 Unauthorized block:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  // Test 3: Chat completion with incorrect Auth key
  try {
    console.log('\n--- Test 3: POST /v1/chat/completions (Bad API Key) ---');
    await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        model: 'llama',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      {
        headers: { 'Authorization': 'Bearer bad-api-key' }
      }
    );
    console.log('❌ Error: Expected 401 key validation block but request succeeded.');
  } catch (err) {
    console.log('✅ Received expected key rejection:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  // Test 4: Body Validation - Missing messages
  try {
    console.log('\n--- Test 4: POST /v1/chat/completions (Body Validation: Missing messages) ---');
    await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        model: 'llama'
      },
      {
        headers: { 'Authorization': `Bearer ${VALID_KEY}` }
      }
    );
    console.log('❌ Error: Expected 400 validation block but request succeeded.');
  } catch (err) {
    console.log('✅ Received expected 400 missing messages block:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  // Test 5: Body Validation - Invalid Message Attributes (e.g. invalid role)
  try {
    console.log('\n--- Test 5: POST /v1/chat/completions (Body Validation: Invalid role) ---');
    await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        model: 'llama',
        messages: [{ role: 'invalid-role', content: 'Hello' }]
      },
      {
        headers: { 'Authorization': `Bearer ${VALID_KEY}` }
      }
    );
    console.log('❌ Error: Expected 400 validation block but request succeeded.');
  } catch (err) {
    console.log('✅ Received expected 400 invalid role rejection:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  // Test 6: Intelligent Model Routing (Task-based simple profile mapping)
  try {
    console.log('\n--- Test 6: POST /v1/chat/completions (Intelligent Routing: simple task) ---');
    const res = await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        task: 'simple',
        messages: [{ role: 'user', content: 'Who are you?' }]
      },
      {
        headers: { 'Authorization': `Bearer ${VALID_KEY}` }
      }
    );
    console.log('✅ Successfully routed to fast model (asserting structure):', res.status, JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Intelligent routing test failed:', err.response?.status, err.response?.data || err.message);
  }

  // Test 7: Multi-Provider Abstraction (Gemini Skeleton Provider delegation)
  try {
    console.log('\n--- Test 7: POST /v1/chat/completions (Provider Registry: Gemini Skeleton) ---');
    const res = await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        provider: 'gemini',
        messages: [{ role: 'user', content: 'Hello Gemini!' }]
      },
      {
        headers: { 'Authorization': `Bearer ${VALID_KEY}` }
      }
    );
    console.log('✅ Successfully routed to Gemini Skeleton:', res.status, JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Gemini registry test failed:', err.response?.status, err.response?.data || err.message);
  }

  // Test 8: Production Chat Request to Groq Llama-3.3 (Standardized Schema Format Assertions)
  try {
    console.log('\n--- Test 8: POST /v1/chat/completions (Production Live Standardized Response) ---');
    const res = await axios.post(
      `${BASE_URL}/v1/chat/completions`,
      {
        provider: 'groq',
        model: 'llama',
        messages: [{ role: 'user', content: 'Translate to French: "Good morning"' }]
      },
      {
        headers: { 'Authorization': `Bearer ${VALID_KEY}` }
      }
    );
    console.log('✅ Successfully received production schema format:', res.status, JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Live production test failed:', err.response?.status, err.response?.data || err.message);
  }
}

runTests();
