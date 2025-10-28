import OpenAIService from './OpenAIService';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardOptions {
  numCards?: number;
  style?: 'short' | 'detailed';
  maxTokens?: number;
  temperature?: number;
}

class FlashcardService extends OpenAIService {
  async generateFlashcards(content: string, options: FlashcardOptions = {}): Promise<Flashcard[]> {
    try {
      const messages = [{
        role: 'system' as const,
        content: 'You are a flashcard generator. Create concise flashcards with a "front" and "back" field. Return ONLY a valid JSON array.'
      }, {
        role: 'user' as const,
        content: `Create ${options.numCards || 10} flashcards from the following content. Style: ${options.style || 'short'}.
Format as a JSON array where each item has {"front": "...", "back": "..."}. Content:\n\n${content}`
      }];

      const response = await this.chatCompletion(messages, {
        maxTokens: options.maxTokens || 1200,
        temperature: options.temperature ?? 0.3
      });

      const raw = response.choices[0].message.content;
      return this.parseFlashcardsFromString(raw);
    } catch (error) {
      console.error('FlashcardService: generateFlashcards error:', error);
      throw error;
    }
  }

  async generateFlashcardsFromFile(file: File, options: FlashcardOptions = {}): Promise<Flashcard[]> {
    try {
      const prompt = `Create ${options.numCards || 10} flashcards from this uploaded document. Format as a JSON array where each item has {"front": "...", "back": "..."}.`;
      const result = await this.processUploadedFile(file, prompt, {
        maxTokens: options.maxTokens || 1200,
        temperature: options.temperature ?? 0.3
      });

      return this.parseFlashcardsFromString(result);
    } catch (error) {
      console.error('FlashcardService: generateFlashcardsFromFile error:', error);
      throw error;
    }
  }

  private parseFlashcardsFromString(raw: string): Flashcard[] {
    try {
      const trimmed = raw.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && this.validateFlashcards(parsed)) return parsed;
      } catch {
        // fallthrough to extraction
      }

      const codeFenceMatch = /```(?:json)?([\s\S]*?)```/.exec(raw);
      if (codeFenceMatch && codeFenceMatch[1]) {
        const inside = codeFenceMatch[1].trim();
        try {
          const parsed = JSON.parse(inside);
          if (Array.isArray(parsed) && this.validateFlashcards(parsed)) return parsed;
        } catch {
          // continue
        }
      }

      const firstBracket = raw.indexOf('[');
      if (firstBracket !== -1) {
        let depth = 0;
        for (let i = firstBracket; i < raw.length; i++) {
          const ch = raw[i];
          if (ch === '[') depth++;
          else if (ch === ']') depth--;

          if (depth === 0) {
            const candidate = raw.slice(firstBracket, i + 1);
            try {
              const parsed = JSON.parse(candidate);
              if (Array.isArray(parsed) && this.validateFlashcards(parsed)) return parsed;
            } catch {
              // continue
            }
            break;
          }
        }
      }

      const snippet = raw.slice(0, 500).replace(/\n/g, ' ');
      throw new Error(`Unable to parse flashcard JSON from model output. Output snippet: "${snippet}"`);
    } catch (err) {
      console.error('FlashcardService: parseFlashcardsFromString error:', err);
      throw err;
    }
  }

  private validateFlashcards(arr: unknown[]): arr is Flashcard[] {
    return arr.every(item => {
      if (typeof item !== 'object' || item === null) return false;
      const it = item as Record<string, unknown>;
      return typeof it.front === 'string' && typeof it.back === 'string';
    });
  }
}

export default new FlashcardService();
