import SummaryService from './SummaryService';
import FlashcardStorageService, { type FlashcardDeck } from './FlashcardStorageService';
import QuizStorageService, { type QuizRecord } from './QuizStorageService';

type ContentKind = 'summaries' | 'flashcards' | 'quizzes';

// Strongly-typed payloads for saved content
export interface SummaryPayload {
  title?: string;
  text: string;
  source?: 'upload' | 'paste' | 'existing';
  fileName?: string;
  fileHash?: string;
  fileSize?: number;
  fileType?: string;
}

export interface FlashcardPayload {
  title?: string;
  cards: Array<{ front: string; back: string }>;
  numCards?: number;
  style?: string;
}

export interface QuizPayload {
  title?: string;
  questions: Array<{ question: string; options: string[]; correctAnswer: number }>;
  numQuestions?: number;
  score?: number;
  raw?: unknown;
}

class ContentService {
  // Save content by delegating to the specialized storage services.
  // This ensures we use the same Firestore collections and data normalization
  // logic that the rest of the app expects.
  async saveContent(userId: string, kind: ContentKind, payload: SummaryPayload | FlashcardPayload | QuizPayload): Promise<string> {
    try {
      if (kind === 'summaries') {
        const p = payload as SummaryPayload;
        const id = await SummaryService.saveSummary({
          userId,
          fileName: p.fileName || p.title || `Summary - ${new Date().toLocaleString()}`,
          fileHash: p.fileHash || '',
          fileSize: p.fileSize || (p.text || '').length,
          fileType: p.fileType || 'text',
          summaryText: p.text,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return id;
      }

      if (kind === 'flashcards') {
        const p = payload as FlashcardPayload;
        const deck: Omit<FlashcardDeck, 'id'> = {
          userId,
          title: p.title || `Flashcards - ${new Date().toLocaleString()}`,
          cards: p.cards || [],
          numCards: p.numCards || (p.cards || []).length,
          style: p.style || 'short',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const id = await FlashcardStorageService.saveDeck(deck);
        return id;
      }

      if (kind === 'quizzes') {
        const p = payload as QuizPayload;
        const quiz: Omit<QuizRecord, 'id'> = {
          userId,
          title: p.title || `Quiz - ${new Date().toLocaleString()}`,
          questions: p.questions || [],
          numQuestions: p.numQuestions || (p.questions || []).length,
          // include optional score and raw payload to preserve the original generated JSON
          // Firestore will happily store extra fields beyond the interface if present
          ...(typeof p.score === 'number' ? { score: p.score } : {}),
          ...(typeof p.raw !== 'undefined' ? { raw: p.raw } : {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const id = await QuizStorageService.saveQuiz(quiz);
        return id;
      }

      throw new Error('Unsupported content type');
    } catch (err) {
      console.error('ContentService.saveContent error', err);
      throw err;
    }
  }

  // Return counts by delegating to the storage services where available.
  async getCounts(userId: string): Promise<{ summaries: number; flashcards: number; quizzes: number }> {
    const result = { summaries: 0, flashcards: 0, quizzes: 0 };
    try {
      const summaries = await SummaryService.getUserSummaries(userId);
      result.summaries = summaries.length;
    } catch (err) {
      console.error('Failed to fetch summaries count', err);
    }

    try {
      const decks = await FlashcardStorageService.getUserDecks(userId);
      result.flashcards = decks.length;
    } catch (err) {
      console.error('Failed to fetch flashcards count', err);
    }

    try {
      const quizzes = await QuizStorageService.getUserQuizzes(userId);
      result.quizzes = quizzes.length;
    } catch (err) {
      console.error('Failed to fetch quizzes count', err);
    }

    return result;
  }

  // Generic listing convenience method
  async getContent<T = Record<string, unknown>>(userId: string, kind: ContentKind): Promise<Array<T & { id: string }>> {
    if (kind === 'summaries') {
      const items = await SummaryService.getUserSummaries(userId);
      return items as unknown as Array<T & { id: string }>;
    }

    if (kind === 'flashcards') {
      const items = await FlashcardStorageService.getUserDecks(userId);
      return items as unknown as Array<T & { id: string }>;
    }

    const items = await QuizStorageService.getUserQuizzes(userId);
    return items as unknown as Array<T & { id: string }>;
  }
}

export default new ContentService();
