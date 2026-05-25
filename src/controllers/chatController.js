import aiService from '../services/aiService.js';

class ChatController {
  async createChatCompletion(req, res, next) {
    const { model, messages, temperature, max_tokens, provider, task, stream } = req.body;

    // 1. Basic Structure Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const valError = new Error("Invalid request payload. 'messages' must be a non-empty array.");
      valError.status = 400;
      return next(valError);
    }

    // 2. Message Object Attributes Validation (role and content check)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (typeof msg !== 'object' || msg === null) {
        const valError = new Error(`Invalid message at index ${i}: Must be a JSON object.`);
        valError.status = 400;
        return next(valError);
      }

      if (typeof msg.role !== 'string' || !['user', 'assistant', 'system'].includes(msg.role)) {
        const valError = new Error(`Invalid message at index ${i}: 'role' must be one of 'user', 'assistant', or 'system'.`);
        valError.status = 400;
        return next(valError);
      }

      if (typeof msg.content !== 'string' || msg.content.trim() === '') {
        const valError = new Error(`Invalid message at index ${i}: 'content' must be a non-empty string.`);
        valError.status = 400;
        return next(valError);
      }
    }

    try {
      const response = await aiService.generateResponse(messages, {
        model,
        temperature,
        max_tokens,
        provider,
        task,
        stream,
      });

      if (stream) {
        // Set headers for Server-Sent Events (SSE)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        const providerStream = response.stream;

        providerStream.on('data', (chunk) => {
          res.write(chunk);
        });

        providerStream.on('end', () => {
          res.end();
        });

        providerStream.on('error', (err) => {
          console.error('[Streaming Error]', err);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        });

        return;
      }

      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }
}

export default new ChatController();
