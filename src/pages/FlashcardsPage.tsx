import { useState, useEffect } from "react";
import FlashcardList from "../components/FlashCardComponents/FlashcardList";
import FlashcardSingleView from "../components/FlashCardComponents/FlashcardSingleView";
import FlashcardService from "../lib/openai/FlashcardService";
import DocumentService from '../lib/firebase/DocumentService';
import type { Document } from '../lib/firebase/DocumentService';
import SummaryService from '../lib/firebase/SummaryService';
import type { Summary } from '../lib/firebase/SummaryService';
import TranscriptionUploader from "../components/TranscriptionUploader";
import FileUpload from "../components/FileUpload";
import ProgressBar from "../components/ProgressBar";
import { auth } from "../lib/firebase";
import QuizResultService from "../lib/firebase/QuizResultService";
import type { QuizResult } from "../lib/firebase/QuizResultService";
import AmbientBackground from "../components/AmbientBackground";


export default function FlashcardsPage() {
  const [flashcardView, setFlashcardView] = useState(false);
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'existing' | 'upload' | 'text'| 'quiz'>('existing');
  const [docUploadMessage, setDocUploadMessage] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [numCardsOption, setNumCardsOption] = useState<number>(10);
  const [styleOption, setStyleOption] = useState<'short'|'detailed'>('short');
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);

    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setUserId(user.uid);
        }
      });
      return unsubscribe;
    }, []);

    // Load user's uploaded documents for quick access
    const [previousFiles, setPreviousFiles] = useState<Document[]>([]);
    const [loadingPrevious, setLoadingPrevious] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
      if (!userId) return;

      const loadPreviousFiles = async () => {
        try {
          setLoadingPrevious(true);
          const docs = await DocumentService.getUserDocuments(userId);
          docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          setPreviousFiles(docs);
        } catch (err) {
          console.error('FlashcardsPage: failed to load previous files', err);
        } finally {
          setLoadingPrevious(false);
        }
      };

      loadPreviousFiles();
    }, [userId, refreshTrigger]);

    // Load recent quiz results for the user
    useEffect(() => {
  if (!userId) return;

  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const results = await QuizResultService.getRecentQuizResults(userId, 5);
      setQuizResults(results);
    } catch (err) {
      console.error("FlashcardsPage: failed to load recent quizzes", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

      loadQuizzes();
    }, [userId]);

    // When selecting a document, try to fetch a saved summary and select it (generate on demand)
    const handleSelectDocument = async (doc: Document) => {
      try {
        if (!userId) {
          alert('Sign in to use saved documents');
          return;
        }
        const summary = await SummaryService.getSummaryByFileHash(userId, doc.fileHash);
        if (summary) {
            setSelectedSummary(summary);
            // Auto-generate flashcards immediately when an existing document is selected
            try {
              await handleGenerate(summary.summaryText || '');
            } catch (genErr) {
              console.error('Auto-generate flashcards failed:', genErr);
            }
        } else {
          alert('No saved summary for this document. Try transcribing or uploading to generate one.');
        }
      } catch (err) {
        console.error('Failed to select document summary:', err);
        alert('Failed to load document summary.');
      }
    };

    // deletion of documents is only available on UploadPage per design

  // Handle generate from text 
  const handleGenerate = async (content: string) => {
    try {
      setLoading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 300);

      const flashcards = await FlashcardService.generateFlashcards(content, {
        numCards: numCardsOption,
        style: styleOption,
        temperature: 0.4,
      });
      setProgress(100);
      setFlashcards(
        flashcards.map( card => ({
          front: card.front,
          back: card.back
        }))
      );
      setFlashcardView(true);
      clearInterval(progressInterval);

    } catch (error) { 
      console.error(error);
      alert("Failed to generate flashcards. Please try again");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Entrypoint generate click for UI - use selectedSummary or pasted text depending on mode
  const handleGenerateClick = async () => {
    setFlashcards([]);
    setFlashcardView(false);
    setLoading(true);
    setProgress(0);
    try {
      if (mode === 'existing') {
        if (!selectedSummary) {
          alert('Select a saved document first');
          return;
        }
        await handleGenerate(selectedSummary.summaryText || '');
      } else if (mode === 'text') {
        if (!pastedText.trim()) {
          alert('Paste or enter text to generate flashcards');
          return;
        }
        await handleGenerate(pastedText);
      }
    } catch (err) {
      console.error('Generate click failed', err);
      alert('Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  // handle generate from file upload (file -> flashcards)
  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 300);

      const flashcards = await FlashcardService.generateFlashcardsFromFile(file);
      setProgress(100);
      setFlashcards(flashcards.map(card => ({ front: card.front, back: card.back })));
      setFlashcardView(true);
      clearInterval(progressInterval);
    } catch (err) {
      console.error(err);
      alert("Failed to generate from file.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Handle generate from quiz result
  const handleGenerateFromQuiz = async (quiz: QuizResult) => {
  try {
    setLoading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    const incorrect = quiz.incorrectQuestions ?? [];

    const content =
      incorrect.length > 0
        ? incorrect
            .map(
              (q, index) =>
                `Question ${index + 1}: ${q.question}
Correct answer: ${q.correctAnswer}
${q.explanation ? `Explanation: ${q.explanation}` : ""}`
            )
            .join("\n\n")
        : `Quiz title: ${quiz.title}
Score: ${quiz.score}%
Topics: ${quiz.topics.join(", ")}

Create flashcards that focus on the most important concepts and typical mistakes for these topics.`;

    await handleGenerate(content);
    setSelectedQuiz(quiz);
    setFlashcardView(true);

    setProgress(100);
    clearInterval(progressInterval);
  } catch (err) {
    console.error("FlashcardsPage: handleGenerateFromQuiz error", err);
    alert("Failed to generate flashcards from quiz");
  } finally {
    setLoading(false);
    setTimeout(() => setProgress(0), 500);
  }
};

  // Handle back (from list view)
  const handleBack = () => {
    setFlashcardView(false);
  };

  

  return (
    <AmbientBackground>
      <ProgressBar 
        progress={progress} 
        isVisible={loading} 
        label="Generating flashcards..."
      />
      {}
      <div className="w-full h-full pt-60 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="hero-title mb-4">Flashcards</h1>
          <p className="hero-subtitle mb-6">Generate AI-powered flashcards from your notes or uploaded files</p>

          <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Powered by OpenAI GPT</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {!flashcardView ? (
            <div>
              {/* Mode toggle and input selections (Existing / Upload / Text) */}
              <div className="glass-surface p-6 mb-6">
                <div className="flex gap-3 justify-center mb-4">
                  <button onClick={() => setMode('existing')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='existing' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Use Existing Notes</button>
                  <button onClick={() => setMode('upload')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='upload' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Upload File</button>
                  <button onClick={() => setMode('text')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='text' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Text Input</button>
                  <button onClick={() => setMode('quiz')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='text' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>From Quiz</button>
                </div>

                <div className="space-y-4">
                  {mode === 'existing' && (
                    <div>
                      {userId ? (
                        <div className="glass-surface p-4 rounded">
                          {loadingPrevious ? (
                            <p className="text-muted text-sm">Loading your documents...</p>
                          ) : previousFiles.length === 0 ? (
                            <p className="text-muted text-sm">No documents uploaded yet. Upload a file to get started!</p>
                          ) : (
                            <div className="space-y-2">
                              {previousFiles.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10">
                                  <button onClick={() => handleSelectDocument(file)} className="text-left flex-1">
                                    <div className="font-medium">{file.fileName}</div>
                                    <div className="text-xs text-muted">{(file.fileSize / 1024).toFixed(2)} KB • {new Date(file.uploadedAt).toLocaleDateString()}</div>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-500/10 rounded">Sign in to access your previous notes. You can also paste text or upload a file.</div>
                      )}

                      {selectedSummary && (
                        <div className="mt-3 p-3 bg-white/5 rounded text-left">
                          <div className="font-medium">Selected: {selectedSummary.fileName}</div>
                          <div className="text-sm text-muted mt-1">{(selectedSummary.summaryText || '').slice(0, 200)}{(selectedSummary.summaryText || '').length > 200 ? '...' : ''}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'upload' && (
                    <div>
                      <div className="mb-4">
                        <FileUpload onFileSelect={(f) => { setDocUploadMessage(null); handleFileUpload(f); }} />
                        {docUploadMessage && (
                          <div className="mt-3">
                            <div className="text-primary mb-2">{docUploadMessage}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <TranscriptionUploader uploadOnly={false} onSummaryGenerated={async (res) => {
                          // when transcription generates, create flashcards immediately
                          try {
                            setLoading(true);
                            await handleGenerate(res);
                          } finally {
                            setLoading(false);
                            setRefreshTrigger(r => r + 1);
                          }
                        }} onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
                      </div>
                    </div>
                  )}

                  {mode === 'text' && (
                    <div>
                      <textarea className="w-full p-3 rounded bg-white/5 min-h-[140px]" placeholder="Paste notes or text here..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />

                      <div className="flex gap-3 items-center mt-3">
                        <label className="text-sm">Cards:</label>
                        <input type="number" min={1} max={50} value={numCardsOption} onChange={(e) => setNumCardsOption(Number(e.target.value))} className="w-20 p-1 rounded bg-white/5 text-center" />

                        <label className="text-sm ml-4">Style:</label>
                        <select value={styleOption} onChange={(e) => setStyleOption(e.target.value as 'short'|'detailed')} className="p-1 rounded bg-white/5 text-primary">
                          <option value="short">Short</option>
                          <option value="detailed">Detailed</option>
                        </select>

                        <button onClick={handleGenerateClick} className="ml-4 px-4 py-2 bg-[#3B82F6] rounded text-white">Generate Flashcards</button>
                      </div>
                    </div>
                  )}

                  {mode === "quiz" && (
                    <div>
                      {userId ? (
                        <div className="glass-surface p-4 rounded">
                          {loadingQuizzes ? (
                            <p className="text-muted text-sm">Loading your recent quizzes...</p>
                          ) : quizResults.length === 0 ? (
                            <p className="text-muted text-sm">
                              No quizzes taken yet. Complete a quiz to see it here.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {quizResults.map((quiz) => (
                                <button
                                  key={quiz.id}
                                  onClick={() => handleGenerateFromQuiz(quiz)}
                                  className="w-full text-left flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10"
                                >
                                  <div>
                                    <div className="font-medium">{quiz.title}</div>
                                    <div className="text-xs text-muted">
                                      {new Date(quiz.takenAt).toLocaleString()} • Score{" "}
                                      {quiz.score}% • {quiz.correctQuestions}/
                                      {quiz.totalQuestions} correct
                                    </div>
                                    {quiz.topics?.length > 0 && (
                                      <div className="text-xs text-muted mt-1">
                                        Topics: {quiz.topics.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-primary">
                                    Generate flashcards →
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-500/10 rounded">
                          Sign in to see quizzes taken and generate flashcards from them.
                        </div>
                      )}

                      {selectedQuiz && (
                        <div className="mt-3 p-3 bg-white/5 rounded text-left">
                          <div className="font-medium">
                            Selected quiz: {selectedQuiz.title}
                          </div>
                          <div className="text-xs text-muted mt-1">
                            Score {selectedQuiz.score}% • Taken{" "}
                            {new Date(selectedQuiz.takenAt).toLocaleString()}
                          </div>
                          {selectedQuiz.topics?.length > 0 && (
                            <div className="text-xs text-muted mt-1">
                              Topics: {selectedQuiz.topics.join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 space-y-16">
              {/* Single card view section */}
              <section className="">
                <FlashcardSingleView flashcards={flashcards} onBack={handleBack} />
              </section>

              <hr className="border-white/20" />

              {/* Flashcard list section */}
              <section>
                <FlashcardList flashcards={flashcards}/>
              </section>
            </div>
          )}
        </div>
      </div>
    </AmbientBackground>
  );
}