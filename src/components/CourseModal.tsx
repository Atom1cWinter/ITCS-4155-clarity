import { useState } from 'react';
import CourseService from '../lib/firebase/CourseService';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated: (courseId: string, name: string) => void;
  userId: string;
  mode?: 'create' | 'edit';
  initialCourseName?: string;
  initialCourseId?: string;
}

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Amber
];

export default function CourseModal({
  isOpen,
  onClose,
  onCourseCreated,
  userId,
  mode = 'create',
  initialCourseName = '',
  initialCourseId = '',
}: CourseModalProps) {
  const [courseName, setCourseName] = useState(initialCourseName);
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!courseName.trim()) {
      setError('Course name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const courseId = await CourseService.createCourse(
          userId,
          courseName,
          description,
          selectedColor
        );
        setSuccess(true);
        setCourseName('');
        setDescription('');
        setSelectedColor(COLORS[0]);

        // Close modal after brief success message
        setTimeout(() => {
          onCourseCreated(courseId, courseName);
          onClose();
          setSuccess(false);
        }, 1000);
      } else if (mode === 'edit' && initialCourseId) {
        await CourseService.updateCourse(initialCourseId, {
          name: courseName,
          description,
          color: selectedColor,
        });
        setSuccess(true);
        setTimeout(() => {
          onCourseCreated(initialCourseId, courseName);
          onClose();
          setSuccess(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Error handling course:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save course';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-surface p-8 rounded-2xl max-w-md w-full">
        <h3 className="text-2xl font-semibold text-primary mb-6">
          {mode === 'create' ? 'Add Course or Topic' : 'Edit Course'}
        </h3>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-green-200 text-sm">
              {mode === 'create' ? 'Course created successfully!' : 'Course updated successfully!'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name Input */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Course or Topic Name
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder='e.g., "ITCS 3112" or "Linear Algebra"'
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
              disabled={isSubmitting}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or details about this course..."
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Color (Optional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-full h-10 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-white'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !courseName.trim()}
              className="flex-1 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
