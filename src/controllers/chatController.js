import aiService from '../services/aiService.js';

class ChatController {
  async createChatCompletion(req, res, next) {
    const { model, messages, temperature, max_tokens, provider, task, stream, persona } = req.body;

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
        persona, // forward persona so agent system prompts load correctly
      });

      if (stream) {
        const providerStream = response.stream;

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx/Railway buffering
        res.status(200);

        // pipe() is the correct way to forward a raw Node.js IncomingMessage
        // (axios stream response) to an Express writable response in Express 5
        providerStream.pipe(res);

        providerStream.on('error', (err) => {
          console.error('[Streaming Error]', err.message);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: { message: err.message, status: 500 } });
          } else {
            res.end();
          }
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
