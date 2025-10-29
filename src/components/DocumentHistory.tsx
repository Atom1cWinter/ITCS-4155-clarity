import { useState, useEffect } from 'react';
import DocumentService from '../lib/firebase/DocumentService';
import type { Document } from '../lib/firebase/DocumentService';

interface DocumentHistoryProps {
  userId: string;
  onSelectDocument?: (doc: Document) => void;
  onDeleteDocument?: (docId: string) => void;
  maxDisplayed?: number;
  refreshTrigger?: number;
}

export default function DocumentHistory({
  userId,
  onSelectDocument,
  onDeleteDocument,
  maxDisplayed = 5,
  refreshTrigger = 0,
}: DocumentHistoryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents on mount and when refresh is triggered
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userDocuments = await DocumentService.getUserDocuments(userId);
        console.log('DocumentHistory: Loaded', userDocuments.length, 'documents');
        setDocuments(userDocuments);
      } catch (err) {
        console.error('DocumentHistory: Error loading documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [userId, refreshTrigger]);

  if (documents.length === 0) {
    return (
      <div className="glass-surface p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-3">Your Documents</h3>
        {error ? (
          <p className="text-red-300 text-sm">Error: {error}</p>
        ) : (
          <p className="text-muted text-sm">
            {isLoading ? 'Loading your documents...' : 'No documents uploaded yet. Upload a file to get started!'}
          </p>
        )}
      </div>
    );
  }

  const displayedDocuments = isExpanded ? documents : documents.slice(0, maxDisplayed);
  const hasMore = documents.length > maxDisplayed;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="glass-surface p-6 mb-6">
      <h3 className="text-lg font-semibold text-primary mb-3">Your Documents</h3>
      
      <div className="space-y-2">
        {displayedDocuments.map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex-1">
              <div className="text-primary font-medium truncate">
                {document.fileName}
              </div>
              <div className="text-xs text-muted mt-1">
                {formatFileSize(document.fileSize)} • {new Date(document.uploadedAt).toLocaleDateString()} {new Date(document.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {onSelectDocument && (
              <button
                onClick={() => onSelectDocument(document)}
                className="ml-2 px-3 py-1 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition-colors"
              >
                View
              </button>
            )}
            {onDeleteDocument && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${document.fileName}"?`)) {
                    onDeleteDocument(document.id!);
                  }
                }}
                className="ml-2 px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? 'Show Less' : `Show ${documents.length - maxDisplayed} More`}
        </button>
      )}
    </div>
  );
}
