import { useState } from "react";
import TranscriptionUploader from "../TranscriptionUploader";
import SummaryHistory from "../SummaryHistory";
import FileUpload from "../FileUpload";



interface FlashcardInputProps {
  onGenerate: (content: string) => void;
  onFileUpload?: (file: File) => void;
  loading?: boolean;
  userId?: string | null;
}

export default function FlashcardInput({ onGenerate, onFileUpload, loading, userId }: FlashcardInputProps) {
  const [mode, setMode] = useState<'file' | 'text' | 'existing'| 'quiz'>('file');
  const [inputText, setInputText] = useState("");
  const [docUploadMessage, setDocUploadMessage] = useState<string | null>(null);

  return (
    <>
      <div className="glass-surface p-6 mb-6 max-w-3xl mx-auto">
        {/* Mode toggle */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'existing' ? "bg-[#3B82F6] text-white" : "bg-white/10 text-white hover:bg-[#3B82F6]"
            }`}
          >
            Existing Notes
          </button>
          <button
            onClick={() => setMode('file')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'file' ? "bg-[#3B82F6] text-white" : "bg-white/10 text-white hover:bg-[#3B82F6]"
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'text' ? "bg-[#3B82F6] text-white" : "bg-white/10 text-white hover:bg-[#3B82F6]"
            }`}
          >
            Text Input
          </button>
          <button
          onClick={() => setMode('quiz')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'text' ? "bg-[#3B82F6] text-white" : "bg-white/10 text-white hover:bg-[#3B82F6]"
            }`}>
              Quiz Upload
            </button>
        </div>

        {/* Input areas */}
        {mode === 'existing' && (
          <div className="mt-4">
            <SummaryHistory
              userId={userId!}
              onSelectSummary={(summary) => onGenerate(summary.summaryText || "")}
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white text-sm">Generating flashcards...</p>
                </div>
              </div>
            )}

          </div>
        )}

        {mode === 'file' && (
          <div className="relative">
            <div className="mb-4">
              <FileUpload onFileSelect={(f) => {
                setDocUploadMessage(null);
                if (onFileUpload) {
                  onFileUpload(f);
                }
              }} />
              {docUploadMessage && <div className="mt-2 text-sm text-green-200">{docUploadMessage}</div>}
            </div>

            <div className="mt-4">
              <TranscriptionUploader uploadOnly={false} onSummaryGenerated={(s) => onGenerate(s)} />
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white text-sm">Generating flashcards...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'text' && (
          <div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your text here to generate your flashcards..."
              className="w-full h-32 p-4 bg-white/5 border border-white/20 rounded-lg resize-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-white placeholder-white/40 mb-4"
            />
            <button
              onClick={() => onGenerate(inputText)}
              disabled={!inputText.trim() || loading}
              className={`w-full p-4 rounded-lgfont-semibold 
                ${loading? "bg-gray-500 cursor-not-allowed disabled:opacity-50": "bg-blue-500 hover:bg-blue-600"}
                `}
            >
              {loading ? (
                  "Generating Flashcards..."
              ) : (
                "Generate Flashcards from Text"
              )}
            </button>
          </div>
        )}
        {mode === 'quiz' && (
          <div className="mt-4">
            <SummaryHistory
              userId={userId!}
              onSelectSummary={(summary) => onGenerate(summary.summaryText || "")}
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white text-sm">Generating flashcards...</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}