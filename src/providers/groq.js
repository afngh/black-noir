import axios from 'axios';

class GroqProvider {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    // Fallback model as requested
    this.defaultModel = 'llama-3.3-70b-versatile';
  }

  /**
   * Send a chat completion request to the Groq API.
   * @param {Array} messages - Array of message objects [{role: 'user', content: '...'}]
   * @param {Object} options - Additional API configuration options
   * @returns {Promise<Object>} - Normalized response object
   */
  async generateCompletion(messages, options = {}) {
    const apiKey = this.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_key' || apiKey === 'your_key_here') {
      throw new Error('Groq API Key is not configured or is invalid. Please set GROQ_API_KEY in your .env file.');
    }

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.max_tokens ?? 1024;

    const isStream = !!options.stream;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: isStream,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: isStream ? 'stream' : 'json',
          timeout: 15000, // 15 seconds timeout
        }
      );

      if (isStream) {
        return {
          success: true,
          provider: 'groq',
          model: model,
          stream: response.data,
        };
      }

      // Extract and normalize successful response data
      const choice = response.data.choices?.[0];
      const content = choice?.message?.content || '';
      
      return {
        success: true,
        provider: 'groq',
        model: response.data.model || model,
        message: {
          role: 'assistant',
          content: content,
        },
        content: content, // maintained for absolute backwards compatibility
        usage: response.data.usage || {},
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        const timeoutErr = new Error('Request to Groq API timed out after 15s.');
        timeoutErr.status = 504;
        throw timeoutErr;
      }

      if (error.response) {
        const status = error.response.status;
        const apiError = error.response.data?.error?.message || 'Groq API error';
        
        const detailedError = new Error(`Groq API Error: ${apiError}`);
        detailedError.status = status;
        throw detailedError;
      }

      throw error;
    }
  }
}

export default new GroqProvider();
