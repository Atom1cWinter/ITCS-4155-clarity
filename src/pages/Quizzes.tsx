import { useState, useEffect } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import FileUpload from '../components/FileUpload';
import Button from '../components/Button';
import UploadedFilesHistory from '../components/UploadedFilesHistory';
import type { Document } from '../lib/firebase/DocumentService';
import ProgressBar from '../components/ProgressBar';
import QuizService from '../lib/openai/QuizService';
import { auth } from '../lib/firebase';
import type { Summary } from '../lib/firebase/SummaryService';
import ContentService from '../lib/firebase/ContentService';

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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
        const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
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
    const [savingQuiz, setSavingQuiz] = useState(false);
    const [savedQuizId, setSavedQuizId] = useState<string | null>(null);

    const userId = auth.currentUser?.uid || '';

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

                    if (mode === 'upload' && selectedFile) {
                const qs = await QuizService.generateQuizFromFile(selectedFile, options);
                setProgress(85);
                setQuestions(qs);
                    } else if (mode === 'existing' && selectedSummary) {
                        const qs = await QuizService.generateQuiz(selectedSummary.summaryText || '', options);
                setProgress(85);
                setQuestions(qs);
            } else if (mode === 'text' && pastedText.trim().length > 0) {
                const qs = await QuizService.generateQuiz(pastedText, options);
                setProgress(85);
                setQuestions(qs);
            } else {
                setError('Please provide a file, pick an existing note, or paste text to generate a quiz.');
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

        const handleSaveQuiz = async () => {
            if (!userId) {
                setError('Sign in to save quizzes to your profile.');
                return;
            }
            if (!questions) {
                setError('No quiz to save.');
                return;
            }

            try {
                setSavingQuiz(true);
                setSavedQuizId(null);
                        const id = await ContentService.saveContent(userId, 'quizzes', {
                            title: `Quiz — ${new Date().toLocaleString()}`,
                            questions,
                            numQuestions: questions.length,
                            score,
                        });
                setSavedQuizId(id);
                setError(null);
            } catch (err) {
                console.error('Failed to save quiz', err);
                setError('Failed to save quiz');
            } finally {
                setSavingQuiz(false);
            }
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
            <div className="w-full h-full grid place-items-center px-6 py-10">
                <div className="text-center max-w-3xl w-full">
                    <h1 className="hero-title mb-4">Quizzes</h1>
                    <p className="hero-subtitle mb-6">Generate AI-powered multiple-choice quizzes from your notes or uploads.</p>

                    {/* Info Chip */}
                    <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted mb-6">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Powered by OpenAI GPT</span>
                    </div>

                    <div className="glass-surface p-6 mb-6">
                        <div className="flex gap-3 justify-center mb-4">
                            <button onClick={() => setMode('existing')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='existing' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Use Existing Notes</button>
                            <button onClick={() => setMode('upload')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='upload' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Upload File</button>
                            <button onClick={() => setMode('text')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode==='text' ? 'bg-[#3B82F6] text-white' : 'bg-white/10 hover:bg-[#3B82F6] text-white'}`}>Paste Text</button>
                        </div>

                        <div className="space-y-4">
                            {mode === 'existing' && (
                                <div>
                                    {userId ? (
                                        <UploadedFilesHistory userId={userId} onSelectDocument={(d: Document) => {
                                            // select an uploaded document; we can't automatically re-run generation
                                            // without the raw file object. Store a lightweight selection for now.
                                            setSelectedSummary(null);
                                            setError(null);
                                            // Use the selected file's metadata as a hint in the UI
                                            const summaryObj = {
                                                id: d.id,
                                                userId: d.userId,
                                                fileName: d.fileName,
                                                fileHash: d.fileHash,
                                                fileSize: d.fileSize,
                                                fileType: d.fileType,
                                                summaryText: `Selected uploaded file: ${d.fileName} — to re-generate a quiz from the original file, please re-upload it on the Uploads page.`,
                                                createdAt: d.uploadedAt,
                                                updatedAt: d.updatedAt,
                                            };
                                            setSelectedSummary(summaryObj as Summary);
                                        }} />
                                    ) : (
                                        <div className="p-4 bg-yellow-500/10 rounded">Sign in to access your previous uploads. You can also paste text or upload a file.</div>
                                    )}
                                    {selectedSummary && (
                                        <div className="mt-3 p-3 bg-white/5 rounded text-left">
                                            <div className="font-medium">Selected: {selectedSummary.fileName}</div>
                                            <div className="text-sm text-muted mt-1 truncate">{(selectedSummary.summaryText || '').slice(0, 200)}{(selectedSummary.summaryText || '').length > 200 ? '...' : ''}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === 'upload' && (
                                <div>
                                    <FileUpload onFileSelect={(f) => setSelectedFile(f)} />
                                    {selectedFile && (
                                        <div className="mt-3 p-3 bg-white/5 rounded text-left">
                                            <div className="font-medium">Selected file: {selectedFile.name}</div>
                                            <div className="text-sm text-muted">{selectedFile.type || 'unknown type'} — {(selectedFile.size/1024/1024).toFixed(2)} MB</div>
                                        </div>
                                    )}
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
                            <div className="mb-3 flex items-start justify-between">
                                        <div>
                                            <div className="font-medium">Quiz — {questions.length} questions</div>
                                            <div className="text-sm text-muted">{submitted ? `Score: ${score}/${questions.length}` : 'Answer questions and submit when ready.'}</div>
                                        </div>
                                        <div>
                                            {submitted ? (
                                                userId ? (
                                                    <button onClick={handleSaveQuiz} disabled={savingQuiz} className="px-4 py-2 bg-green-600 rounded text-white disabled:opacity-50">
                                                        {savingQuiz ? 'Saving...' : 'Save Quiz'}
                                                    </button>
                                                ) : (
                                                    <div className="text-sm text-muted">Sign in to save this quiz</div>
                                                )
                                            ) : null}
                                            {savedQuizId && <div className="text-sm text-green-300">Saved ✓</div>}
                                        </div>
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
                                    <div className="mt-3 flex items-center gap-3">
                                        {userId ? (
                                            <button onClick={handleSaveQuiz} disabled={savingQuiz} className="px-3 py-1 bg-green-600 rounded text-white disabled:opacity-50">
                                                {savingQuiz ? 'Saving...' : 'Save Quiz'}
                                            </button>
                                        ) : (
                                            <div className="text-sm text-muted">Sign in to save this quiz</div>
                                        )}
                                        {savedQuizId && <div className="text-sm text-green-300">Saved ✓</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AmbientBackground>
    );
}