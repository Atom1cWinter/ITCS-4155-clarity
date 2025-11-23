import { useState, useEffect, useCallback } from 'react';
import CourseService, { type Course } from '../lib/firebase/CourseService';

interface CourseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (courseId: string, courseName: string) => void;
  userId: string;
  itemName: string;
  isSubmitting?: boolean;
}

export default function CourseSelector({
  isOpen,
  onClose,
  onAssign,
  userId,
  itemName,
  isSubmitting = false,
}: CourseSelectorProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCourses = await CourseService.getUserCourses(userId);
      setCourses(userCourses);
      if (userCourses.length > 0) {
        setSelectedCourseId(userCourses[0].id);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadCourses();
    }
  }, [isOpen, userId, loadCourses]);

  const handleSubmit = () => {
    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    const course = courses.find((c) => c.id === selectedCourseId);
    if (course) {
      onAssign(selectedCourseId, course.name);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-surface p-8 rounded-2xl max-w-md w-full">
        <h3 className="text-2xl font-semibold text-primary mb-2">
          Assign to Course
        </h3>
        <p className="text-muted text-sm mb-6">
          Assigning "{itemName}" to a course
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-muted">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-8 text-center bg-white/5 rounded-lg">
            <p className="text-muted mb-4">No courses created yet.</p>
            <p className="text-text-subtle text-sm">Create a course first to assign items.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {courses.map((course) => (
              <label
                key={course.id}
                className="flex items-center p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-white/10 hover:border-white/20"
              >
                <input
                  type="radio"
                  name="course"
                  value={course.id}
                  checked={selectedCourseId === course.id}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isSubmitting}
                  className="mr-3"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-primary truncate">
                    {course.name}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {course.itemCount} item{course.itemCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 ml-3"
                  style={{ backgroundColor: course.color || '#3B82F6' }}
                />
              </label>
            ))}
          </div>
        )}

        {courses.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedCourseId}
              className="flex-1 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
