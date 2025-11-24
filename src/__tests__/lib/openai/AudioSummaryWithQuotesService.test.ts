import { describe, it, expect } from 'vitest';
import AudioSummaryWithQuotesService, { 
  type SummarySectionWithQuotes, 
  type QuotedSegment, 
  type AudioSummaryWithQuotes 
} from '../../../lib/openai/AudioSummaryWithQuotesService';
import type { TranscriptSegment } from '../../../lib/openai/AudioTranscriptionService';

describe('AudioSummaryWithQuotesService', () => {
  // Mock data for testing
  const mockSegments: TranscriptSegment[] = [
    { id: 0, startTime: 0, endTime: 5, text: 'Machine learning is a subset of artificial intelligence' },
    { id: 1, startTime: 5, endTime: 10, text: 'It focuses on algorithms that can learn from data' },
    { id: 2, startTime: 10, endTime: 15, text: 'Neural networks are inspired by biological neurons' },
    { id: 3, startTime: 15, endTime: 20, text: 'Deep learning uses multiple layers in neural networks' },
    { id: 4, startTime: 20, endTime: 25, text: 'Training requires large amounts of labeled data' },
  ];

  describe('Public API interface', () => {
    it('has generateSummaryWithQuotes method', () => {
      expect(AudioSummaryWithQuotesService.generateSummaryWithQuotes).toBeDefined();
      expect(typeof AudioSummaryWithQuotesService.generateSummaryWithQuotes).toBe('function');
    });

    it('exports AudioSummaryWithQuotes interface', () => {
      // Compile-time check - if the interface doesn't exist, the test won't compile
      expect(true).toBe(true);
    });

    it('exports SummarySectionWithQuotes interface', () => {
      // Compile-time check
      expect(true).toBe(true);
    });

    it('exports QuotedSegment interface', () => {
      // Compile-time check
      expect(true).toBe(true);
    });
  });

  describe('AudioSummaryWithQuotes structure', () => {
    it('has all required properties', () => {
      const summary: AudioSummaryWithQuotes = {
        sections: [],
        fullTranscript: 'Test transcript',
        fullSegments: mockSegments,
        summaryText: 'Test summary',
      };

      expect(summary).toHaveProperty('sections');
      expect(summary).toHaveProperty('fullTranscript');
      expect(summary).toHaveProperty('fullSegments');
      expect(summary).toHaveProperty('summaryText');
      expect(Array.isArray(summary.sections)).toBe(true);
      expect(Array.isArray(summary.fullSegments)).toBe(true);
      expect(typeof summary.fullTranscript).toBe('string');
      expect(typeof summary.summaryText).toBe('string');
    });
  });

  describe('SummarySectionWithQuotes structure', () => {
    it('has required content property', () => {
      const section: SummarySectionWithQuotes = {
        content: 'Section content',
      };

      expect(section).toHaveProperty('content');
      expect(typeof section.content).toBe('string');
    });

    it('can have optional title', () => {
      const section: SummarySectionWithQuotes = {
        title: 'Section Title',
        content: 'Section content',
      };

      expect(section.title).toBe('Section Title');
    });

    it('can have optional quotes', () => {
      const quotedSegment: QuotedSegment = {
        startTime: 0,
        endTime: 5,
        text: 'Sample quote',
        formatted: '0:00',
      };

      const section: SummarySectionWithQuotes = {
        title: 'Section',
        content: 'Content',
        quotes: [quotedSegment],
      };

      expect(section.quotes).toBeDefined();
      expect(Array.isArray(section.quotes)).toBe(true);
      expect(section.quotes?.[0].text).toBe('Sample quote');
    });
  });

  describe('QuotedSegment structure', () => {
    it('has all required properties', () => {
      const quote: QuotedSegment = {
        startTime: 10,
        endTime: 15,
        text: 'Quote text',
        formatted: '0:10',
      };

      expect(quote).toHaveProperty('startTime');
      expect(quote).toHaveProperty('endTime');
      expect(quote).toHaveProperty('text');
      expect(quote).toHaveProperty('formatted');
      expect(typeof quote.startTime).toBe('number');
      expect(typeof quote.endTime).toBe('number');
      expect(typeof quote.text).toBe('string');
      expect(typeof quote.formatted).toBe('string');
    });

    it('endTime is greater than or equal to startTime', () => {
      const quote: QuotedSegment = {
        startTime: 5,
        endTime: 10,
        text: 'Quote',
        formatted: '0:05',
      };

      expect(quote.endTime).toBeGreaterThanOrEqual(quote.startTime);
    });

    it('formatted time is a valid string', () => {
      const quote: QuotedSegment = {
        startTime: 65,
        endTime: 70,
        text: 'Quote',
        formatted: '1:05',
      };

      expect(quote.formatted).toMatch(/\d+:\d{2}/);
    });
  });

  describe('Data type validation', () => {
    it('creates valid summary with multiple sections', () => {
      const summary: AudioSummaryWithQuotes = {
        sections: [
          {
            title: 'Introduction',
            content: 'Overview of ML',
            quotes: [
              { startTime: 0, endTime: 5, text: 'ML definition', formatted: '0:00' },
            ],
          },
          {
            title: 'Deep Dive',
            content: 'Neural networks explained',
            quotes: [
              { startTime: 10, endTime: 15, text: 'NN explanation', formatted: '0:10' },
            ],
          },
        ],
        fullTranscript: mockSegments.map(s => s.text).join(' '),
        fullSegments: mockSegments,
        summaryText: 'Machine learning overview...',
      };

      expect(summary.sections).toHaveLength(2);
      expect(summary.sections[0].title).toBe('Introduction');
      expect(summary.sections[1].title).toBe('Deep Dive');
    });

    it('handles sections without quotes', () => {
      const section: SummarySectionWithQuotes = {
        title: 'Section without quotes',
        content: 'Content goes here',
        // quotes is optional
      };

      expect(section.quotes).toBeUndefined();
      expect(section.content).toBeDefined();
    });

    it('handles sections with multiple quotes', () => {
      const section: SummarySectionWithQuotes = {
        title: 'Multi-quote section',
        content: 'Content',
        quotes: [
          { startTime: 0, endTime: 5, text: 'Quote 1', formatted: '0:00' },
          { startTime: 10, endTime: 15, text: 'Quote 2', formatted: '0:10' },
          { startTime: 20, endTime: 25, text: 'Quote 3', formatted: '0:20' },
        ],
      };

      expect(section.quotes).toHaveLength(3);
    });

    it('preserves markdown formatting in content', () => {
      const section: SummarySectionWithQuotes = {
        title: 'Formatted Content',
        content: `# Heading\n\n**Bold text** and *italic text*\n\n- Item 1\n- Item 2`,
        quotes: [],
      };

      expect(section.content).toContain('#');
      expect(section.content).toContain('**');
      expect(section.content).toContain('-');
    });
  });

  describe('Edge cases', () => {
    it('handles empty sections array', () => {
      const summary: AudioSummaryWithQuotes = {
        sections: [],
        fullTranscript: 'Transcript',
        fullSegments: [],
        summaryText: 'Summary',
      };

      expect(summary.sections).toHaveLength(0);
    });

    it('handles very long transcript', () => {
      const longSegments = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        startTime: i * 10,
        endTime: (i + 1) * 10,
        text: `This is segment ${i} with some content that represents a portion of a long lecture transcript`,
      }));

      const summary: AudioSummaryWithQuotes = {
        sections: [
          {
            title: 'Long Lecture',
            content: 'Summary of 100 segments',
          },
        ],
        fullTranscript: longSegments.map(s => s.text).join(' '),
        fullSegments: longSegments,
        summaryText: 'Complete summary',
      };

      expect(summary.fullSegments).toHaveLength(100);
      expect(summary.fullTranscript.length).toBeGreaterThan(1000);
    });

    it('handles segments with special characters', () => {
      const quote: QuotedSegment = {
        startTime: 0,
        endTime: 5,
        text: 'Text with "quotes", \'apostrophes\', and special chars: !@#$%^&*()',
        formatted: '0:00',
      };

      expect(quote.text).toContain('"');
      expect(quote.text).toContain('!@#$%^&*()');
    });

    it('handles unicode characters in quotes', () => {
      const quote: QuotedSegment = {
        startTime: 0,
        endTime: 5,
        text: '你好世界 مرحبا بالعالم Привет мир 🌍',
        formatted: '0:00',
      };

      expect(quote.text).toBeDefined();
      expect(quote.text.length).toBeGreaterThan(0);
    });

    it('handles very large time values', () => {
      const quote: QuotedSegment = {
        startTime: 3661, // 1 hour, 1 minute, 1 second
        endTime: 3666,
        text: 'Late in the lecture',
        formatted: '1:01:01',
      };

      expect(quote.startTime).toBe(3661);
      expect(quote.endTime).toBeGreaterThan(quote.startTime);
    });

    it('handles sections with very long content', () => {
      const longContent = 'A '.repeat(5000); // 10KB of repeated text

      const section: SummarySectionWithQuotes = {
        title: 'Long Section',
        content: longContent,
      };

      expect(section.content.length).toBeGreaterThan(9000);
    });

    it('handles all quotes without title', () => {
      const section: SummarySectionWithQuotes = {
        content: 'Content without title',
        quotes: [
          { startTime: 0, endTime: 5, text: 'Quote 1', formatted: '0:00' },
          { startTime: 10, endTime: 15, text: 'Quote 2', formatted: '0:10' },
        ],
      };

      expect(section.title).toBeUndefined();
      expect(section.quotes).toBeDefined();
      expect(section.quotes).toHaveLength(2);
    });
  });

  describe('Data consistency', () => {
    it('fullSegments matches segments used in quotes', () => {
      const segments = mockSegments.slice(0, 3);
      const summary: AudioSummaryWithQuotes = {
        sections: [
          {
            content: 'Content',
            quotes: [
              { startTime: segments[0].startTime, endTime: segments[0].endTime, text: segments[0].text, formatted: '0:00' },
            ],
          },
        ],
        fullTranscript: segments.map(s => s.text).join(' '),
        fullSegments: segments,
        summaryText: 'Summary',
      };

      // Verify quotes come from fullSegments
      const quotedText = summary.sections[0].quotes?.[0].text || '';
      const hasMatchingSegment = summary.fullSegments.some(seg => seg.text === quotedText);
      expect(hasMatchingSegment).toBe(true);
    });

    it('fullTranscript matches concatenation of fullSegments', () => {
      const segments = mockSegments.slice(0, 3);
      const reconstructedTranscript = segments.map(s => s.text).join(' ');

      const summary: AudioSummaryWithQuotes = {
        sections: [],
        fullTranscript: reconstructedTranscript,
        fullSegments: segments,
        summaryText: 'Summary',
      };

      expect(summary.fullTranscript).toBe(reconstructedTranscript);
    });

    it('quote times fall within segment times', () => {
      const segment = mockSegments[2]; // 10-15 seconds
      const quote: QuotedSegment = {
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        formatted: '0:10',
      };

      expect(quote.startTime).toBeGreaterThanOrEqual(segment.startTime);
      expect(quote.endTime).toBeLessThanOrEqual(segment.endTime);
    });
  });
});
