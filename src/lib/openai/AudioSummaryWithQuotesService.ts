import TextSummaryService from './TextSummaryService';
import type { SummaryOptions } from './TextSummaryService';
import type { AudioTranscription, TranscriptSegment } from './AudioTranscriptionService';

/**
 * A quoted section from the transcript
 */
export interface QuotedSegment {
  startTime: number;
  endTime: number;
  text: string;
  formatted: string; // Formatted time "MM:SS"
}

/**
 * A summary section that may contain inline quotes
 */
export interface SummarySectionWithQuotes {
  title?: string;
  content: string; // Markdown content with potential quote placeholders
  quotes?: QuotedSegment[]; // Quotes referenced in this section
}

/**
 * Complete summary with quotes integrated from the transcript
 */
export interface AudioSummaryWithQuotes {
  sections: SummarySectionWithQuotes[];
  fullTranscript: string;
  fullSegments: TranscriptSegment[];
  summaryText: string; // Original summary for reference
}

/**
 * Utility to format time in MM:SS
 */
function formatTimeShort(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extract key phrases/sentences from text that could match transcript segments
 */
function extractKeyConcepts(text: string): string[] {
  // Split by sentences and take significant ones (longer than 10 chars)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // Also extract noun phrases (simplistic approach)
  const concepts = new Set<string>();

  // Add full sentences
  sentences.forEach(s => {
    if (s.length > 15) {
      concepts.add(s);
    }
  });

  // Add important keywords (capitalized words, technical terms)
  const words = text.split(/\s+/);
  words.forEach((word, idx) => {
    if (word.length > 4 && /^[A-Z]/.test(word)) {
      concepts.add(word.replace(/[.,!?;:]/g, ''));
    }
    // Add bigrams of important words
    if (idx < words.length - 1 && words[idx].length > 4 && words[idx + 1].length > 4) {
      const bigram = `${words[idx]} ${words[idx + 1]}`.replace(/[.,!?;:]/g, '');
      if (bigram.length > 8) {
        concepts.add(bigram);
      }
    }
  });

  return Array.from(concepts).sort((a, b) => b.length - a.length).slice(0, 30);
}

/**
 * Find the best matching transcript segment for a given concept
 */
function findBestMatchingSegment(
  concept: string,
  segments: TranscriptSegment[]
): TranscriptSegment | null {
  const conceptLower = concept.toLowerCase();
  
  // Look for exact phrase match first
  for (const seg of segments) {
    if (seg.text.toLowerCase().includes(conceptLower)) {
      return seg;
    }
  }

  // Look for word overlap
  const conceptWords = conceptLower.split(/\s+/);
  let bestMatch: TranscriptSegment | null = null;
  let bestScore = 0;

  for (const seg of segments) {
    const segWords = seg.text.toLowerCase().split(/\s+/);
    const matchCount = conceptWords.filter(word => segWords.some(sw => sw.includes(word))).length;
    const score = matchCount / conceptWords.length;

    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = seg;
    }
  }

  return bestMatch;
}

class AudioSummaryWithQuotesService {
  /**
   * Generate a summary from transcript and intelligently insert quotes
   */
  async generateSummaryWithQuotes(
    transcription: AudioTranscription,
    summaryOptions: SummaryOptions = {}
  ): Promise<AudioSummaryWithQuotes> {
    try {
      // Generate initial summary
      const summaryText = await TextSummaryService.summarizeText(
        transcription.fullTranscript,
        {
          ...summaryOptions,
          maxTokens: summaryOptions.maxTokens || 1000,
        }
      );

      // Extract key concepts from summary
      const keyConcepts = extractKeyConcepts(summaryText);

      // Find matching segments for each concept
      const conceptToSegment = new Map<string, TranscriptSegment>();
      const usedSegmentIds = new Set<number>();

      for (const concept of keyConcepts) {
        const segment = findBestMatchingSegment(concept, transcription.segments);
        if (segment && !usedSegmentIds.has(segment.id)) {
          conceptToSegment.set(concept, segment);
          usedSegmentIds.add(segment.id);
        }
      }

      // Build summary sections with integrated quotes
      const sections = this.buildSummaryWithQuotes(
        summaryText,
        conceptToSegment
      );

      return {
        sections,
        fullTranscript: transcription.fullTranscript,
        fullSegments: transcription.segments,
        summaryText,
      };
    } catch (err) {
      console.error('AudioSummaryWithQuotesService.generateSummaryWithQuotes error:', err);
      throw err;
    }
  }

  /**
   * Build structured summary with quotes from transcript
   */
  private buildSummaryWithQuotes(
    summaryText: string,
    conceptToSegment: Map<string, TranscriptSegment>
  ): SummarySectionWithQuotes[] {
    const sections: SummarySectionWithQuotes[] = [];

    // Split summary by headers (markdown format)
    const lines = summaryText.split('\n');
    let currentSection: Partial<SummarySectionWithQuotes> = { quotes: [] };
    let contentLines: string[] = [];

    for (const line of lines) {
      if (line.match(/^#+\s/)) {
        // This is a header
        if (contentLines.length > 0) {
          currentSection.content = contentLines.join('\n').trim();
          if (currentSection.content) {
            sections.push(currentSection as SummarySectionWithQuotes);
          }
        }
        currentSection = {
          title: line.replace(/^#+\s/, '').trim(),
          quotes: [],
        };
        contentLines = [];
      } else {
        contentLines.push(line);
      }
    }

    // Add final section
    if (contentLines.length > 0) {
      currentSection.content = contentLines.join('\n').trim();
      if (currentSection.content) {
        sections.push(currentSection as SummarySectionWithQuotes);
      }
    }

    // Now find and insert quotes
    for (const section of sections) {
      const quotes: QuotedSegment[] = [];
      const sectionContent = section.content || '';

      // Find key concepts in this section
      const keyConcepts = extractKeyConcepts(sectionContent);

      for (const concept of keyConcepts) {
        const segment = conceptToSegment.get(concept);
        if (segment) {
          const quote: QuotedSegment = {
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            formatted: formatTimeShort(segment.startTime),
          };

          // Avoid duplicate quotes
          if (!quotes.some(q => q.text === quote.text)) {
            quotes.push(quote);
          }

          // Only add a few quotes per section
          if (quotes.length >= 2) break;
        }
      }

      section.quotes = quotes;
    }

    return sections;
  }

  /**
   * Format a quoted segment as markdown
   */
  formatQuoteMarkdown(quote: QuotedSegment): string {
    return `> **[${quote.formatted}]** "${quote.text}"`;
  }
}

export default new AudioSummaryWithQuotesService();
