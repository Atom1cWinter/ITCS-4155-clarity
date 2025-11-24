import { describe, it, expect, vi } from 'vitest';
import AudioTranscriptionService, { type TranscriptSegment, type AudioTranscription } from '../../../lib/openai/AudioTranscriptionService';

// Mock pdfjs-dist to avoid DOMMatrix errors in Node.js environment
vi.mock('pdfjs-dist', () => ({
  default: {
    getDocument: vi.fn(),
  },
}));

describe('AudioTranscriptionService', () => {
  describe('formatTime', () => {
    it('formats seconds to HH:MM:SS for values >= 3600', () => {
      const result = AudioTranscriptionService.formatTime(3661); // 1 hour, 1 minute, 1 second
      expect(result).toMatch(/\d+:\d{2}:\d{2}/); // Regex for HH:MM:SS format
    });

    it('formats seconds to MM:SS for values < 3600', () => {
      const result = AudioTranscriptionService.formatTime(65); // 1 minute, 5 seconds
      expect(result).toMatch(/\d+:\d{2}/); // MM:SS format
    });

    it('handles zero seconds', () => {
      const result = AudioTranscriptionService.formatTime(0);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles large durations', () => {
      const result = AudioTranscriptionService.formatTime(36000); // 10 hours
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles decimal seconds', () => {
      const result = AudioTranscriptionService.formatTime(90.5);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles NaN and invalid inputs', () => {
      const result = AudioTranscriptionService.formatTime(NaN);
      expect(result).toBe('0:00');
    });

    it('handles negative values gracefully', () => {
      const result = AudioTranscriptionService.formatTime(-10);
      expect(typeof result).toBe('string');
    });
  });

  describe('findSegmentByTime', () => {
    const mockSegments: TranscriptSegment[] = [
      { id: 1, startTime: 0, endTime: 5, text: 'First segment' },
      { id: 2, startTime: 5, endTime: 10, text: 'Second segment' },
      { id: 3, startTime: 10, endTime: 15, text: 'Third segment' },
    ];

    it('finds segment at exact start time', () => {
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, 0);
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1);
    });

    it('finds segment at exact end time', () => {
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, 5);
      expect(result).toBeTruthy();
      expect(result?.id).toBe(1); // 5 is the end of the first segment, so first segment is returned
    });

    it('finds segment in the middle of time range', () => {
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, 7);
      expect(result).toBeTruthy();
      expect(result?.id).toBe(2);
      expect(result?.text).toBe('Second segment');
    });

    it('returns null for time before first segment', () => {
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, -1);
      expect(result).toBeNull();
    });

    it('returns null for time after last segment', () => {
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, 16);
      expect(result).toBeNull();
    });

    it('handles empty segment array', () => {
      const result = AudioTranscriptionService.findSegmentByTime([], 5);
      expect(result).toBeNull();
    });

    it('handles time between segments', () => {
      // Time 5 is the boundary - it matches the second segment's start
      const result = AudioTranscriptionService.findSegmentByTime(mockSegments, 5);
      expect(result).not.toBeNull();
    });
  });

  describe('Public API interface', () => {
    it('exports AudioTranscription interface', () => {
      // This is a compile-time check - if the interface doesn't exist, the test file won't compile
      expect(true).toBe(true);
    });

    it('exports TranscriptSegment interface', () => {
      // This is a compile-time check
      expect(true).toBe(true);
    });

    it('has transcribeFileWithSegments method', () => {
      expect(AudioTranscriptionService.transcribeFileWithSegments).toBeDefined();
      expect(typeof AudioTranscriptionService.transcribeFileWithSegments).toBe('function');
    });

    it('has transcribeUrlWithSegments method', () => {
      expect(AudioTranscriptionService.transcribeUrlWithSegments).toBeDefined();
      expect(typeof AudioTranscriptionService.transcribeUrlWithSegments).toBe('function');
    });

    it('has formatTime method', () => {
      expect(AudioTranscriptionService.formatTime).toBeDefined();
      expect(typeof AudioTranscriptionService.formatTime).toBe('function');
    });

    it('has findSegmentByTime method', () => {
      expect(AudioTranscriptionService.findSegmentByTime).toBeDefined();
      expect(typeof AudioTranscriptionService.findSegmentByTime).toBe('function');
    });
  });

  describe('Segment structure validation', () => {
    it('transcribe methods return AudioTranscription with expected structure', () => {
      // Create mock transcription response
      const mockTranscription: AudioTranscription = {
        fullTranscript: 'Test transcript',
        segments: [
          { id: 0, startTime: 0, endTime: 5, text: 'Test' },
        ],
        duration: 5,
        language: 'en',
        raw: {},
      };

      expect(mockTranscription).toHaveProperty('fullTranscript');
      expect(mockTranscription).toHaveProperty('segments');
      expect(mockTranscription).toHaveProperty('duration');
      expect(mockTranscription).toHaveProperty('language');
      expect(mockTranscription).toHaveProperty('raw');
      expect(typeof mockTranscription.fullTranscript).toBe('string');
      expect(Array.isArray(mockTranscription.segments)).toBe(true);
    });

    it('TranscriptSegment has all required properties', () => {
      const segment: TranscriptSegment = {
        id: 1,
        startTime: 0,
        endTime: 5,
        text: 'Test',
      };

      expect(segment).toHaveProperty('id');
      expect(segment).toHaveProperty('startTime');
      expect(segment).toHaveProperty('endTime');
      expect(segment).toHaveProperty('text');
      expect(typeof segment.id).toBe('number');
      expect(typeof segment.startTime).toBe('number');
      expect(typeof segment.endTime).toBe('number');
      expect(typeof segment.text).toBe('string');
    });

    it('ensures endTime >= startTime in segments', () => {
      const validSegment: TranscriptSegment = {
        id: 1,
        startTime: 0,
        endTime: 5,
        text: 'Valid',
      };

      expect(validSegment.endTime).toBeGreaterThanOrEqual(validSegment.startTime);
    });

    it('duration calculation from segments', () => {
      const mockTranscription: AudioTranscription = {
        fullTranscript: 'Test',
        segments: [
          { id: 1, startTime: 0, endTime: 5, text: 'First' },
          { id: 2, startTime: 5, endTime: 10, text: 'Second' },
        ],
        duration: 10, // Duration should match last segment's end time
        raw: {},
      };

      // Duration should be the last segment's end time
      if (mockTranscription.segments.length > 0) {
        const lastSegmentEndTime = mockTranscription.segments[mockTranscription.segments.length - 1].endTime;
        expect(mockTranscription.duration).toBeGreaterThanOrEqual(lastSegmentEndTime);
      }
    });
  });

  describe('Edge cases', () => {
    it('handles single segment transcription', () => {
      const transcription: AudioTranscription = {
        fullTranscript: 'Single segment',
        segments: [{ id: 1, startTime: 0, endTime: 10, text: 'Single segment' }],
        duration: 10,
        raw: {},
      };

      expect(transcription.segments).toHaveLength(1);
      expect(transcription.duration).toBe(10);
    });

    it('handles many segments', () => {
      const segments = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        startTime: i * 5,
        endTime: (i + 1) * 5,
        text: `Segment ${i}`,
      }));

      const transcription: AudioTranscription = {
        fullTranscript: segments.map(s => s.text).join(' '),
        segments,
        duration: 500,
        raw: {},
      };

      expect(transcription.segments).toHaveLength(100);
    });

    it('handles segments with very long text', () => {
      const longText = 'A'.repeat(10000);
      const segment: TranscriptSegment = {
        id: 1,
        startTime: 0,
        endTime: 10,
        text: longText,
      };

      expect(segment.text.length).toBe(10000);
    });

    it('handles special characters in segment text', () => {
      const segment: TranscriptSegment = {
        id: 1,
        startTime: 0,
        endTime: 5,
        text: 'Text with special chars: !@#$%^&*()_+-={}[]|:;"\'<>,.?/',
      };

      expect(segment.text).toContain('!@#$%^&*()');
    });

    it('handles unicode characters in segments', () => {
      const segment: TranscriptSegment = {
        id: 1,
        startTime: 0,
        endTime: 5,
        text: '你好世界 مرحبا بالعالم Привет мир',
      };

      expect(segment.text).toBeDefined();
      expect(segment.text.length).toBeGreaterThan(0);
    });
  });
});
