// WhisperService.ts - browser-compatible client for OpenAI's Whisper API
// Handles transcription of audio files, blobs, and URLs using the OpenAI Whisper API. Provides helper methods for transcribing from various sources and normalizing the response.

import OpenAIService from './OpenAIService';

export interface WhisperOptions {
  language?: string;
  response_format?: 'text' | 'srt' | 'vtt' | 'json' | 'verbose_json';
}
 
export type WhisperNormalized = {
  raw: unknown;
  text: string;
  segments: Array<{ id: number; start: number | null; end: number | null; text: string }>;
};
class WhisperService extends OpenAIService {
  /**
   * Transcribe a browser File (audio/video) using OpenAI Whisper.
   * Returns either a string (for text responses) or parsed JSON for verbose_json.
   */
  async transcribeFile(file: File, options: WhisperOptions = {}): Promise<string | Record<string, unknown> | WhisperNormalized> {
    try {
      const form = new FormData();
      // API expects field name `file`
      form.append('file', file, file.name || 'upload');
      form.append('model', 'whisper-1');
      if (options.language) form.append('language', options.language);
      if (options.response_format) form.append('response_format', options.response_format);

      const res = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          // Do not set Content-Type for multipart/form-data; the browser will set the boundary
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: form
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Whisper API error ${res.status}: ${txt}`);
      }

      // If the response is text (response_format=text) we want to return it raw
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        // If verbose_json normalize into a convenient shape
        if (options.response_format === 'verbose_json' || options.response_format === 'json') {
          return this.normalizeVerboseJson(json);
        }
        // return generic JSON shape
        return json as Record<string, unknown>;
      } else {
        // plain text like SRT/VTT or plain transcript
        const text = await res.text();
        return text;
      }
    } catch (err) {
      console.error('WhisperService.transcribeFile error:', err);
      throw err;
    }
  }

  /**
   * Transcribe a Blob by converting it to a File and delegating to transcribeFile.
   */
  async transcribeBlob(
    blob: Blob,
    filename = 'audio.webm',
    options: WhisperOptions = {}
  ): Promise<string | Record<string, unknown> | WhisperNormalized> {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    return this.transcribeFile(file, options);
  }

  /**
   * Attempt to fetch an audio URL and transcribe it.
   */
  async transcribeFromUrl(
    url: string,
    options: WhisperOptions = {}
  ): Promise<string | Record<string, unknown> | WhisperNormalized> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed fetching audio URL: ${res.status}`);
      const blob = await res.blob();
      // Try to infer filename from URL
      const pathname = (new URL(url)).pathname;
      const guessedName = pathname.split('/').pop() || 'audio';
      return this.transcribeBlob(blob, guessedName, options);
    } catch (err) {
      console.error('WhisperService.transcribeFromUrl error:', err);
      throw new Error('Unable to fetch remote URL from the browser (CORS or network error). For reliable YouTube support download audio server-side and call transcription from your server.');
    }
  }

  /**
   * Let's user know that YouTube transcription is not directly supported. YouTube's media is protected and can't be fetched directly from the browser.
   * Recommended to download the audio using another tool on the server then call the transcription from there.
   */
  transcribeYouTubePlaceholder(): never {
    throw new Error('YouTube transcription must be performed server-side. Download audio using a backend tool (yt-dlp) and then POST the audio file to /audio/transcriptions or provide a signed URL to the client.');
  }

  /**
   * Normalize the verbose JSON format returned by the Whisper API into a compact
   * object: { text, segments: [{id, start, end, text}] }
   */
  private normalizeVerboseJson(json: unknown): WhisperNormalized | { raw: unknown } {
    try {
      // Common Whisper verbose structure contains 'text' and 'segments'
      const obj = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {} as Record<string, unknown>;

      const textField = obj['text'];
      const text = typeof textField === 'string' ? textField : (typeof json === 'string' ? json : '');

      const rawSegments = Array.isArray(obj['segments']) ? (obj['segments'] as unknown[]) : [];
      const segments = rawSegments.map((s, i) => {
        const seg = (s && typeof s === 'object') ? (s as Record<string, unknown>) : {} as Record<string, unknown>;
        const id = typeof seg['id'] === 'number' ? seg['id'] as number : i;
        const start = typeof seg['start'] === 'number' ? seg['start'] as number : null;
        const end = typeof seg['end'] === 'number' ? seg['end'] as number : null;
        const t = typeof seg['text'] === 'string' ? seg['text'] as string : (typeof seg['caption'] === 'string' ? seg['caption'] as string : '');
        return { id, start, end, text: t };
      });

      return { raw: json, text: text as string, segments };
    } catch (err) {
      console.warn('WhisperService.normalizeVerboseJson: unable to normalize, returning raw', err);
      return { raw: json };
    }
  }
}

export default new WhisperService();

// All above code generated with *heavy* help of Copilot