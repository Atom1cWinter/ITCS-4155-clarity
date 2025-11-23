import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import AmbientBackground from '../components/AmbientBackground';
import TextSummaryService from '../lib/openai/TextSummaryService';
import TranscriptionUploader from '../components/TranscriptionUploader';
import DebugInfo from '../components/DebugInfo';
import SimpleTest from '../components/SimpleTest';
import SummaryService from '../lib/firebase/SummaryService';
import DocumentService from '../lib/firebase/DocumentService';
import CourseService, { type Course } from '../lib/firebase/CourseService';
import type { Document } from '../lib/firebase/DocumentService';
import type { Summary } from '../lib/firebase/SummaryService';
import ProgressBar from '../components/ProgressBar';
import { generateFileHash, generateTextHash } from '../lib/firebase/FileHashService';
import { auth } from '../lib/firebase';
import FileUpload from '../components/FileUpload';
import CourseModal from '../components/CourseModal';
import CourseSelector from '../components/CourseSelector';
import CourseViewer from '../components/CourseViewer';
import SearchBar from '../components/SearchBar';
import HighlightedText from '../components/HighlightedText';
import { searchItems } from '../lib/SearchService';

export default function NotesPage() {
  // Original state
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'existing' | 'upload' | 'text'>('existing');
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [progress, setProgress] = useState(0);
  const [docUploadMessage, setDocUploadMessage] = useState<string | null>(null);

  // Course organization state
  const [viewMode, setViewMode] = useState<'all' | 'byCourse'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorItemId, setSelectorItemId] = useState<string | null>(null);
  const [selectorItemName, setSelectorItemName] = useState('');
  const [selectorItemType, setSelectorItemType] = useState<'summary' | 'document'>('summary');
  const [isAssigning, setIsAssigning] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // Load previous files (documents) for the user
  const [previousFiles, setPreviousFiles] = useState<Document[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadPreviousFiles = async () => {
      try {
        setLoadingPrevious(true);
        const docs = await DocumentService.getUserDocuments(userId);
        // sort newest first
        docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setPreviousFiles(docs);
      } catch (err) {
        console.error('NotesPage: failed to load previous files', err);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousFiles();
  }, [userId, refreshTrigger]);

  // Load courses for the user
  useEffect(() => {
    if (!userId) {
      setCourses([]);
      return;
    }

    const loadCourses = async () => {
      try {
        const userCourses = await CourseService.getUserCourses(userId);
        setCourses(userCourses);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };

    loadCourses();
  }, [userId, refreshTrigger]);

  const handleSelectPreviousSummary = (prevSummary: Summary) => {
    setSummary(prevSummary.summaryText);
    setInputText('');
    setError(null);
  };

  // When the user clicks an uploaded document, try to load its saved summary (if any)
  const handleSelectDocument = async (doc: Document) => {
    setError(null);
    if (!userId) {
      setError('Sign in to load saved summaries');
      return;
    }

    try {
      const existing = await SummaryService.getSummaryByFileHash(userId, doc.fileHash);
      if (existing) {
        handleSelectPreviousSummary(existing);
      } else {
        setError('No saved summary found for this document. You can upload or transcribe to create one.');
      }
    } catch (err) {
      console.error('Failed to fetch summary for document:', err);
      setError('Failed to fetch summary for document');
    }
  };

  // Document deletion removed from NotesPage UI per request (only UploadPage supports delete)

  

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
    setProgress(0);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    try {
      const result = await TextSummaryService.summarizeText(inputText);
      setProgress(85);
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
        setProgress(100);
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
      clearInterval(progressInterval);
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleTranscriptionSummaryGenerated = async (result: string, file: File | null) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    try {
      setProgress(85);
      setSummary(result);

      // Save summary to Firestore
      try {
        let fileHash = '';
        if (file) {
          fileHash = await generateFileHash(file);
        } else {
          fileHash = 'remote-url-' + Date.now();
        }

        await SummaryService.saveSummary({
          userId,
          fileName: file ? file.name : `Transcription ${new Date().toLocaleString()}`,
          fileHash,
          fileSize: file ? file.size : result.length,
          fileType: file ? file.type || 'unknown' : 'remote',
          summaryText: result,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Also save as a document for the Upload page (best-effort)
        try {
          if (file) {
            await DocumentService.uploadDocument({
              userId,
              fileName: file.name,
              fileHash,
              fileSize: file.size,
              fileType: file.type || 'unknown',
              uploadedAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (docError) {
          console.error('Error saving document:', docError);
        }

        setProgress(100);
        setRefreshTrigger(prev => prev + 1);
      } catch (dbError) {
        console.error('Error saving summary to Firestore:', dbError);
        const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
        setError(`Note: Summary generated but storage failed. Check browser console: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Transcription/summary handling error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to handle transcription summary: ${errorMessage}`);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Handle file upload -> auto-generate summary
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!userId) {
      setDocUploadMessage('Sign in to save documents and summaries');
    }

    setError(null);
    setProgress(0);
    setDocUploadMessage(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    try {
      const fileHash = await generateFileHash(file);
      const existingSummary = userId ? await SummaryService.getSummaryByFileHash(userId, fileHash) : null;

      if (existingSummary) {
        setSummary(existingSummary.summaryText);
        setDocUploadMessage(`Using existing summary for ${existingSummary.fileName}`);
      } else {
        const result = await TextSummaryService.summarizeFromFile(file);
        setSummary(result);

        if (userId) {
          try {
            await SummaryService.saveSummary({
              userId,
              fileName: file.name,
              fileHash,
              fileSize: file.size,
              fileType: file.type || 'unknown',
              summaryText: result,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            await DocumentService.uploadDocument({
              userId,
              fileName: file.name,
              fileHash,
              fileSize: file.size,
              fileType: file.type || 'unknown',
              uploadedAt: new Date(),
              updatedAt: new Date(),
            });
          } catch (dbErr) {
            console.error('Failed to persist summary/document for uploaded file:', dbErr);
          }
        }

        setDocUploadMessage(`Generated summary for ${file.name}`);
      }

      setRefreshTrigger(prev => prev + 1);
      setProgress(100);
    } catch (err) {
      console.error('Failed to auto-generate summary from uploaded file:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to generate summary from file');
      setDocUploadMessage('Failed to generate summary');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Course handling functions
  const handleOpenCourseModal = () => {
    setIsCourseModalOpen(true);
  };

  const handleCourseCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOpenAssignSelector = (itemId: string, itemName: string, itemType: 'summary' | 'document') => {
    setSelectorItemId(itemId);
    setSelectorItemName(itemName);
    setSelectorItemType(itemType);
    setIsSelectorOpen(true);
  };

  const handleAssignCourse = async (courseId: string) => {
    if (!selectorItemId) return;

    setIsAssigning(true);
    try {
      await CourseService.assignItemToCourse(
        userId!,
        selectorItemId,
        selectorItemType,
        courseId
      );
      setIsSelectorOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error assigning item to course:', err);
      setError('Action failed. Please try again later.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Search handler
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setSearchError(null);
  };

  // Get filtered results
  const getFilteredResults = () => {
    try {
      const allSummaries = previousFiles
        .filter(doc => doc.id)
        .map(doc => ({
          id: doc.id!,
          fileName: doc.fileName,
          fileHash: doc.fileHash,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          userId: doc.userId,
          summaryText: '', // Documents don't have summary text in this context
          createdAt: doc.uploadedAt,
          updatedAt: doc.updatedAt,
        }));

      const filteredDocs = previousFiles.filter(doc => doc.id) as (Document & { id: string })[];

      const results = searchItems(searchTerm, allSummaries, filteredDocs);
      return results;
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Search failed. Please check your connection and try again.');
      return { summaries: [], documents: [] };
    }
  };

  return (
    <AmbientBackground>
      <ProgressBar 
        progress={progress} 
        isVisible={isLoading} 
        label="Generating summary..."
      />
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

        {/* View Mode Toggle - All Notes vs By Course */}
        {userId && (
          <div className="glass-surface p-4 rounded-lg flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              All Notes
            </button>
            {courses.length > 0 && (
              <button
                onClick={() => setViewMode('byCourse')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'byCourse'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                By Course
              </button>
            )}
            <button
              onClick={handleOpenCourseModal}
              className="px-4 py-2 bg-green-500/20 text-green-200 rounded-lg hover:bg-green-500/30 transition-colors font-medium"
            >
              + Add Course
            </button>
          </div>
        )}

        {/* Course Not Found - Empty State */}
        {userId && courses.length === 0 && viewMode === 'byCourse' && (
          <div className="glass-surface p-12 rounded-2xl text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg text-muted mb-2">You haven't organized your notes yet.</p>
            <p className="text-text-subtle text-sm mb-6">Create a course or topic to begin organizing your study materials.</p>
            <button
              onClick={handleOpenCourseModal}
              className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium"
            >
              + Add Course or Topic
            </button>
          </div>
        )}

        {/* By Course View */}
        {viewMode === 'byCourse' && courses.length > 0 && !selectedCourseId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className="glass-surface p-6 rounded-2xl text-left hover:bg-white/15 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: course.color || '#3B82F6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-primary mb-1">
                      {course.name}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-muted truncate mb-3">
                        {course.description}
                      </p>
                    )}
                    <p className="text-xs text-text-subtle">
                      {course.itemCount} item{course.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Course Viewer */}
        {viewMode === 'byCourse' && selectedCourseId && (
          <div>
            <CourseViewer
              courseId={selectedCourseId}
              onBack={() => setSelectedCourseId(null)}
            />
          </div>
        )}

        {/* All Notes View - Original Functionality */}
        {viewMode === 'all' && (
          <>
        {/* Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          error={searchError}
        />

        {/* "Your Documents" is shown within the Mode = Existing section below */}

        {/* Mode Toggle (use same style/behavior as Quizzes page) */}
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
                        {(() => {
                          const filtered = searchTerm ? getFilteredResults() : { summaries: [], documents: previousFiles };
                          const documentsToShow = searchTerm ? filtered.documents : previousFiles;

                          if (searchTerm && documentsToShow.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-muted">No results found for '<strong>{searchTerm}</strong>'. Try a different keyword.</p>
                              </div>
                            );
                          }

                          return documentsToShow.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10">
                              <button onClick={() => handleSelectDocument(file)} className="text-left flex-1">
                                <div className="font-medium">
                                  <HighlightedText text={file.fileName} searchTerm={searchTerm} />
                                </div>
                                <div className="text-xs text-muted">{(file.fileSize / 1024).toFixed(2)} KB • {new Date(file.uploadedAt).toLocaleDateString()}</div>
                              </button>
                              {userId && courses.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignSelector(file.id!, file.fileName, 'document');
                                  }}
                                  className="ml-2 px-3 py-1 text-xs bg-blue-500/20 text-blue-200 rounded hover:bg-blue-500/30 transition-colors"
                                  title="Assign to course"
                                >
                                  📌
                                </button>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-500/10 rounded">Sign in to access your previous notes. You can also paste text or upload a file.</div>
                )}
              </div>
            )}

            {mode === 'upload' && (
              <div>
                <div className="mb-4">
                  <FileUpload onFileSelect={(f) => { handleFileUpload(f); setDocUploadMessage(null); }} />
                  {docUploadMessage && (
                    <div className="mt-3">
                      <div className="text-primary mb-2">{docUploadMessage}</div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <TranscriptionUploader uploadOnly={false} onSummaryGenerated={handleTranscriptionSummaryGenerated} onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
                </div>
              </div>
            )}

            {mode === 'text' && (
              <div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste notes or text here..."
                  className="w-full p-3 rounded bg-white/5 min-h-[140px]"
                />
                <div className="flex gap-3 justify-center items-center mt-3">
                  <button onClick={handleSummarizeFromText} className="px-4 py-2 bg-[#3B82F6] rounded text-white disabled:opacity-50" disabled={isLoading || !inputText.trim()}>{isLoading ? 'Generating...' : 'Generate Summary'}</button>
                </div>
              </div>
            )}

            {isLoading && <div className="mt-4 text-sm">Generating summary — this may take a few seconds...</div>}
            {error && <div className="mt-4 text-sm text-red-300">Error: {error}</div>}
          </div>
        </div>

            {/* Error Display - inside all view */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {/* Summary Display - inside all view */}
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
          </>
        )}
      </div>
    </div>

    {/* Modals */}
    {userId && (
      <>
        <CourseModal
          isOpen={isCourseModalOpen}
          onClose={() => setIsCourseModalOpen(false)}
          onCourseCreated={handleCourseCreated}
          userId={userId}
        />
        <CourseSelector
          isOpen={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          onAssign={handleAssignCourse}
          userId={userId}
          itemName={selectorItemName}
          isSubmitting={isAssigning}
        />
      </>
    )}
    </AmbientBackground>
  );
}