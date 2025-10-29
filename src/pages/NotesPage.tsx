import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import AmbientBackground from '../components/AmbientBackground';
import TextSummaryService from '../lib/openai/TextSummaryService';
import FileUpload from '../components/FileUpload';
import DebugInfo from '../components/DebugInfo';
import SimpleTest from '../components/SimpleTest';
import SummaryService from '../lib/firebase/SummaryService';
import DocumentService from '../lib/firebase/DocumentService';
import SummaryHistory from '../components/SummaryHistory';
import type { Summary } from '../lib/firebase/SummaryService';
import { generateFileHash, generateTextHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';

export default function NotesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFileUpload, setUseFileUpload] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debug mode - set to true when you need to debug
  const DEBUG_MODE = false;

  // Get current user on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  const handleSelectPreviousSummary = (prevSummary: Summary) => {
    setSummary(prevSummary.summaryText);
    setSelectedFile(null);
    setInputText('');
    setError(null);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSummary('');
  };

  const handleSummarizeFromFile = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    console.log('Starting file summarization for:', selectedFile.name, selectedFile.type, selectedFile.size); // DEBUG

    setIsLoading(true);
    setError(null);

    try {
      const result = await TextSummaryService.summarizeFromFile(selectedFile);
      console.log('File summary result:', result); // DEBUG
      setSummary(result);

      // Save summary to Firestore
      try {
        const fileHash = await generateFileHash(selectedFile);
        console.log('Attempting to save summary for:', selectedFile.name, 'userId:', userId);
        await SummaryService.saveSummary({
          userId,
          fileName: selectedFile.name,
          fileHash,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || 'unknown',
          summaryText: result,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('Summary saved to Firestore successfully');
        
        // Also save as a document for the Upload page
        try {
          await DocumentService.uploadDocument({
            userId,
            fileName: selectedFile.name,
            fileHash,
            fileSize: selectedFile.size,
            fileType: selectedFile.type || 'unknown',
            uploadedAt: new Date(),
            updatedAt: new Date(),
          });
          console.log('Document saved to Firestore successfully');
        } catch (docError) {
          console.error('Error saving document:', docError);
          // Don't show error - document save is secondary
        }
        
        // Trigger refresh of summary history
        setRefreshTrigger(prev => prev + 1);
      } catch (dbError) {
        console.error('Error saving summary to Firestore:', dbError);
        const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
        console.error('Detailed error:', errorMsg);
        // Show error to user so they know to check Firestore
        setError(`Note: Summary generated but storage failed. Check browser console: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Detailed file summary error:', err); // DEBUG
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to generate summary from file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarizeFromText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text first');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await TextSummaryService.summarizeText(inputText);
      setSummary(result);

      // Save summary to Firestore
      try {
        const textHash = await generateTextHash(inputText);
        console.log('Attempting to save text summary for userId:', userId);
        await SummaryService.saveSummary({
          userId,
          fileName: `Text Summary - ${new Date().toLocaleString()}`,
          fileHash: textHash,
          fileSize: inputText.length,
          fileType: 'text',
          summaryText: result,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('Text summary saved to Firestore successfully');
        // Trigger refresh of summary history
        setRefreshTrigger(prev => prev + 1);
      } catch (dbError) {
        console.error('Error saving summary to Firestore:', dbError);
        const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
        console.error('Detailed error:', errorMsg);
        // Show error to user so they know to check Firestore
        setError(`Note: Summary generated but storage failed. Check browser console: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Text summary error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to generate summary: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AmbientBackground>
      {/* Page content with top padding for floating nav */}
      <div className="w-full h-full pt-60 pb-12 px-6">
        {/* Debug Components - Only show when DEBUG_MODE is true */}
        {DEBUG_MODE && (
          <div className="max-w-4xl mx-auto mb-8 space-y-4">
            <DebugInfo />
            <SimpleTest />
          </div>
        )}

        {/* Centered Hero */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="hero-title mb-4">
            Notes
          </h1>
          <p className="hero-subtitle mb-6">
            Upload your lecture notes or enter text to get AI-powered summaries
          </p>
          
          {/* Glassy Info Chip */}
          <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Powered by OpenAI GPT</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">

        {/* Previous Summaries History */}
        {userId && (
          <SummaryHistory userId={userId} onSelectSummary={handleSelectPreviousSummary} refreshTrigger={refreshTrigger} />
        )}

        {/* Mode Toggle */}
        <div className="glass-surface p-6 mb-6">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={() => setUseFileUpload(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                useFileUpload
                  ? 'bg-[#3B82F6] text-primary'
                  : 'bg-white/10 text-muted hover:bg-white/15'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setUseFileUpload(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !useFileUpload
                  ? 'bg-[#3B82F6] text-primary'
                  : 'bg-white/10 text-muted hover:bg-white/15'
              }`}
            >
              Enter Text
            </button>
          </div>

          {useFileUpload ? (
            <div>
              <FileUpload onFileSelect={handleFileSelect} />
              {selectedFile && (
                <div className="mt-4">
                  <p className="text-primary mb-2">Selected: {selectedFile.name}</p>
                  <button
                    onClick={handleSummarizeFromFile}
                    disabled={isLoading}
                    className="w-full bg-[#3B82F6] hover:brightness-110 disabled:opacity-50 text-primary font-semibold py-3 px-6 rounded-lg transition-all"
                  >
                    {isLoading ? 'Generating Summary...' : 'Generate Summary from File'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your text here to summarize..."
                className="w-full h-32 p-4 bg-white/5 border border-white/20 rounded-lg resize-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
              />
              <button
                onClick={handleSummarizeFromText}
                disabled={isLoading || !inputText.trim()}
                className="w-full mt-4 bg-[#3B82F6] hover:brightness-110 disabled:opacity-50 text-primary font-semibold py-3 px-6 rounded-lg transition-all"
              >
                {isLoading ? 'Generating Summary...' : 'Generate Summary from Text'}
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="glass-surface p-6">
            <h2 className="text-2xl font-semibold text-primary mb-4">Summary</h2>
            <div className="bg-white/5 rounded-lg p-4 markdown-content">
              <ReactMarkdown
                components={{
                  h1: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
                    <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0" {...props} />
                  ),
                  h2: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
                    <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />
                  ),
                  h3: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
                    <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
                  ),
                  p: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
                    <p className="mb-3 text-muted" {...props} />
                  ),
                  strong: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
                    <strong className="font-bold text-primary" {...props} />
                  ),
                  em: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
                    <em className="italic text-muted" {...props} />
                  ),
                  ul: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLUListElement>>) => (
                    <ul className="list-disc list-inside mb-3 text-muted" {...props} />
                  ),
                  ol: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLOListElement>>) => (
                    <ol className="list-decimal list-inside mb-3 text-muted" {...props} />
                  ),
                  li: (props: React.PropsWithChildren<React.LiHTMLAttributes<HTMLLIElement>>) => (
                    <li className="mb-1" {...props} />
                  ),
                  code: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
                    <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono" {...props} />
                  ),
                  pre: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLPreElement>>) => (
                    <pre className="bg-white/10 p-3 rounded mb-3 overflow-x-auto" {...props} />
                  ),
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
    </AmbientBackground>
  );
}