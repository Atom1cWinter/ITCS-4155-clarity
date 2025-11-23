import WhisperService, { type WhisperOptions, type WhisperNormalized } from './WhisperService';

/**
 * Represents a single segment of transcribed audio with timing information
 */
export interface TranscriptSegment {
  id: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

/**
 * Complete audio transcription with full text and timestamped segments
 */
export interface AudioTranscription {
  fullTranscript: string;
  segments: TranscriptSegment[];
  duration: number | null;
  language?: string;
  raw: unknown;
}

/**
 * Format time in seconds to HH:MM:SS format
 */
function formatTime(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parse a VTT or SRT timestamp to seconds
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    // HH:MM:SS format
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Parse VTT format transcript to segments
 */
function parseVTT(vttText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = vttText.split('\n').filter(line => line.trim());
  
  let currentId = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for timestamp line (contains --> )
    if (line.includes('-->')) {
      const timeParts = line.split('-->').map(part => part.trim().split(' ')[0]);
      if (timeParts.length === 2) {
        const startTime = parseTimestamp(timeParts[0]);
        const endTime = parseTimestamp(timeParts[1]);
        
        // Collect text lines until next timestamp
        const textLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('-->')) {
            break;
          }
          if (lines[j].trim() && !lines[j].startsWith('WEBVTT')) {
            textLines.push(lines[j].trim());
          }
        }
        
        if (textLines.length > 0) {
          segments.push({
            id: currentId++,
            startTime,
            endTime,
            text: textLines.join(' '),
          });
        }
      }
    }
  }
  
  return segments;
}

/**
 * Parse SRT format transcript to segments
 */
function parseSRT(srtText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const entries = srtText.split(/\n\s*\n/);
  
  entries.forEach((entry) => {
    const lines = entry.trim().split('\n');
    if (lines.length >= 2) {
      const id = parseInt(lines[0], 10) || 0;
      const timeline = lines[1];
      
      if (timeline.includes('-->')) {
        const [start, end] = timeline.split('-->').map(part => part.trim());
        const startTime = parseTimestamp(start);
        const endTime = parseTimestamp(end);
        const text = lines.slice(2).join(' ').trim();
        
        if (text) {
          segments.push({
            id,
            startTime,
            endTime,
            text,
          });
        }
      }
    }
  });
  
  return segments;
}

class AudioTranscriptionService {
  /**
   * Transcribe audio file and return structured transcription with segments and timestamps
   */
  async transcribeFileWithSegments(
    file: File,
    options: WhisperOptions = {}
  ): Promise<AudioTranscription> {
    try {
      // Use verbose_json format to get segments with timestamps
      const result = await WhisperService.transcribeFile(file, {
        ...options,
        response_format: 'verbose_json',
      });

      // Handle normalized verbose JSON
      if (result && typeof result === 'object' && 'text' in result && 'segments' in result) {
        const normalized = result as WhisperNormalized;
        const segments = (normalized.segments || []).map((seg, idx) => ({
          id: seg.id ?? idx,
          startTime: seg.start ?? 0,
          endTime: seg.end ?? 0,
          text: seg.text ?? '',
        }));

        return {
          fullTranscript: normalized.text || '',
          segments,
          duration: segments.length > 0 ? segments[segments.length - 1].endTime : null,
          language: options.language,
          raw: normalized.raw,
        };
      }

      // Fallback: if we get VTT or SRT format
      if (typeof result === 'string') {
        let segments: TranscriptSegment[] = [];
        
        if (result.includes('WEBVTT')) {
          segments = parseVTT(result);
        } else if (/^\d+\s*\n\d{2}:\d{2}/.test(result)) {
          segments = parseSRT(result);
        }

        const fullTranscript = segments.map(seg => seg.text).join(' ');
        return {
          fullTranscript,
          segments,
          duration: segments.length > 0 ? segments[segments.length - 1].endTime : null,
          language: options.language,
          raw: result,
        };
      }

      throw new Error('Unexpected transcription response format');
    } catch (err) {
      console.error('AudioTranscriptionService.transcribeFileWithSegments error:', err);
      throw err;
    }
  }

  /**
   * Transcribe from URL and return structured transcription with segments and timestamps
   */
  async transcribeUrlWithSegments(
    url: string,
    options: WhisperOptions = {}
  ): Promise<AudioTranscription> {
    try {
      const result = await WhisperService.transcribeFromUrl(url, {
        ...options,
        response_format: 'verbose_json',
      });

      // Handle normalized verbose JSON
      if (result && typeof result === 'object' && 'text' in result && 'segments' in result) {
        const normalized = result as WhisperNormalized;
        const segments = (normalized.segments || []).map((seg, idx) => ({
          id: seg.id ?? idx,
          startTime: seg.start ?? 0,
          endTime: seg.end ?? 0,
          text: seg.text ?? '',
        }));

        return {
          fullTranscript: normalized.text || '',
          segments,
          duration: segments.length > 0 ? segments[segments.length - 1].endTime : null,
          language: options.language,
          raw: normalized.raw,
        };
      }

      // Fallback for string responses
      if (typeof result === 'string') {
        let segments: TranscriptSegment[] = [];
        
        if (result.includes('WEBVTT')) {
          segments = parseVTT(result);
        } else if (/^\d+\s*\n\d{2}:\d{2}/.test(result)) {
          segments = parseSRT(result);
        }

        const fullTranscript = segments.map(seg => seg.text).join(' ');
        return {
          fullTranscript,
          segments,
          duration: segments.length > 0 ? segments[segments.length - 1].endTime : null,
          language: options.language,
          raw: result,
        };
      }

      throw new Error('Unexpected transcription response format');
    } catch (err) {
      console.error('AudioTranscriptionService.transcribeUrlWithSegments error:', err);
      throw err;
    }
  }

  /**
   * Format a time value to HH:MM:SS or MM:SS
   */
  formatTime(seconds: number): string {
    return formatTime(seconds);
  }

  /**
   * Find the segment that contains or is closest to the given time
   */
  findSegmentByTime(segments: TranscriptSegment[], timeSeconds: number): TranscriptSegment | null {
    return segments.find(seg => timeSeconds >= seg.startTime && timeSeconds <= seg.endTime) || null;
  }
}

export default new AudioTranscriptionService();
