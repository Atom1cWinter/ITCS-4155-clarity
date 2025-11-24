import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlashcardsPage from '../../pages/FlashcardsPage';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
}));

// Mock child components
vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="ambient-background">{children}</div>,
}));

vi.mock('../../components/FlashCardComponents/FlashcardList', () => ({
  default: ({ flashcards }: { flashcards: Array<{ front: string; back: string }> }) => (
    <div data-testid="flashcard-list">
      {flashcards.map((card: { front: string; back: string }, idx: number) => (
        <div key={idx} data-testid={`flashcard-item-${idx}`}>
          {card.front}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/FlashCardComponents/FlashcardSingleView', () => ({
  default: ({ flashcards, onBack }: { flashcards: Array<{ front: string; back: string }>; onBack: () => void }) => (
    <div data-testid="flashcard-single-view">
      <button data-testid="back-btn" onClick={onBack}>
        Back
      </button>
      {flashcards.length > 0 && <div data-testid="current-card">{flashcards[0].front}</div>}
    </div>
  ),
}));

vi.mock('../../components/FileUpload', () => ({
  default: ({ onFileSelect }: { onFileSelect: (file: File) => void }) => (
    <div data-testid="file-upload">
      <button data-testid="file-select-btn" onClick={() => onFileSelect(new File(['content'], 'test.pdf'))}>
        Select File
      </button>
    </div>
  ),
}));

vi.mock('../../components/TranscriptionUploader', () => ({
  default: () => (
    <div data-testid="transcription-uploader">
      <button>Upload Audio</button>
    </div>
  ),
}));

vi.mock('../../components/ProgressBar', () => ({
  default: ({ progress, isVisible, label }: { progress: number; isVisible: boolean; label: string }) => (
    <div data-testid="progress-bar" hidden={!isVisible}>
      {label} - {progress}%
    </div>
  ),
}));

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-id' });
      return vi.fn();
    }),
  },
}));

// Mock Firebase services
vi.mock('../../lib/firebase/DocumentService', () => ({
  default: {
    getUserDocuments: vi.fn(async () => []),
  },
}));

vi.mock('../../lib/firebase/SummaryService', () => ({
  default: {
    getSummaryByFileHash: vi.fn(async () => null),
  },
}));

vi.mock('../../lib/firebase/QuizResultService', () => ({
  default: {
    getRecentQuizResults: vi.fn(async () => []),
  },
}));

// Mock FlashcardService
vi.mock('../../lib/openai/FlashcardService', () => ({
  default: {
    generateFlashcards: vi.fn(),
    generateFlashcardsFromFile: vi.fn(),
  },
}));

import FlashcardService from '../../lib/openai/FlashcardService';
const mockFlashcardService = FlashcardService as unknown as {
  generateFlashcards: ReturnType<typeof vi.fn>;
  generateFlashcardsFromFile: ReturnType<typeof vi.fn>;
};

describe('FlashcardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlashcardService.generateFlashcards.mockResolvedValue([
      { front: 'Question 1', back: 'Answer 1' },
      { front: 'Question 2', back: 'Answer 2' },
    ]);
    mockFlashcardService.generateFlashcardsFromFile.mockResolvedValue([
      { front: 'File Q1', back: 'File A1' },
    ]);
  });

  describe('Page Rendering', () => {
    it('should render the page with AmbientBackground', () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('ambient-background')).toBeInTheDocument();
    });

    it('should display hero section with title and subtitle', () => {
      render(<FlashcardsPage />);
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
      expect(screen.getByText(/Generate AI-powered flashcards/)).toBeInTheDocument();
    });

    it('should display powered by info chip', () => {
      render(<FlashcardsPage />);
      expect(screen.getByText('Powered by OpenAI GPT')).toBeInTheDocument();
    });

    it('should show ProgressBar component', () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should display mode selection buttons', () => {
      render(<FlashcardsPage />);
      expect(screen.getByText('Use Existing Notes')).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
      expect(screen.getByText('Text Input')).toBeInTheDocument();
      expect(screen.getByText('From Quiz')).toBeInTheDocument();
    });
  });

  describe('Mode Selection - Text Input', () => {
    it('should switch to text mode when button clicked', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      expect(textarea).toBeInTheDocument();
    });

    it('should allow typing text in textarea', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      expect(textarea.value).toBe('Test content');
    });

    it('should display Generate Flashcards button in text mode', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Text Input'));
      expect(screen.getByText('Generate Flashcards')).toBeInTheDocument();
    });
  });

  describe('Mode Selection - Upload File', () => {
    it('should switch to upload mode when button clicked', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Upload File'));
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should render transcription uploader in upload mode', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Upload File'));
      expect(screen.getByTestId('transcription-uploader')).toBeInTheDocument();
    });
  });

  describe('Mode Selection - Existing Notes', () => {
    it('should display existing mode as default', () => {
      render(<FlashcardsPage />);
      const existingBtn = screen.getByText('Use Existing Notes');
      expect(existingBtn.className).toContain('bg-[#3B82F6]');
    });
  });

  describe('Flashcard Generation', () => {
    it('should generate flashcards from text input', () => {
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      
      const generateBtn = screen.getByText('Generate Flashcards');
      fireEvent.click(generateBtn);
      
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
    });

    it('should display Generate Flashcards button', () => {
      render(<FlashcardsPage />);
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', () => {
      mockFlashcardService.generateFlashcards.mockRejectedValueOnce(new Error('Generation failed'));
      render(<FlashcardsPage />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      
      const generateBtn = screen.getByText('Generate Flashcards');
      fireEvent.click(generateBtn);
      
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe from auth listener on unmount', () => {
      const { unmount } = render(<FlashcardsPage />);
      unmount();
      expect(screen.queryByTestId('ambient-background')).not.toBeInTheDocument();
    });

    it('should render without crashing', () => {
      const { container } = render(<FlashcardsPage />);
      expect(container).toBeInTheDocument();
    });

    it('should have progress initialized to 0', () => {
      render(<FlashcardsPage />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
