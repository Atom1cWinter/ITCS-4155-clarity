import OpenAIService from './OpenAIService';

interface BulletPointOptions {
  maxTokens?: number;
  temperature?: number;
}

class BulletPointService extends OpenAIService {
  // For direct text input (keep for backward compatibility)
  async generateBulletPoints(input: string, options: BulletPointOptions = {}): Promise<string> {
    try {
      const messages = [{
        role: "system" as const,
        content: "You are a helpful assistant that creates clear, organized bullet point summaries. Use bullet points to highlight key information in a scannable format."
      }, {
        role: "user" as const,
        content: `Please create a bullet point summary of the following content:\n\n${input}`
      }];

      const response = await this.chatCompletion(messages, {
        maxTokens: options.maxTokens || 400,
        temperature: 0.2,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating bullet points:', error);
      throw error;
    }
  }

  // For uploaded files - this is what you'll primarily use
  async generateBulletPointsFromFile(file: File, options: BulletPointOptions = {}): Promise<string> {
    try {
      const prompt = "Please create a comprehensive bullet point summary of the content from this uploaded document. Organize the key information, main points, and important details into clear, scannable bullet points.";
      
      return await this.processUploadedFile(file, prompt, {
        maxTokens: options.maxTokens || 400,
        temperature: 0.2,
        ...options
      });
    } catch (error) {
      console.error('Error generating bullet points from file:', error);
      throw error;
    }
  }
}

export default new BulletPointService();