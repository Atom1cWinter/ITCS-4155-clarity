import OpenAIService from './OpenAIService';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizOptions {
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  maxTokens?: number;
  temperature?: number;
}

class QuizService extends OpenAIService {
  // For direct text input
  async generateQuiz(content: string, options: QuizOptions = {}): Promise<QuizQuestion[]> {
    try {
      const messages = [{
        role: "system" as const,
        content: "You are a quiz generator that creates multiple choice questions with exactly 4 options each. Return only valid JSON arrays containing questions."
      }, {
        role: "user" as const,
        content: `Create ${options.numQuestions || 5} ${options.difficulty || 'medium'} multiple choice questions about the following content.
          Format as JSON array with "question", "options" (array of 4 choices), and "correctAnswer" (0-3 index) properties.
          Content: ${content}`
      }];

      const response = await this.chatCompletion(messages, {
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      });

      const questions: QuizQuestion[] = JSON.parse(response.choices[0].message.content);

      if (!Array.isArray(questions) || !this.validateQuestions(questions)) {
        throw new Error('Invalid quiz format received from API');
      }

      return questions;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  // For uploaded files
  async generateQuizFromFile(file: File, options: QuizOptions = {}): Promise<QuizQuestion[]> {
    try {
      console.log('QuizService: Starting file processing for:', file.name, file.type);
      
      const prompt = `Create ${options.numQuestions || 5} ${options.difficulty || 'medium'} multiple choice questions from this uploaded document. Format as JSON array with "question", "options" (array of 4 choices), and "correctAnswer" (0-3 index) properties.`;
      
      console.log('QuizService: Calling processUploadedFile with prompt:', prompt);
      
      const result = await this.processUploadedFile(file, prompt, {
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      });
      
      const questions: QuizQuestion[] = JSON.parse(result);
      
      if (!Array.isArray(questions) || !this.validateQuestions(questions)) {
        throw new Error('Invalid quiz format received from API');
      }

      console.log('QuizService: Generated questions:', questions.length);
      return questions;
    } catch (error) {
      console.error('QuizService: Error in generateQuizFromFile:', error);
      throw error;
    }
  }

  private validateQuestions(questions: QuizQuestion[]): boolean {
    return questions.every(q => 
      typeof q.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correctAnswer === 'number' &&
      q.correctAnswer >= 0 &&
      q.correctAnswer <= 3
    );
  }
}

export default new QuizService();