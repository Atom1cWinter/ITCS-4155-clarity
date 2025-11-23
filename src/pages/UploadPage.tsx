import { useState, useEffect } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import DocumentService from '../lib/firebase/DocumentService';
import type { Document } from '../lib/firebase/DocumentService';
import { auth } from '../lib/firebase';
import UploadOnlyArea from '../components/UploadOnlyArea';

export default function UploadPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previousFiles, setPreviousFiles] = useState<Document[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

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
        const documents = await DocumentService.getUserDocuments(userId);
        setPreviousFiles(documents);
      } catch (err) {
        console.error('Error loading previous files:', err);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousFiles();
  }, [userId, refreshTrigger]);

  const handleDeleteFile = async (summaryId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    try {
      await DocumentService.deleteDocument(summaryId);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  return (
    <AmbientBackground>
      <div className="w-full h-full pt-80 pb-12 px-6">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="hero-title mb-4">Upload Documents & Audio</h1>
          <p className="hero-subtitle mb-6">
            Upload and organize your lecture notes, PDFs, slides, and audio/video files. Audio will be transcribed automatically.
          </p>
          
          {/* Info Chip */}
          <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Store files securely for your account</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Section */}
          <div className="glass-surface p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Upload Files</h2>
            <p className="text-white/70 text-sm mb-4">Upload documents (PDF, text, images) or audio files (MP3, WAV, etc.) - we'll automatically process them appropriately</p>
            <UploadOnlyArea 
              userId={userId}
              onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
            />
          </div>

          {/* Previous Files Section */}
          {userId && (
            <div className="glass-surface p-6">
              <h3 className="text-lg font-semibold text-primary mb-3">Your Files</h3>
              
              {loadingPrevious ? (
                <p className="text-muted text-sm">Loading your files...</p>
              ) : previousFiles.length === 0 ? (
                <p className="text-muted text-sm">No files uploaded yet. Upload a file to get started!</p>
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
                          {(file.fileSize / 1024).toFixed(2)} KB • {new Date(file.uploadedAt).toLocaleDateString()} {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id!, file.fileName)}
                        className="ml-4 flex-shrink-0 text-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 w-8 h-8 flex items-center justify-center rounded transition-colors"
                        title="Delete file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AmbientBackground>
  );
}