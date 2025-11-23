interface ProgressBarProps {
  progress: number; // 0-100
  isVisible: boolean;
  label?: string;
}

export default function ProgressBar({ progress, isVisible, label }: ProgressBarProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/30 shadow-2xl max-w-md w-full mx-4">
        <div className="space-y-4">
          {label && (
            <p className="text-center text-primary font-semibold">{label}</p>
          )}
          
          {/* Outer container */}
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/20">
            {/* Inner progress bar with gradient */}
            <div
              className="h-full bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] rounded-full shadow-lg shadow-blue-500/50 transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {/* Percentage text */}
          <div className="text-center">
            <p className="text-sm text-muted">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
