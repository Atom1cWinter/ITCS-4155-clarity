import { useState, useEffect } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import TranscriptionUploader from '../components/TranscriptionUploader';
import Button from '../components/Button';
import DocumentService from '../lib/firebase/DocumentService';
import type { Document } from '../lib/firebase/DocumentService';
import SummaryService from '../lib/firebase/SummaryService';
import ProgressBar from '../components/ProgressBar';
import QuizService from '../lib/openai/QuizService';
import { auth } from '../lib/firebase';
import type { Summary } from '../lib/firebase/SummaryService';
import FileUpload from '../components/FileUpload';

type QuizQuestion = {
    question: string;
    options: string[];
    correctAnswer: number;
};

type QuizOptions = {
    numQuestions?: number;
    difficulty?: 'easy'|'medium'|'hard';
    maxTokens?: number;
    temperature?: number;
};

export default function QuizzesPage() {
    const [mode, setMode] = useState<'upload' | 'existing' | 'text'>('existing');
    const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [docUploadMessage, setDocUploadMessage] = useState<string | null>(null);
    const [previousFiles, setPreviousFiles] = useState<Document[]>([]);
    const [loadingPrevious, setLoadingPrevious] = useState(false);
    
    // Handler called when TranscriptionUploader auto-generates a summary
    const handleTranscriptionSummaryGenerated = async (summaryText: string, file: File | null) => {
        if (file) console.log('Transcription provided from file:', file.name);
        setError(null);
        setIsLoading(true);
        setProgress(0);
        setQuestions(null);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 30;
          });
        }, 300);

        try {
            const options: QuizOptions = { numQuestions, difficulty };
            const qs = await QuizService.generateQuiz(summaryText, options);
            setProgress(85);
            setQuestions(qs);
            setProgress(100);
        } catch (err) {
            console.error('Error generating quiz from transcription summary', err);
            let message = 'Failed to generate quiz from transcription';
            if (err instanceof Error) message = err.message;
            else if (typeof err === 'string') message = err;
            setError(message);
        } finally {
            setIsLoading(false);
            clearInterval(progressInterval);
            setTimeout(() => setProgress(0), 500);
        }
    };
    const [pastedText, setPastedText] = useState('');
    const [numQuestions, setNumQuestions] = useState<number>(5);
    const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
    const [difficultyActive, setDifficultyActive] = useState(false);
    const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);


    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [submitted, setSubmitted] = useState(false);

    const userId = auth.currentUser?.uid || '';

    // handle generate from uploaded document file
    const handleFileUpload = async (file: File) => {
        setError(null);
        setIsLoading(true);
        setProgress(0);
        setQuestions(null);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 30;
          });
        }, 300);

        try {
            const options: QuizOptions = { numQuestions, difficulty };
            const qs = await QuizService.generateQuizFromFile(file, options);
            setProgress(85);
            setQuestions(qs);
            setProgress(100);
        } catch (err) {
            console.error('Error generating quiz from file', err);
            let message = 'Failed to generate quiz from file';
            if (err instanceof Error) message = err.message;
            else if (typeof err === 'string') message = err;
            setError(message);
        } finally {
            setIsLoading(false);
            clearInterval(progressInterval);
            setTimeout(() => setProgress(0), 500);
        }
    };

    // Load user's documents (previous uploads)
    useEffect(() => {
        if (!userId) return;

        const loadPreviousFiles = async () => {
            try {
                setLoadingPrevious(true);
                const docs = await DocumentService.getUserDocuments(userId);
                docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
                setPreviousFiles(docs);
            } catch (err) {
                console.error('QuizzesPage: failed to load previous files', err);
            } finally {
                setLoadingPrevious(false);
            }
        };

        loadPreviousFiles();
    }, [userId, refreshTrigger]);

    const handleSelectDocument = async (doc: Document) => {
        if (!userId) {
            setError('Sign in to access saved documents');
            return;
        }

        try {
            const existing = await SummaryService.getSummaryByFileHash(userId, doc.fileHash);
            if (existing) {
                setSelectedSummary(existing);
            } else {
                setError('No saved summary for this document. Try transcribing or uploading to create one.');
            }
        } catch (err) {
            console.error('QuizzesPage: failed to fetch summary for document', err);
            setError('Failed to fetch summary for document');
        }
    };

    // document deletion removed from Quizzes UI (deletion only available on UploadPage)

    useEffect(() => {
        setCurrentIndex(0);
        setAnswers([]);
        setSubmitted(false);
    }, [questions]);

    const handleGenerate = async () => {
        setError(null);
        setIsLoading(true);
        setProgress(0);
        setQuestions(null);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 30;
          });
        }, 300);

        try {
            const options: QuizOptions = { numQuestions, difficulty };

                            if (mode === 'existing' && selectedSummary) {
                        const qs = await QuizService.generateQuiz(selectedSummary.summaryText || '', options);
                setProgress(85);
                setQuestions(qs);
            } else if (mode === 'text' && pastedText.trim().length > 0) {
                const qs = await QuizService.generateQuiz(pastedText, options);
                setProgress(85);
                setQuestions(qs);
            } else {
                        setError('Please pick an existing note or paste text to generate a quiz. If you selected Upload, the transcriber will auto-generate the quiz when the file is selected.');
            }
            setProgress(100);
            clearInterval(progressInterval);
            } catch (err) {
                console.error('QuizzesPage: generate error', err);
                    let message = 'Failed to generate quiz';
                    if (err instanceof Error) message = err.message;
                    else if (typeof err === 'string') message = err;
                    setError(message);
        } finally {
            setIsLoading(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    const handleSelectAnswer = (idx: number) => {
        setAnswers(prev => {
            const copy = [...prev];
            copy[currentIndex] = idx;
            return copy;
        });
    };

        const handleSubmitQuiz = () => {
            // Prevent submitting if not all questions answered
            if (!questions) return;
            const allAnswered = questions.every((_, i) => typeof answers[i] === 'number');
            if (!allAnswered) {
                setError('Please answer all questions before submitting.');
                return;
            }

            setError(null);
            setSubmitted(true);
        };

    const score = (() => {
        if (!questions) return 0;
        let s = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer) s++;
        }
        return s;
    })();

    return (
        <AmbientBackground>
            <ProgressBar 
              progress={progress} 
              isVisible={isLoading} 
              label="Generating quiz..."
            />
                        {}
                        <div className="w-full h-full pt-60 pb-12 px-6">
                                <div className="max-w-3xl mx-auto text-center mb-12">
                                        <h1 className="hero-title mb-4">Quizzes</h1>
                                        <p className="hero-subtitle mb-6">Generate AI-powered multiple-choice quizzes from your notes or uploads.</p>

                                        <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted mb-6">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Powered by OpenAI GPT</span>
                                        </div>
                                </div>

                                <div className="max-w-4xl mx-auto space-y-6">
                                        <div className="glass-surface p-6 mb-6">
                                                <div className="flex gap-3 justify-center mb-4">
                            <button onClick={() => setMode('existing')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='existing' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Use Existing Notes</button>
                            <button onClick={() => setMode('upload')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='upload' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Upload File</button>
                            <button onClick={() => setMode('text')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='text' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Text Input</button>
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
                                    {/* Document metadata upload (saves to documents collection) */}
                                    <div className="mb-4">
                                        <FileUpload onFileSelect={(f) => { setDocUploadMessage(null); handleFileUpload(f); }} />
                                        {docUploadMessage && (
                                            <div className="mt-3">
                                                <div className="text-primary mb-2">{docUploadMessage}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Audio/Video transcriber - auto-starts transcription on selection */}
                                    <div className="mt-4">
                                        <TranscriptionUploader uploadOnly={false} onSummaryGenerated={handleTranscriptionSummaryGenerated} onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
                                    </div>
                                </div>
                            )}

                            {mode === 'text' && (
                                <div>
                                    <textarea className="w-full p-3 rounded bg-white/5 min-h-[140px]" placeholder="Paste notes or text here..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
                                </div>
                            )}

                            <div className="flex gap-3 justify-center items-center">
                                                <label className="text-sm">Questions:</label>
                                <input type="number" min={1} max={50} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-20 p-1 rounded bg-white/5 text-center" />

                                <label className="text-sm ml-4">Difficulty:</label>
                                                <select
                                                    value={difficulty}
                                                    onChange={(e) => setDifficulty(e.target.value as 'easy'|'medium'|'hard')}
                                                    onFocus={() => setDifficultyActive(true)}
                                                    onBlur={() => setDifficultyActive(false)}
                                                       className={`p-1 rounded ${difficultyActive ? 'bg-black/80' : 'bg-transparent'} text-primary`}
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>

                                <Button onClick={handleGenerate} className="ml-4">Generate Quiz</Button>
                            </div>

                            {isLoading && <div className="mt-4 text-sm">Generating quiz — this may take a few seconds...</div>}
                            {error && <div className="mt-4 text-sm text-red-300">Error: {error}</div>}
                        </div>
                    </div>

                    {/* Quiz view */}
                    {questions && (
                        <div className="glass-surface p-6">
                            <div className="mb-3 text-left">
                                <div className="font-medium">Quiz — {questions.length} questions</div>
                                <div className="text-sm text-muted">{submitted ? `Score: ${score}/${questions.length}` : 'Answer questions and submit when ready.'}</div>
                            </div>

                            {!submitted ? (
                                <div>
                                    <div className="mb-4 text-left">
                                        <div className="font-semibold">Question {currentIndex + 1} / {questions.length}</div>
                                        <div className="mt-2">{questions[currentIndex].question}</div>
                                    </div>

                                    <div className="space-y-2 text-left">
                                        {questions[currentIndex].options.map((opt, i) => (
                                            <label key={i} className={`block p-3 rounded cursor-pointer border ${answers[currentIndex] === i ? 'border-blue-500 bg-blue-600/10' : 'border-white/10'}`}>
                                                <input type="radio" name={`q-${currentIndex}`} checked={answers[currentIndex] === i} onChange={() => handleSelectAnswer(i)} className="mr-2" />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 justify-between mt-4">
                                        <div>
                                            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(idx => Math.max(0, idx - 1))} className="px-3 py-1 bg-white/5 rounded">Previous</button>
                                            <button disabled={currentIndex >= questions.length - 1} onClick={() => setCurrentIndex(idx => Math.min(questions.length - 1, idx + 1))} className="ml-2 px-3 py-1 bg-white/5 rounded">Next</button>
                                        </div>

                                        <div>
                                                                    <button
                                                                        onClick={handleSubmitQuiz}
                                                                        disabled={!questions || !questions.every((_, i) => typeof answers[i] === 'number')}
                                                                        className="px-4 py-2 bg-green-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        Submit Quiz
                                                                    </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-left space-y-3">
                                    <div className="font-semibold">Results</div>
                                    {questions.map((q, idx) => (
                                        <div key={idx} className="p-3 rounded bg-white/5">
                                            <div className="font-medium">{idx + 1}. {q.question}</div>
                                            <div className="mt-2 space-y-1">
                                                {q.options.map((opt, i) => {
                                                    const isCorrect = i === q.correctAnswer;
                                                    const isSelected = answers[idx] === i;
                                                    return (
                                                        <div key={i} className={`p-2 rounded ${isCorrect ? 'bg-green-600/20 border border-green-600/40' : isSelected ? 'bg-red-600/10 border border-red-600/30' : ''}`}>
                                                            <span className="mr-2">{String.fromCharCode(65 + i)}.</span>
                                                            <span>{opt}</span>
                                                            {isCorrect && <span className="ml-2 text-sm text-green-300"> (Correct)</span>}
                                                            {(!isCorrect && isSelected) && <span className="ml-2 text-sm text-red-300"> (Your answer)</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="mt-4 text-sm">Final score: <strong>{score}</strong> / {questions.length}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AmbientBackground>
    );
}