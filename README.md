# 🧠 black-noir

> The high-performance, developer-grade **Unified AI Backend API Server** powering advanced, multi-provider completions, Server-Sent Events (SSE) streaming, auth verification, and dynamic persona routing.

---

## 📖 What is black-noir?

**black-noir** acts as the secure, unified backend layer for your developer workflows and AI coding tools (such as the `soldier-boy` CLI). Instead of coding direct adapter layers for each provider (Groq, Gemini, OpenRouter) and configuring API keys on every local client, **black-noir** consolidates routing, logs HTTP traffic dynamically, secures your routes behind token authentication, and returns clean, unified payloads.

---

## 🛠️ Key Backend Capabilities

### ⚡ Real-Time SSE Streaming Adapter
Fully supports standard OpenAI-compliant Server-Sent Events (SSE) when `{ "stream": true }` is sent. Reads model stream chunks and pipes them instantly to connected clients with sub-millisecond connection handling.

### 🛡️ Production-Grade Security & Validation
- **Auth Guard**: Rejects calls with invalid or missing `Bearer <API_KEY>` credentials to keep your cloud endpoints completely secure.
- **Request Logger**: Automatically tracks incoming API paths and computes exact completion response durations in milliseconds.
- **Error Interceptor**: Graces exceptions like rate limits or provider downtime with descriptive, standard JSON responses without crashing the backend process.
- **Input Validator**: Ensures structured format compliance for messages, roles (`user`, `assistant`, `system`), and body payloads.

### 🧠 Intelligent Task-Based Model Routing
Automatically routes simple chat interactions to high-speed models (`llama-3.1-8b-instant`) and maps advanced codebase engineering instructions to heavier reasoning models (`llama-3.3-70b-versatile`).

### 🎭 Dynamic Persona Injections
Pre-configures prompt files (`prompts/coder.txt`, `prompts/planner.txt`, `prompts/reviewer.txt`) that are loaded dynamically and loaded as system guidelines before sending prompts to the providers.

---

## 🚀 Installation & Local Launch

### 1. Prerequisites
Verify that you have **Node.js** installed:
```bash
node -v
npm -v
```

### 2. Clone and Setup
```bash
git clone https://github.com/afngh/black-noir.git
cd black-noir
npm install
```

### 3. Configure Env Variables
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development

# Secure API Authorization Token used to guard your public API backend
API_KEY=black-noir-secret-key

# Your Groq API Cloud key (Get one for free at console.groq.com)
GROQ_API_KEY=your_groq_api_key_here

# (Optional) Google Gemini Integration Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start the Server
Launch your API backend in hot-reload development mode:
```bash
npm run dev
```
You will see the startup banner:
```text
=========================================
  🚀 Server is running on port 3000
  👉 Health check: http://localhost:3000/health
  Mode: development
=========================================
```

---

## 🧪 Integration Testing
Run the backend test script to verify endpoint authorizations, input validators, routing, and provider abstraction:
```bash
node test_api.js
```

---

## 📂 Codebase Directory Layout

```text
black-noir/
 ├── prompts/                   # Specialized persona worksheets (coder, planner, reviewer)
 ├── src/
 │    ├── controllers/          # Chat completions request and stream handlers
 │    ├── middleware/           # Auth validation, request logs, and global error handlers
 │    ├── providers/            # Multi-provider integrations (Groq, Gemini, OpenRouter)
 │    ├── routes/               # API endpoint routing registration
 │    ├── services/             # AIService, dynamic prompt loaders & tool registries
 │    └── server.js             # Core Express server entrypoint
 └── test_api.js                # Integration validation suite
```

---

## 📜 License
Distributed under the **MIT License**.
