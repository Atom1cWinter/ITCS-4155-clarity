import { useState, useRef } from 'react';
import DocumentService from '../lib/firebase/DocumentService';
import TranscriptionOrchestrator from '../lib/openai/TranscriptionOrchestrator';
import TextSummaryService from '../lib/openai/TextSummaryService';
import SummaryService from '../lib/firebase/SummaryService';
import ProgressBar from './ProgressBar';
import { generateFileHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';
import AudioSummaryDisplay from './AudioSummaryDisplay';
import type { AudioSummaryWithQuotes } from '../lib/openai/AudioSummaryWithQuotesService';

interface UnifiedUploadAreaProps {
  onSummaryGenerated?: (summary: string, fileName: string, isAudio: boolean) => void;
  userId?: string | null;
}

// Audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.mp4', '.mov', '.flac', '.aac', '.ogg'];

// Document file extensions
const DOCUMENT_EXTENSIONS = ['.txt', '.pdf', '.html', '.htm', '.jpg', '.jpeg', '.png', '.gif'];

export default function UnifiedUploadArea({ 
  onSummaryGenerated,
  userId: propUserId
}: UnifiedUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [audioSummary, setAudioSummary] = useState<AudioSummaryWithQuotes | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const getFileType = (fileName: string): 'audio' | 'document' | 'unknown' => {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
    return 'unknown';
  };

  const getFileSizeError = (fileSize: number, fileType: 'audio' | 'document' | 'unknown'): string | null => {
    const maxSize = fileType === 'audio' ? 200 * 1024 * 1024 : 10 * 1024 * 1024; // 200MB for audio, 10MB for docs
    if (fileSize > maxSize) {
      const maxMB = fileType === 'audio' ? 200 : 10;
      return `File size must be less than ${maxMB}MB`;
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSummary(null);
    setAudioSummary(null);
    setUploadSuccess(null);

    const fileType = getFileType(file.name);
    
    // Check file type
    if (fileType === 'unknown') {
      setError(`Unsupported file type. Please upload a document (TXT, PDF, HTML, Images) or audio file (MP3, WAV, M4A, WebM, MP4, MOV)`);
      return;
    }

    // Check file size
    const sizeError = getFileSizeError(file.size, fileType);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    if (fileType === 'audio') {
      await handleAudioFile(file);
    } else {
      await handleDocumentFile(file);
    }
  };

  const handleDocumentFile = async (file: File) => {
    setLoading(true);
    setProgress(0);
    setIsTranscribing(true);
    
    // Simulate progress
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => Math.min(90, prev + Math.random() * 15));
    }, 300);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser && !propUserId) {
        setError('User not authenticated');
        return;
      }

      const userId = currentUser?.uid || propUserId;
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const fileHash = await generateFileHash(file);
      
      // Check if summary already exists
      const existingSummary = await SummaryService.getSummaryByFileHash(userId, fileHash);
      if (existingSummary) {
        setSummary(existingSummary.summaryText);
        setProgress(100);
        setUploadSuccess(`Using existing summary for ${existingSummary.fileName}`);
        if (onSummaryGenerated) {
          onSummaryGenerated(existingSummary.summaryText, file.name, false);
        }
        return;
      }

      // Generate new summary
      setProgress(45);
      const result = await TextSummaryService.summarizeFromFile(file);
      setSummary(result);

      // Save to Firestore
      setProgress(75);
      try {
        await SummaryService.saveSummary({
          userId,
          fileName: file.name,
          fileHash,
          fileSize: file.size,
          fileType: file.type || 'unknown',
          summaryText: result,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Also save as a document
        await DocumentService.uploadDocument({
          userId,
          fileName: file.name,
          fileHash,
          fileSize: file.size,
          fileType: file.type || 'unknown',
          uploadedAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (dbErr) {
        console.error('Failed to persist summary/document:', dbErr);
      }

      setProgress(100);
      setUploadSuccess(`Generated summary for ${file.name}`);
      if (onSummaryGenerated) {
        onSummaryGenerated(result, file.name, false);
      }
    } catch (err: unknown) {
      console.error('Error processing document:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Processing failed');
    } finally {
      setProgress(100);
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setTimeout(() => {
        setIsTranscribing(false);
        setProgress(0);
      }, 600);
      setLoading(false);
    }
  };

  const handleAudioFile = async (file: File) => {
    setLoading(true);
    setProgress(0);
    setIsTranscribing(true);
    
    // Simulate progress
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => Math.min(90, prev + Math.random() * 12));
    }, 400);

    try {
      // Transcribe and generate summary with quotes
      const result = await TranscriptionOrchestrator.transcribeAndSummarizeWithQuotesFromFile(
        file,
        { language: 'en' },
        { maxTokens: 500 }
      );

      setProgress(100);
      setAudioSummary(result);
      setUploadSuccess(`Audio transcribed: ${file.name}`);
      
      if (onSummaryGenerated) {
        onSummaryGenerated(result.summaryText, file.name, true);
      }
    } catch (err: unknown) {
      console.error('Error transcribing audio:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Transcription failed');
    } finally {
      setProgress(100);
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setTimeout(() => {
        setIsTranscribing(false);
        setProgress(0);
      }, 600);
      setLoading(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive 
            ? 'border-[#A9A5FD] bg-[#A9A5FD]/10' 
            : 'border-white/30 hover:border-white/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={[...AUDIO_EXTENSIONS, ...DOCUMENT_EXTENSIONS].join(',')}
          onChange={handleChange}
        />
        
        <div className="text-white/60 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>Drag and drop your file here, or</p>
        </div>
        
        <button
          onClick={onButtonClick}
          className="px-6 py-2 text-white font-semibold rounded-xl hover:brightness-110 transition-all"
          style={{ backgroundColor: '#3B82F6' }}
        >
          Choose File
        </button>
        
        <p className="text-white/40 text-sm mt-4">
          <strong>Documents:</strong> TXT, PDF, HTML, Images (Max 10MB)<br/>
          <strong>Audio:</strong> MP3, WAV, M4A, WebM, MP4, MOV (Max 200MB)
        </p>
      </div>

      {uploadSuccess && <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-lg text-green-200 text-sm">{uploadSuccess}</div>}

      {loading && <div className="text-white/60 text-sm">Processing… this can take a little while for larger files.</div>}

      <ProgressBar progress={progress} isVisible={isTranscribing} label={isTranscribing ? 'Processing file...' : undefined} />

      {error && <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-200 text-sm">{error}</div>}

      {audioSummary && (
        <div>
          <AudioSummaryDisplay summary={audioSummary} isLoading={loading} />
        </div>
      )}

      {summary && !audioSummary && (
        <div className="p-4 bg-white/3 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-3 text-white">Summary</h4>
          <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">{summary}</div>
        </div>
      )}
    </div>
  );
}
