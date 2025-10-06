import { useState } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import TextSummaryService from '../lib/openai/TextSummaryService';
import FileUpload from '../components/FileUpload';
import DebugInfo from '../components/DebugInfo';
import SimpleTest from '../components/SimpleTest';

export default function NotesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFileUpload, setUseFileUpload] = useState(true);

  // Debug mode - set to true when you need to debug
  const DEBUG_MODE = false;

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

    console.log('Starting file summarization for:', selectedFile.name, selectedFile.type, selectedFile.size); // DEBUG

    setIsLoading(true);
    setError(null);

    try {
      const result = await TextSummaryService.summarizeFromFile(selectedFile);
      console.log('File summary result:', result); // DEBUG
      setSummary(result);
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

    setIsLoading(true);
    setError(null);

    try {
      const result = await TextSummaryService.summarizeText(inputText);
      setSummary(result);
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
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-muted whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </AmbientBackground>
  );
}