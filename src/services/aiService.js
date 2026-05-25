import groqProvider from '../providers/groq.js';
import geminiProvider from '../providers/gemini.js';
import openrouterProvider from '../providers/openrouter.js';
import promptService from './promptService.js';

class AIService {
  constructor() {
    // Standard Provider Registry
    this.providers = {
      groq: groqProvider,
      gemini: geminiProvider,
      openrouter: openrouterProvider,
    };

    // Standard Model Aliases & Task Routing Mapping
    this.modelMap = {
      'llama': 'llama-3.3-70b-versatile',
      'llama-large': 'llama-3.3-70b-versatile',
      'llama-small': 'llama-3.1-8b-instant',
    };
  }

  /**
   * Retrieves the requested provider instance from the registry.
   * @param {string} name - Name of the provider
   * @returns {Object} - Provider instance
   */
  getProvider(name) {
    const providerKey = name ? name.toLowerCase() : 'groq';
    const provider = this.providers[providerKey];
    if (!provider) {
      throw new Error(`Unsupported provider: "${name}". Supported providers are: ${Object.keys(this.providers).join(', ')}.`);
    }
    return provider;
  }

  /**
   * Intelligently routes the request to appropriate models or providers.
   * @param {Array} messages - Chat context/history
   * @param {Object} options - Provider/model parameters (e.g. model, provider, task)
   * @returns {Promise<Object>} - Standardized Production response payload
   */
  async generateResponse(messages, options = {}) {
    // Resolve prompt persona if requested
    let finalMessages = [...messages];
    if (options.persona) {
      const systemPrompt = promptService.loadPrompt(options.persona);
      if (systemPrompt) {
        finalMessages.unshift({
          role: 'system',
          content: systemPrompt,
        });
      }
    }

    // 1. Resolve Provider
    const providerName = options.provider || 'groq';
    const provider = this.getProvider(providerName);

    // 2. Resolve Model (Implementing Intelligent Task Model Routing)
    let targetModel = options.model;
    
    // If the request specifies a task profile instead of explicit model
    if (options.task === 'simple' || options.task === 'fast') {
      targetModel = 'llama-3.1-8b-instant';
    } else if (options.task === 'complex' || options.task === 'reasoning') {
      targetModel = 'llama-3.3-70b-versatile';
    } else if (!targetModel) {
      // Default fallback routing logic
      targetModel = 'llama-3.3-70b-versatile';
    } else {
      // Resolve standard alias
      targetModel = this.modelMap[targetModel.toLowerCase()] || targetModel;
    }

    // 3. Delegate execution to resolved provider
    const response = await provider.generateCompletion(finalMessages, {
      ...options,
      model: targetModel,
    });

    if (options.stream) {
      return {
        success: true,
        provider: response.provider || providerName,
        model: response.model || targetModel,
        stream: response.stream,
      };
    }

    // 4. Return complete, production-ready standardized schema
    return {
      success: response.success,
      provider: response.provider || providerName,
      model: response.model || targetModel,
      message: response.message || {
        role: 'assistant',
        content: response.content || ''
      },
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}

export default new AIService();
