import { useState, useEffect } from 'react';
import SummaryService from '../lib/firebase/SummaryService';
import type { Summary } from '../lib/firebase/SummaryService';

interface SummaryHistoryProps {
  userId: string;
  onSelectSummary: (summary: Summary) => void;
  maxDisplayed?: number;
  refreshTrigger?: number;
}

export default function SummaryHistory({
  userId,
  onSelectSummary,
  maxDisplayed = 5,
  refreshTrigger = 0,
}: SummaryHistoryProps) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load summaries on mount and when refresh is triggered
  useEffect(() => {
    const loadSummaries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userSummaries = await SummaryService.getUserSummaries(userId);
        console.log('SummaryHistory: Loaded', userSummaries.length, 'summaries');
        // Sort by newest first
        const sorted = userSummaries.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSummaries(sorted);
      } catch (err) {
        console.error('SummaryHistory: Error loading summaries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load summaries');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummaries();
  }, [userId, refreshTrigger]);

  if (summaries.length === 0) {
    return (
      <div className="glass-surface p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-3">Saved Summaries</h3>
        {error ? (
          <p className="text-red-300 text-sm">Error: {error}</p>
        ) : (
          <p className="text-muted text-sm">
            {isLoading ? 'Loading your saved summaries...' : 'No saved summaries yet. Generate a summary to save it here.'}
          </p>
        )}
      </div>
    );
  }

  const displayedSummaries = isExpanded ? summaries : summaries.slice(0, maxDisplayed);
  const hasMore = summaries.length > maxDisplayed;

  return (
    <div className="glass-surface p-6 mb-6">
      <h3 className="text-lg font-semibold text-primary mb-3">Saved Summaries</h3>
      
      <div className="space-y-2">
        {displayedSummaries.map((summary) => (
          <button
            key={summary.id}
            onClick={() => {
              onSelectSummary(summary);
              setIsExpanded(false);
            }}
            className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="text-primary font-medium truncate">
              {summary.fileName}
            </div>
            <div className="text-xs text-muted mt-1">
              {new Date(summary.createdAt).toLocaleDateString()} {new Date(summary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? 'Show Less' : `Show ${summaries.length - maxDisplayed} More`}
        </button>
      )}
    </div>
  );
}
