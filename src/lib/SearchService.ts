import type { Summary } from './firebase/SummaryService';
import type { Document } from './firebase/DocumentService';

export interface SearchResult {
  summaries: (Summary & { id: string })[];
  documents: (Document & { id: string })[];
}

/**
 * Normalize search term for case-insensitive matching
 */
function normalizeSearchTerm(term: string): string {
  return term.toLowerCase().trim();
}

/**
 * Check if a text matches the search term (case-insensitive, partial match)
 */
function matchesSearchTerm(text: string, searchTerm: string): boolean {
  return normalizeSearchTerm(text).includes(normalizeSearchTerm(searchTerm));
}

/**
 * Search across summaries and documents
 */
export function searchItems(
  searchTerm: string,
  summaries: (Summary & { id: string })[],
  documents: (Document & { id: string })[]
): SearchResult {
  if (!searchTerm.trim()) {
    return {
      summaries,
      documents,
    };
  }

  const normalizedTerm = normalizeSearchTerm(searchTerm);

  const filteredSummaries = summaries.filter((s) =>
    matchesSearchTerm(s.fileName, normalizedTerm)
  );

  const filteredDocuments = documents.filter((d) =>
    matchesSearchTerm(d.fileName, normalizedTerm)
  );

  return {
    summaries: filteredSummaries,
    documents: filteredDocuments,
  };
}

/**
 * Highlight search term in text
 * Returns an array of strings and highlighted spans for rendering
 */
export function highlightSearchTerm(text: string, searchTerm: string): Array<{ type: 'text' | 'highlight'; value: string }> {
  if (!searchTerm.trim()) {
    return [{ type: 'text', value: text }];
  }

  const parts: Array<{ type: 'text' | 'highlight'; value: string }> = [];
  let lastIndex = 0;

  const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: text.substring(lastIndex, match.index),
      });
    }

    // Add highlighted match
    parts.push({
      type: 'highlight',
      value: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      value: text.substring(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}
