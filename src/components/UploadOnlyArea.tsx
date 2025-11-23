import { useState, useRef } from 'react';
import DocumentService from '../lib/firebase/DocumentService';
import TranscriptionOrchestrator from '../lib/openai/TranscriptionOrchestrator';
import TextSummaryService from '../lib/openai/TextSummaryService';
import SummaryService from '../lib/firebase/SummaryService';
import ProgressBar from './ProgressBar';
import { generateFileHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';

interface UploadOnlyAreaProps {
  onUploadComplete?: (fileName: string) => void;
  userId?: string | null;
}

// Audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.mp4', '.mov', '.flac', '.aac', '.ogg'];

// Document file extensions
const DOCUMENT_EXTENSIONS = ['.txt', '.pdf', '.html', '.htm', '.jpg', '.jpeg', '.png', '.gif'];

export default function UploadOnlyArea({ 
  onUploadComplete,
  userId: propUserId
}: UploadOnlyAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
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
    setProgress(0);
    setIsProcessing(true);
    setProcessingMessage('Uploading document...');
    
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
      
      // Check if already exists
      const existing = await DocumentService.getDocumentByFileHash(userId, fileHash);
      if (existing) {
        setUploadSuccess(`Document already uploaded: ${existing.fileName}`);
        if (onUploadComplete) {
          onUploadComplete(file.name);
        }
        return;
      }

      // Upload document
      setProgress(50);
      await DocumentService.uploadDocument({
        userId,
        fileName: file.name,
        fileHash,
        fileSize: file.size,
        fileType: file.type || 'unknown',
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate and save summary in background
      setProgress(75);
      setProcessingMessage('Generating summary...');
      try {
        const existingSummary = await SummaryService.getSummaryByFileHash(userId, fileHash);
        if (!existingSummary) {
          const summaryText = await TextSummaryService.summarizeFromFile(file);
          await SummaryService.saveSummary({
            userId,
            fileName: file.name,
            fileHash,
            fileSize: file.size,
            fileType: file.type || 'unknown',
            summaryText,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (summaryErr) {
        console.error('Failed to generate summary (non-critical):', summaryErr);
      }

      setProgress(100);
      setUploadSuccess(`Document uploaded: ${file.name}`);
      if (onUploadComplete) {
        onUploadComplete(file.name);
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
        setIsProcessing(false);
        setProcessingMessage('');
        setProgress(0);
      }, 600);
    }
  };

  const handleAudioFile = async (file: File) => {
    setProgress(0);
    setIsProcessing(true);
    setProcessingMessage('Uploading audio file...');
    
    // Simulate progress
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => Math.min(85, prev + Math.random() * 12));
    }, 400);

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
      
      // Check if already exists
      const existing = await DocumentService.getDocumentByFileHash(userId, fileHash);
      if (existing) {
        setUploadSuccess(`Audio file already uploaded: ${existing.fileName}`);
        if (onUploadComplete) {
          onUploadComplete(file.name);
        }
        return;
      }

      // Save document metadata
      setProgress(40);
      await DocumentService.uploadDocument({
        userId,
        fileName: file.name,
        fileHash,
        fileSize: file.size,
        fileType: file.type || 'unknown',
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });

      // Transcribe and generate summary in background (non-blocking)
      setProgress(50);
      setProcessingMessage('Transcribing audio (this may take a while)...');
      
      // Start transcription in background without awaiting
      (async () => {
        try {
          const result = await TranscriptionOrchestrator.transcribeAndSummarizeWithQuotesFromFile(
            file,
            { language: 'en' },
            { maxTokens: 500 }
          );

          // Save summary for later retrieval
          await SummaryService.saveSummary({
            userId,
            fileName: file.name,
            fileHash,
            fileSize: file.size,
            fileType: file.type || 'unknown',
            summaryText: result.summaryText,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log('Audio transcription and summary saved successfully');
        } catch (transcriptionErr) {
          console.error('Failed to transcribe audio (will retry on access):', transcriptionErr);
        }
      })();

      setProgress(100);
      setUploadSuccess(`Audio file uploaded: ${file.name} (transcription processing in background)`);
      if (onUploadComplete) {
        onUploadComplete(file.name);
      }
    } catch (err: unknown) {
      console.error('Error uploading audio file:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Upload failed');
    } finally {
      setProgress(100);
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingMessage('');
        setProgress(0);
      }, 600);
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

      {isProcessing && <div className="text-white/60 text-sm">{processingMessage}</div>}

      <ProgressBar progress={progress} isVisible={isProcessing} label={processingMessage || 'Processing...'} />

      {error && <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-200 text-sm">{error}</div>}
    </div>
  );
}
