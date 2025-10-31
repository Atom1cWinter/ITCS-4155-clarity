// Service for summarizing text from various input formats and images

import OpenAIService from './OpenAIService';

export interface SummaryOptions {
  maxTokens?: number;
  temperature?: number;
}

class TextSummaryService extends OpenAIService {
  // For direct text input (keep for backward compatibility)
  async summarizeText(text: string, options: SummaryOptions = {}): Promise<string> {
    try {
      const messages = [{
        role: "system" as const,
        content: "You are a helpful assistant that creates clear, concise text summaries. Provide a comprehensive summary that captures the main points and key details."
      }, {
        role: "user" as const,
        content: `Please provide a text summary of the following content:\n\n${text}`
      }];

      const response = await this.chatCompletion(messages, {
        maxTokens: options.maxTokens || 500,
        temperature: 0.3,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  // For uploaded files - this is what you'll primarily use
  async summarizeFromFile(file: File, options: SummaryOptions = {}): Promise<string> {
    try {
      console.log('TextSummaryService: Starting file processing for:', file.name, file.type); // DEBUG
      
      const prompt = "Please provide a comprehensive text summary of the content from this uploaded document. Capture the main points, key details, and important information in a clear and concise manner.";
      
      console.log('TextSummaryService: Calling processUploadedFile with prompt:', prompt); // DEBUG
      
      const result = await this.processUploadedFile(file, prompt, {
        maxTokens: options.maxTokens || 500,
        temperature: 0.3,
        ...options
      });
      
      console.log('TextSummaryService: Got result from processUploadedFile:', result?.substring(0, 100) + '...'); // DEBUG
      
      return result;
    } catch (error) {
      console.error('TextSummaryService: Error in summarizeFromFile:', error); // DEBUG
      throw error;
    }
  }
}

export default new TextSummaryService();