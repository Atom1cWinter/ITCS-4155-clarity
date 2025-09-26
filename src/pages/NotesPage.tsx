import { useState } from 'react';
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
    <div className="min-h-screen bg-[#1E1E1E] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Debug Components - Only show when DEBUG_MODE is true */}
        {DEBUG_MODE && (
          <div className="mb-6 space-y-4">
            <DebugInfo />
            <SimpleTest />
          </div>
        )}

        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Clarity - AI Note Summarizer
        </h1>

        {/* Mode Toggle */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={() => setUseFileUpload(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                useFileUpload
                  ? 'bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] text-black'
                  : 'bg-white/20 text-gray-300 hover:bg-white/30'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setUseFileUpload(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !useFileUpload
                  ? 'bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] text-black'
                  : 'bg-white/20 text-gray-300 hover:bg-white/30'
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
                  <p className="text-white mb-2">Selected: {selectedFile.name}</p>
                  <button
                    onClick={handleSummarizeFromFile}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] hover:brightness-110 disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-600 text-black disabled:text-white font-bold py-3 px-6 rounded-lg transition-colors"
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
                className="w-full h-32 p-4 bg-white/5 border border-white/20 rounded-lg resize-none focus:ring-2 focus:ring-[#A9A5FD] focus:border-transparent text-white placeholder-gray-400"
              />
              <button
                onClick={handleSummarizeFromText}
                disabled={isLoading || !inputText.trim()}
                className="w-full mt-4 bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] hover:brightness-110 disabled:bg-gray-600 disabled:from-gray-600 disabled:to-gray-600 text-black disabled:text-white font-bold py-3 px-6 rounded-lg transition-colors"
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
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-4">Summary</h2>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/80 whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}