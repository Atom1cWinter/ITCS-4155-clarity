import { useState, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';
import TranscriptionOrchestrator from '../lib/openai/TranscriptionOrchestrator';
import ProgressBar from './ProgressBar';
import AudioSummaryDisplay from './AudioSummaryDisplay';
import type { AudioSummaryWithQuotes } from '../lib/openai/AudioSummaryWithQuotesService';
// flashcards/quiz types removed — uploader auto-triggers page actions
import DocumentService from '../lib/firebase/DocumentService';
import { generateFileHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';

type Props = {
  uploadOnly?: boolean;
  onUploadComplete?: (documentId: string) => void;
  onSummaryGenerated?: (summary: string, file: File | null) => void;
  useQuotedSummary?: boolean; // New prop to enable summary-with-quotes feature
};

export default function TranscriptionUploader({ uploadOnly = true, onUploadComplete, onSummaryGenerated, useQuotedSummary = false }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [audioSummaryWithQuotes, setAudioSummaryWithQuotes] = useState<AudioSummaryWithQuotes | null>(null);
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
    setAudioSummaryWithQuotes(null);
    setLoading(true);
    // start simulated progress
    setIsTranscribing(true);
    setTranscriptionProgress(0);
    progressIntervalRef.current = window.setInterval(() => {
      setTranscriptionProgress(prev => Math.min(90, prev + Math.random() * 12));
    }, 400);
    try {
      if (file) {
        if (useQuotedSummary) {
          // Use new summary-with-quotes feature
          const res = await TranscriptionOrchestrator.transcribeAndSummarizeWithQuotesFromFile(
            file,
            { language: 'en' },
            { maxTokens: 500 }
          );
          setAudioSummaryWithQuotes(res);
          // Also call onSummaryGenerated with the summary text for compatibility
          if (onSummaryGenerated) onSummaryGenerated(res.summaryText, file);
        } else {
          // Use original simple summary
          const res = await TranscriptionOrchestrator.transcribeAndSummarizeFromFile(file, { language: 'en' }, { maxTokens: 500 });
          setSummary(res as string);
          if (onSummaryGenerated) onSummaryGenerated(res as string, file);
        }
      } else if (url) {
        if (useQuotedSummary) {
          const res = await TranscriptionOrchestrator.transcribeAndSummarizeWithQuotesFromUrl(
            url,
            { language: 'en' },
            { maxTokens: 500 }
          );
          setAudioSummaryWithQuotes(res);
          if (onSummaryGenerated) onSummaryGenerated(res.summaryText, null as unknown as File);
        } else {
          const res = await TranscriptionOrchestrator.transcribeAndSummarizeFromUrl(url, { language: 'en' }, { maxTokens: 500 });
          setSummary(res as string);
          if (onSummaryGenerated) onSummaryGenerated(res as string, null as unknown as File);
        }
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
    <div className="glass-surface p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">Transcription Upload</h3>

      <div className="mb-4">
        <FileUpload 
          onFileSelect={handleFileSelect} 
          acceptedTypes="audio/*,video/*" 
          maxSize={200}
          supportedFormats="MP3, WAV, M4A, WebM, MP4, MOV"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-white/70 mb-2">Or paste a public audio/video URL</label>
        <p className="text-xs text-white/50 mb-2">Note: YouTube is not supported</p>
        <input 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          placeholder="https://example.com/audio.mp3" 
          className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors" 
        />
      </div>

      {uploadSuccess && <div className="mb-3 p-3 bg-green-600/20 border border-green-500/30 rounded-lg text-green-200 text-sm">{uploadSuccess}</div>}

      {loading && <div className="text-white/60 mb-3 text-sm">Processing… this can take a little while for longer audio files.</div>}

      <ProgressBar progress={transcriptionProgress} isVisible={isTranscribing} label={isTranscribing ? 'Transcribing audio...' : undefined} />

      {error && <div className="mb-3 p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-200 text-sm">{error}</div>}

      {audioSummaryWithQuotes && (
        <div className="mb-4">
          <AudioSummaryDisplay summary={audioSummaryWithQuotes} isLoading={loading} />
        </div>
      )}

      {summary && !audioSummaryWithQuotes && (
        <div className="mb-4 p-4 bg-white/3 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-3 text-white">Summary</h4>
          <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">{summary}</div>
        </div>
      )}

      
    </div>
  );
}
