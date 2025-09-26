import { useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
}

export default function FileUpload({ 
  onFileSelect, 
  acceptedTypes = ".txt,.pdf,.html,.jpg,.jpeg,.png,.gif",
  maxSize = 10 
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive 
            ? 'border-[#A9A5FD] bg-[#A9A5FD]/10' 
            : 'border-white/30 hover:border-white/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          onChange={handleChange}
        />
        
        <div className="text-white/60 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>Drag and drop your file here, or</p>
        </div>
        
        <button
          onClick={onButtonClick}
          className="px-6 py-2 bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] text-black font-semibold rounded-xl hover:brightness-110 transition"
        >
          Choose File
        </button>
        
        <p className="text-white/40 text-sm mt-2">
          Supports: TXT, PDF, HTML, Images (Max {maxSize}MB)
        </p>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}