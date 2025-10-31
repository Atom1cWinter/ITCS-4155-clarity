import { useState, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';
import TranscriptionOrchestrator from '../lib/openai/TranscriptionOrchestrator';
import ProgressBar from './ProgressBar';
// flashcards/quiz types removed — uploader auto-triggers page actions
import DocumentService from '../lib/firebase/DocumentService';
import { generateFileHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';

type Props = {
  uploadOnly?: boolean;
  onUploadComplete?: (documentId: string) => void;
  onSummaryGenerated?: (summary: string, file: File | null) => void;
};

export default function TranscriptionUploader({ uploadOnly = true, onUploadComplete, onSummaryGenerated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  // flashcards/quiz generation removed from uploader UI — generation is page-specific and auto-started
  const progressIntervalRef = useRef<number | null>(null);
  // uploading state removed; uploader auto-runs on file selection
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const lastAutoStartRef = useRef<string | null>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setError(null);
    setSummary(null);
    // clear any previous results
  };

  // Auto-start transcription when used in generate-enabled mode (NotesPage)
  useEffect(() => {
    if (!file && !url) return;

    const key = file ? `${file.name}:${file.size}:${file.lastModified}` : `url:${url}`;
    if (lastAutoStartRef.current === key) return;
    lastAutoStartRef.current = key;

    // Auto-run upload when in uploadOnly mode, otherwise auto-run transcription/summary
    (async () => {
      try {
        if (uploadOnly) {
          await handleUpload();
        } else {
          await handleGenerateSummary();
        }
      } catch {
        // errors handled in handlers
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, url, uploadOnly]);

  const handleUpload = async () => {
    setError(null);
    setUploadSuccess(null);
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

  // starting upload
    try {
      const fileHash = await generateFileHash(file);
      const existing = await DocumentService.getDocumentByFileHash(currentUser.uid, fileHash);
      if (existing) {
        setUploadSuccess(`File already uploaded: ${existing.fileName}`);
        if (onUploadComplete && existing.id) onUploadComplete(existing.id);
        return;
      }

      const docId = await DocumentService.uploadDocument({
        userId: currentUser.uid,
        fileName: file.name,
        fileHash,
        fileSize: file.size,
        fileType: file.type || 'unknown',
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });

      setUploadSuccess(`Uploaded: ${file.name}`);
      if (onUploadComplete) onUploadComplete(docId);
    } catch (err: unknown) {
      console.error('Error uploading document from TranscriptionUploader:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Upload failed');
    } finally {
      // finished upload
    }
  };

  const handleGenerateSummary = async () => {
    setError(null);
    setSummary(null);
    setLoading(true);
    // start simulated progress
    setIsTranscribing(true);
    setTranscriptionProgress(0);
    progressIntervalRef.current = window.setInterval(() => {
      setTranscriptionProgress(prev => Math.min(90, prev + Math.random() * 12));
    }, 400);
    try {
      if (file) {
        const res = await TranscriptionOrchestrator.transcribeAndSummarizeFromFile(file, { language: 'en' }, { maxTokens: 500 });
        setSummary(res as string);
        if (onSummaryGenerated) onSummaryGenerated(res as string, file);
      } else if (url) {
        const res = await TranscriptionOrchestrator.transcribeAndSummarizeFromUrl(url, { language: 'en' }, { maxTokens: 500 });
        setSummary(res as string);
        if (onSummaryGenerated) onSummaryGenerated(res as string, null as unknown as File);
      } else {
        setError('Please select a file or provide a URL');
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Transcription or summarization failed');
    } finally {
      // finish progress
      setTranscriptionProgress(100);
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // allow the 100% to show briefly
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionProgress(0);
      }, 600);
      setLoading(false);
    }
  };

  

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-white/5 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Transcription Upload</h3>

      <div className="mb-3">
        <FileUpload onFileSelect={handleFileSelect} acceptedTypes="audio/*,video/*" maxSize={200} />
      </div>

      <div className="mb-3">
        <label className="block text-sm text-white/70 mb-1">Or paste a public audio/video URL (YouTube not supported currently)</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full p-2 rounded bg-white/5" />
      </div>

      {uploadSuccess && <div className="mb-3 p-2 bg-green-600/20 rounded text-green-200">{uploadSuccess}</div>}

      {loading && <div className="text-white/60 mb-3">Processing… this can take a little while for longer audio files.</div>}

      <ProgressBar progress={transcriptionProgress} isVisible={isTranscribing} label={isTranscribing ? 'Transcribing audio...' : undefined} />

      {error && <div className="mb-3 p-2 bg-red-600/20 rounded text-red-200">{error}</div>}

      {summary && (
        <div className="mb-4 p-3 bg-white/3 rounded">
          <h4 className="font-semibold mb-2">Summary</h4>
          <div className="whitespace-pre-wrap">{summary}</div>
        </div>
      )}

      
    </div>
  );
}
