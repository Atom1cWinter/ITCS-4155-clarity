import type { ReactNode } from 'react';

interface AmbientBackgroundProps {
  children: ReactNode;
}

/**
 * AmbientBackground - Cinematic background with multiple gradient ellipses
 * Creates soft, overlapping glows with blue tint for depth and atmosphere
 * Used across all logged-in pages for visual consistency
 */
export default function AmbientBackground({ children }: AmbientBackgroundProps) {
  return (
    <div className="fixed inset-0 w-full h-full overflow-auto bg-[#0B0F1A]">
      {/* Gradient Ellipse Glows - Multiple discrete blurry circles */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top-left glow - Primary blue */}
        <div
          className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] opacity-20"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2F81AE 100%)',
            filter: 'blur(100px)',
            transform: 'translateZ(0)', // GPU acceleration
          }}
        />
        
        {/* Top-right glow - Violet accent */}
        <div
          className="absolute -top-1/3 right-1/4 w-[700px] h-[700px] opacity-15"
          style={{
            background: 'linear-gradient(225deg, #5C3EBC 0%, #3B82F6 100%)',
            filter: 'blur(110px)',
            transform: 'translateZ(0)',
          }}
        />
        
        {/* Mid-right glow - Brand blue */}
        <div
          className="absolute top-1/2 -right-1/4 w-[750px] h-[750px] opacity-18"
          style={{
            background: 'linear-gradient(180deg, #2F81AE 0%, #3B82F6 100%)',
            filter: 'blur(105px)',
            transform: 'translateZ(0)',
          }}
        />
        
        {/* Bottom-left glow - Soft violet */}
        <div
          className="absolute -bottom-1/4 left-1/3 w-[650px] h-[650px] opacity-12"
          style={{
            background: 'linear-gradient(45deg, #5C3EBC 0%, #2F81AE 100%)',
            filter: 'blur(95px)',
            transform: 'translateZ(0)',
          }}
        />
        
        {/* Center ambient glow - Subtle depth */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[900px] opacity-10"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #5C3EBC 100%)',
            filter: 'blur(120px)',
            transform: 'translate(-50%, 0) translateZ(0)',
          }}
        />
      </div>
      
      {/* Blue tint overlay - Unifies the scene */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 15, 26, 0.3) 100%)',
          backdropFilter: 'blur(2px)', // Subtle global blur to melt edges
        }}
      />
      
      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
