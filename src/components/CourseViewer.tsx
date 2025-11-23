import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import CourseService, { type Course } from '../lib/firebase/CourseService';
import SummaryService from '../lib/firebase/SummaryService';
import type { Summary } from '../lib/firebase/SummaryService';
import type { Document } from '../lib/firebase/DocumentService';

interface CourseViewerProps {
  courseId: string;
  onBack: () => void;
}

interface CourseItems {
  summaries: (Summary & { id: string })[];
  documents: (Document & { id: string })[];
}

export default function CourseViewer({ courseId, onBack }: CourseViewerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [items, setItems] = useState<CourseItems>({ summaries: [], documents: [] });
  const [selectedSummary, setSelectedSummary] = useState<(Summary & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourseData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const courseData = await CourseService.getCourse(courseId);
      if (!courseData) {
        setError('Course not found');
        return;
      }
      setCourse(courseData);

      const courseItems = await CourseService.getCourseItems(courseId);
      setItems(courseItems);
    } catch (err) {
      console.error('Error loading course data:', err);
      setError('Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors mb-6"
          >
            ← Back
          </button>
        </div>
        <div className="glass-surface p-8 rounded-2xl text-center">
          <p className="text-muted">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors mb-6"
          >
            ← Back
          </button>
        </div>
        <div className="glass-surface p-8 rounded-2xl">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-200">{error || 'Course not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = items.summaries.length + items.documents.length;
  const hasItems = totalItems > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Compact Course Header */}
      <div className="mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0"
            style={{ backgroundColor: course.color || '#3B82F6' }}
          />
          <h1 className="text-2xl font-bold text-primary">{course.name}</h1>
          <div className="flex gap-6 text-right ml-auto">
            <div>
              <p className="text-muted text-xs">Summaries</p>
              <p className="text-lg font-bold text-primary">{items.summaries.length}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Documents</p>
              <p className="text-lg font-bold text-primary">{items.documents.length}</p>
            </div>
          </div>
        </div>
        {course.description && (
          <p className="text-muted text-sm ml-13">{course.description}</p>
        )}
      </div>

      {/* Content Area */}
      {!hasItems ? (
        <div className="glass-surface p-12 rounded-2xl text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-muted mb-2 text-lg">No items assigned yet</p>
          <p className="text-text-subtle text-sm">Assign notes and documents to this course from your Notes page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
          {/* Items List - Sidebar */}
          <div className="lg:col-span-1 flex flex-col max-h-[60vh] lg:max-h-full">
            <h2 className="text-lg font-semibold text-primary mb-4">Items ({totalItems})</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {items.summaries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Summaries ({items.summaries.length})
                  </p>
                  <div className="space-y-2">
                    {items.summaries.map((summary) => (
                      <button
                        key={summary.id}
                        onClick={() => setSelectedSummary(summary)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedSummary?.id === summary.id
                            ? 'bg-[#3B82F6]/20 border border-[#3B82F6]'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-medium text-sm text-primary truncate">
                          {summary.fileName}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {new Date(summary.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {items.documents.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Documents ({items.documents.length})
                  </p>
                  <div className="space-y-2">
                    {items.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={async () => {
                          // Try to fetch the summary for this document
                          try {
                            const summary = await SummaryService.getSummaryByFileHash(doc.userId, doc.fileHash);
                            if (summary) {
                              const docSummary: Summary & { id: string } = {
                                id: doc.id,
                                userId: doc.userId,
                                fileName: doc.fileName,
                                fileHash: doc.fileHash,
                                fileSize: doc.fileSize,
                                fileType: doc.fileType,
                                summaryText: summary.summaryText,
                                createdAt: doc.uploadedAt,
                                updatedAt: doc.updatedAt,
                              };
                              setSelectedSummary(docSummary);
                            } else {
                              const docSummary: Summary & { id: string } = {
                                id: doc.id,
                                userId: doc.userId,
                                fileName: doc.fileName,
                                fileHash: doc.fileHash,
                                fileSize: doc.fileSize,
                                fileType: doc.fileType,
                                summaryText: 'No summary available for this document.',
                                createdAt: doc.uploadedAt,
                                updatedAt: doc.updatedAt,
                              };
                              setSelectedSummary(docSummary);
                            }
                          } catch (err) {
                            console.error('Error fetching summary for document:', err);
                            const docSummary: Summary & { id: string } = {
                              id: doc.id,
                              userId: doc.userId,
                              fileName: doc.fileName,
                              fileHash: doc.fileHash,
                              fileSize: doc.fileSize,
                              fileType: doc.fileType,
                              summaryText: 'Error loading summary for this document.',
                              createdAt: doc.uploadedAt,
                              updatedAt: doc.updatedAt,
                            };
                            setSelectedSummary(docSummary);
                          }
                        }}
                        className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <p className="font-medium text-sm text-primary truncate">
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {(doc.fileSize / 1024).toFixed(2)} KB
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Display */}
          <div className="lg:col-span-3 flex flex-col">
            {selectedSummary ? (
              <div className="glass-surface p-6 rounded-2xl flex flex-col h-full">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {selectedSummary.fileName}
                </h3>
                <div className="bg-white/5 rounded-lg p-6 markdown-content flex-1 overflow-y-auto">
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
                    {'summaryText' in selectedSummary
                      ? selectedSummary.summaryText
                      : 'No content available'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="glass-surface p-12 rounded-2xl flex items-center justify-center flex-1">
                <p className="text-muted text-center">
                  Select an item from the list to view its content
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
