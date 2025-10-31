import { useState, useEffect } from 'react';
import DocumentService, { type Document } from '../lib/firebase/DocumentService';

interface UploadedFilesHistoryProps {
  userId: string;
  onSelectDocument: (doc: Document) => void;
  maxDisplayed?: number;
  refreshTrigger?: number;
}

export default function UploadedFilesHistory({ userId, onSelectDocument, maxDisplayed = 5, refreshTrigger = 0 }: UploadedFilesHistoryProps) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userDocs = await DocumentService.getUserDocuments(userId);
        // sort by newest first (service already sorts, but ensure)
        userDocs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setDocs(userDocs);
      } catch (err) {
        console.error('UploadedFilesHistory: failed to load documents', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId, refreshTrigger]);

  if (docs.length === 0) {
    return (
      <div className="glass-surface p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-3">Uploaded Documents</h3>
        {error ? (
          <p className="text-red-300 text-sm">Error: {error}</p>
        ) : (
          <p className="text-muted text-sm">
            {isLoading ? 'Loading your uploaded documents...' : 'No uploaded documents yet. Upload a file on the Uploads page.'}
          </p>
        )}
      </div>
    );
  }

  const displayed = isExpanded ? docs : docs.slice(0, maxDisplayed);

  return (
    <div className="glass-surface p-6 mb-6">
      <h3 className="text-lg font-semibold text-primary mb-3">Uploaded Documents</h3>
      <div className="space-y-2">
        {displayed.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelectDocument(d)}
            className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="text-primary font-medium truncate">{d.fileName}</div>
            <div className="text-xs text-muted mt-1">{(d.fileSize / 1024).toFixed(2)} KB • {new Date(d.uploadedAt).toLocaleString()}</div>
          </button>
        ))}
      </div>

      {docs.length > maxDisplayed && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
          {isExpanded ? 'Show Less' : `Show ${docs.length - maxDisplayed} More`}
        </button>
      )}
    </div>
  );
}
