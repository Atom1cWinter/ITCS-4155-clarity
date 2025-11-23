import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { AudioSummaryWithQuotes, QuotedSegment } from '../lib/openai/AudioSummaryWithQuotesService';

interface AudioSummaryDisplayProps {
  summary: AudioSummaryWithQuotes;
  isLoading?: boolean;
}

export default function AudioSummaryDisplay({ summary, isLoading }: AudioSummaryDisplayProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="glass-surface p-8 rounded-2xl">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-4 animate-spin">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500/50 border-t-blue-500"></div>
            </div>
            <p className="text-muted">Generating summary with quotes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Sections */}
      <div className="glass-surface rounded-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <h3 className="text-2xl font-semibold text-primary">Summary with Transcript Quotes</h3>

          {/* Sections */}
          {summary.sections.map((section, idx) => (
            <div
              key={idx}
              className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => toggleSection(idx)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="text-left">
                  {section.title && (
                    <h4 className="font-semibold text-primary text-lg">{section.title}</h4>
                  )}
                  {!section.title && <h4 className="font-semibold text-primary">Section {idx + 1}</h4>}
                </div>
                <svg
                  className={`w-5 h-5 text-muted transition-transform ${expandedSections.has(idx) ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {expandedSections.has(idx) && (
                <div className="px-4 pb-4 border-t border-white/10 space-y-4">
                  {/* Main content */}
                  <div className="prose prose-invert max-w-none text-muted prose-headings:text-primary prose-strong:text-primary">
                    <ReactMarkdown
                      components={{
                        h1: (props) => <h1 className="text-2xl font-bold mb-3 mt-4 text-primary" {...props} />,
                        h2: (props) => <h2 className="text-xl font-bold mb-2 mt-3 text-primary" {...props} />,
                        h3: (props) => <h3 className="text-lg font-bold mb-2 mt-2 text-primary" {...props} />,
                        p: (props) => <p className="mb-3 text-muted leading-relaxed" {...props} />,
                        strong: (props) => <strong className="font-bold text-primary" {...props} />,
                        em: (props) => <em className="italic text-muted/80" {...props} />,
                        ul: (props) => <ul className="list-disc list-inside mb-3 text-muted space-y-1" {...props} />,
                        ol: (props) => <ol className="list-decimal list-inside mb-3 text-muted space-y-1" {...props} />,
                        li: (props) => <li className="mb-1" {...props} />,
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>

                  {/* Quotes from transcript */}
                  {section.quotes && section.quotes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      <p className="text-sm font-semibold text-muted/80 uppercase tracking-wider">Transcript References</p>
                      {section.quotes.map((quote, qIdx) => (
                        <QuoteCard key={qIdx} quote={quote} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transcript Toggle */}
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        className="w-full glass-surface p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors border border-white/10"
      >
        <span className="font-semibold text-primary">
          {showTranscript ? 'Hide' : 'Show'} Full Transcript
        </span>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${showTranscript ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Full Transcript */}
      {showTranscript && (
        <div className="glass-surface p-6 rounded-2xl space-y-4">
          <h3 className="text-xl font-semibold text-primary mb-4">Complete Transcript</h3>
          <div className="space-y-2">
            {summary.fullSegments.map((segment) => (
              <div key={segment.id} className="p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-muted/60 mt-0.5 min-w-fit">
                    {formatTimeShort(segment.startTime)}
                  </span>
                  <p className="text-sm text-muted leading-relaxed">{segment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Displays a quoted segment from the transcript
 */
function QuoteCard({ quote }: { quote: QuotedSegment }) {
  return (
    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5s-7 3.75-7 5c0 1.25 0 7 7 8z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted/80 italic mb-2">"{quote.text}"</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400">{quote.formatted}</span>
            <span className="text-xs text-muted/60">({formatDuration(quote.startTime, quote.endTime)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Format time in MM:SS
 */
function formatTimeShort(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format duration between two timestamps
 */
function formatDuration(start: number, end: number): string {
  const duration = Math.floor(end - start);
  const minutes = Math.floor(duration / 60);
  const secs = duration % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
