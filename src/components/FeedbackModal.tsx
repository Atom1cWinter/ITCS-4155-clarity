interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  message: string;
  onMessageChange: (message: string) => void;
  error: string | null;
  success: boolean;
  isSubmitting: boolean;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  onSend,
  message,
  onMessageChange,
  error,
  success,
  isSubmitting,
}: FeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-surface p-8 rounded-2xl max-w-2xl w-full">
        <h2 className="text-3xl font-semibold text-primary text-center mb-6">Send Feedback</h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-green-200 text-sm">Thank you for your feedback! We'll review it soon.</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-muted mb-3">
            Your Message
          </label>
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Tell us what you think about Clarity..."
            className="w-full h-32 p-4 bg-white/5 border border-white/20 rounded-lg resize-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
            disabled={isSubmitting}
          />
          <p className="text-text-subtle text-xs mt-2">
            Your feedback will be sent to our team at bwithe10@charlotte.edu
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={isSubmitting || !message.trim()}
            className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
