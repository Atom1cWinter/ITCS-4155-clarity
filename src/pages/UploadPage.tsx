import { useState, useEffect } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import SummaryService from '../lib/firebase/SummaryService';
import DocumentService from '../lib/firebase/DocumentService';
import { generateFileHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';
import type { Summary } from '../lib/firebase/SummaryService';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previousFiles, setPreviousFiles] = useState<Summary[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get current user on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  // Load previous files
  useEffect(() => {
    if (!userId) return;

    const loadPreviousFiles = async () => {
      try {
        setLoadingPrevious(true);
        const summaries = await SummaryService.getUserSummaries(userId);
        setPreviousFiles(summaries);
      } catch (err) {
        console.error('Error loading previous files:', err);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousFiles();
  }, [userId, refreshTrigger]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSuccessMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setSuccessMessage(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    try {
      // Check for duplicate
      const fileHash = await generateFileHash(selectedFile);
      setProgress(20);
      const existing = await SummaryService.getSummaryByFileHash(userId, fileHash);
      
      if (existing) {
        setError(`File already uploaded: "${existing.fileName}"`);
        setIsLoading(false);
        clearInterval(progressInterval);
        setProgress(0);
        return;
      }

      setProgress(50);

      // Upload document
      await DocumentService.uploadDocument({
        userId,
        fileName: selectedFile.name,
        fileHash,
        fileSize: selectedFile.size,
        fileType: selectedFile.type || 'unknown',
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });

      setProgress(100);
      setSuccessMessage(`✓ "${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      clearInterval(progressInterval);
    } catch (err) {
      console.error('Error uploading document:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Upload failed: ${errorMsg}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleDeleteFile = async (summaryId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    try {
      setIsLoading(true);
      await SummaryService.deleteSummary(summaryId);
      setSuccessMessage(`"${fileName}" deleted`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AmbientBackground>
      <ProgressBar 
        progress={progress} 
        isVisible={isLoading} 
        label="Uploading document..."
      />
      <div className="w-full h-full pt-60 pb-12 px-6">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="hero-title mb-4">Upload Documents</h1>
          <p className="hero-subtitle mb-6">
            Upload and organize your lecture notes, PDFs, slides, and other documents
          </p>
          
          {/* Info Chip */}
          <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Store documents securely for your account</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Previous Files Section */}
          {userId && (
            <div className="glass-surface p-6">
              <h3 className="text-lg font-semibold text-primary mb-3">Your Documents</h3>
              
              {loadingPrevious ? (
                <p className="text-muted text-sm">Loading your documents...</p>
              ) : previousFiles.length === 0 ? (
                <p className="text-muted text-sm">No documents uploaded yet. Upload a file to get started!</p>
              ) : (
                <div className="space-y-2">
                  {previousFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-primary font-medium truncate">
                          {file.fileName}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {(file.fileSize / 1024).toFixed(2)} KB • {new Date(file.createdAt).toLocaleDateString()} {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id!, file.fileName)}
                        disabled={isLoading}
                        className="ml-4 flex-shrink-0 text-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 w-8 h-8 flex items-center justify-center rounded transition-colors disabled:opacity-50"
                        title="Delete document"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Section */}
          <div className="glass-surface p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Upload New Document</h2>
            
            <FileUpload onFileSelect={handleFileSelect} />
            
            {selectedFile && (
              <div className="mt-4">
                <p className="text-primary mb-4">
                  <span className="font-medium">Selected:</span> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="w-full bg-[#3B82F6] hover:brightness-110 disabled:opacity-50 text-primary font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  {isLoading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-200 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AmbientBackground>
  );
}