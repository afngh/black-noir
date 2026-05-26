import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptService {
  constructor() {
    // Dynamically resolve base prompts directory path
    this.promptsDir = path.resolve(__dirname, '../../prompts');
  }

  /**
   * Loads a specialized dynamic system prompt template from file.
   * @param {string} persona - Name of the persona (e.g. 'coder', 'planner', 'reviewer')
   * @returns {string} - System instruction text
   */
  loadPrompt(persona) {
    if (!persona) return '';

    const safeName = persona.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const filePath = path.join(this.promptsDir, `${safeName}.txt`);

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8').trim();
      }
    } catch (err) {
      console.warn(`[PromptService] Failed to load prompt file for "${persona}":`, err.message);
    }

    // Standard Fallback personas
    if (safeName === 'coder') {
      return 'You are an elite coding agent. Answer directly and precisely with clean code examples.';
    }
    if (safeName === 'planner') {
      return 'You are an analytical software planner. Outline implementation steps carefully.';
    }
    if (safeName === 'reviewer') {
      return 'You are a strict code quality reviewer. Audit code for safety, speed, and safety leaks.';
    }
    if (safeName === 'stan_edgar') {
      return 'You are Stan Edgar, Vought AI\'s corporate operations manager. You are ONLY capable of creating folders, creating empty files, listing directories, and performing system setup commands. You DO NOT write complete source code.';
    }
    if (safeName === 'homelander') {
      return 'You are Homelander, the ultimate writer agent. Your sole job is to write complete, optimized, high-quality source code/data into existing files.';
    }

    return 'You are a helpful AI assistant.';
  }
}

export default new PromptService();
