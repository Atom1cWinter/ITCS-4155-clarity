// OpenAIService.js - Browser-compatible base service
// Handles text summarization, PDF processing, and image analysis

import * as pdfjsLib from 'pdfjs-dist';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class OpenAIService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';

    // TEMPORARY DEBUG - Remove after testing
    console.log('API Key loaded:', this.apiKey ? 'Yes' : 'No');
    console.log('API Key starts with:', this.apiKey ? this.apiKey.substring(0, 7) + '...' : 'undefined');
  }

  async chatCompletion(messages: ChatMessage[], options: OpenAIOptions = {}): Promise<OpenAIResponse> {
    console.log('Making API call with:', { messages, options }); // DEBUG
    
    try {
      // Build request body without the problematic ...options spread
      const requestBody = {
        model: options.model || 'gpt-4o',
        messages: messages,
        max_tokens: options.maxTokens || 1000, // Convert maxTokens to max_tokens
        temperature: options.temperature || 0.7
        // Remove ...options to prevent maxTokens from being passed through
      };

      console.log('Request body being sent:', requestBody); // DEBUG

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response status:', response.status); // DEBUG
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText); // DEBUG
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success Response:', result); // DEBUG
      return result;
    } catch (error) {
      console.error('Detailed error in chatCompletion:', error); // DEBUG
      throw error;
    }
  }

  // Extract text from different file types
  async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type;
    
    if (fileType.startsWith('text/')) {
      // Handle .txt, .html, etc.
      return await file.text();
    } else if (fileType === 'application/pdf') {
      // Handle PDF files
      return await this.extractTextFromPDF(file);
    } else if (fileType.startsWith('image/')) {
      // For images, we'll use vision API
      return await this.processImageFile(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  // Extract text from PDF file using pdfjs
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      console.log('Starting PDF extraction for:', file.name); // DEBUG
      
      // Set the worker source - match the installed version dynamically
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF size:', arrayBuffer.byteLength, 'bytes'); // DEBUG
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF pages:', pdf.numPages); // DEBUG
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Get text from page
          const pageText = textContent.items
            .map((item: { str?: string; [key: string]: unknown }) => item.str || '')
            .join(' ');
          
          fullText += pageText + '\n';
          console.log(`Page ${pageNum}: ${pageText.length} characters`); // DEBUG
        } catch (err) {
          console.warn(`Error processing page ${pageNum}:`, err); // DEBUG
          continue;
        }
      }
      
      if (!fullText.trim()) {
        throw new Error('Could not extract any text from PDF');
      }
      
      console.log('PDF extraction complete:', fullText.length, 'characters'); // DEBUG
      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error); // DEBUG
      throw error;
    }
  }

  // Process image files using vision API
  private async processImageFile(file: File): Promise<string> {
    // Convert file to base64 for OpenAI Vision API
    const base64 = await this.fileToBase64(file);
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    const messages: ChatMessage[] = [{
      role: "user",
      content: [
        { type: "text", text: "Please extract and transcribe all text content from this image, including any handwritten notes, typed text, diagrams with labels, or other readable content." },
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    }];

    const response = await this.chatCompletion(messages, { model: 'gpt-4o' });
    return response.choices[0].message.content;
  }

  // Helper function to convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // Process uploaded file and return summary/processed content
  async processUploadedFile(file: File, prompt: string, options: OpenAIOptions = {}): Promise<string> {
    try {
      console.log('Processing file:', file.name, 'Type:', file.type); // DEBUG
      
      const extractedText = await this.extractTextFromFile(file);
      
      console.log('Text extracted, length:', extractedText.length); // DEBUG
      
      const messages: ChatMessage[] = [{
        role: "user",
        content: `${prompt}\n\nContent from file (${file.name}):\n\n${extractedText}`
      }];

      const response = await this.chatCompletion(messages, options);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error processing uploaded file:', error); // DEBUG
      throw error;
    }
  }
}

export default OpenAIService;