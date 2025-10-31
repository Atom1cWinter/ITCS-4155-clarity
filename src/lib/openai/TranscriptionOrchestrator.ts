import WhisperService from './WhisperService';
import type { WhisperNormalized, WhisperOptions } from './WhisperService';
import type { SummaryOptions } from './TextSummaryService';
import type { FlashcardOptions } from './FlashcardService';
import type { QuizOptions } from './QuizService';
import TextSummaryService from './TextSummaryService';
import FlashcardService from './FlashcardService';
import QuizService from './QuizService';

type TranscriptionResult = string | Record<string, unknown> | WhisperNormalized;

function extractTextFromTranscription(result: TranscriptionResult): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    const textField = obj['text'];
    if (typeof textField === 'string') return textField;
    const rawField = obj['raw'];
    if (typeof rawField === 'string') return rawField;
    try {
      return JSON.stringify(obj);
    } catch {
      return '';
    }
  }
  return '';
}

class TranscriptionOrchestrator {
  /**
   * Transcribe a File/Blob and produce a text summary using TextSummaryService.
   */
  async transcribeAndSummarizeFromFile(file: File, whisperOptions: WhisperOptions = {}, summaryOptions: SummaryOptions = {}) {
    const t = await WhisperService.transcribeFile(file, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return TextSummaryService.summarizeText(text, summaryOptions);
  }

  async transcribeAndSummarizeFromUrl(url: string, whisperOptions: WhisperOptions = {}, summaryOptions: SummaryOptions = {}) {
    const t = await WhisperService.transcribeFromUrl(url, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return TextSummaryService.summarizeText(text, summaryOptions);
  }

  /**
   * Transcribe and generate flashcards from the transcription text.
   */
  async transcribeAndGenerateFlashcardsFromFile(file: File, whisperOptions: WhisperOptions = {}, flashcardOptions: FlashcardOptions = {}) {
    const t = await WhisperService.transcribeFile(file, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return FlashcardService.generateFlashcards(text, flashcardOptions);
  }

  async transcribeAndGenerateFlashcardsFromUrl(url: string, whisperOptions: WhisperOptions = {}, flashcardOptions: FlashcardOptions = {}) {
    const t = await WhisperService.transcribeFromUrl(url, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return FlashcardService.generateFlashcards(text, flashcardOptions);
  }

  /**
   * Transcribe and generate a quiz from the transcription text.
   */
  async transcribeAndGenerateQuizFromFile(file: File, whisperOptions: WhisperOptions = {}, quizOptions: QuizOptions = {}) {
    const t = await WhisperService.transcribeFile(file, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return QuizService.generateQuiz(text, quizOptions);
  }

  async transcribeAndGenerateQuizFromUrl(url: string, whisperOptions: WhisperOptions = {}, quizOptions: QuizOptions = {}) {
    const t = await WhisperService.transcribeFromUrl(url, whisperOptions);
    const text = extractTextFromTranscription(t as TranscriptionResult);
    return QuizService.generateQuiz(text, quizOptions);
  }
}

export default new TranscriptionOrchestrator();
