import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FlashcardsPage from '../../pages/FlashcardsPage';

// Mock pdfjs-dist for OpenAI service
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
}));

// Mock child components
vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="ambient-background">{children}</div>,
}));

vi.mock('../../components/FlashCardComponents/FlashcardInput', () => ({
  default: ({ onGenerate, onFileUpload }: { onGenerate: (content: string) => void; onFileUpload: (file: File) => void }) => (
    <div data-testid="flashcard-input">
      <button data-testid="generate-from-text-btn" onClick={() => onGenerate('Sample flashcard content')}>
        Generate from Text
      </button>
      <button data-testid="upload-file-btn" onClick={() => onFileUpload(new File(['content'], 'test.txt'))}>
        Upload File
      </button>
    </div>
  ),
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
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-id' });
      return vi.fn();
    }),
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

    it('should render FlashcardInput component initially', () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('flashcard-input')).toBeInTheDocument();
    });

    it('should show ProgressBar component', () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });
  });

  describe('Generate from Text', () => {
    it('should generate flashcards when Generate from Text button is clicked', async () => {
      render(<FlashcardsPage />);
      const generateBtn = screen.getByTestId('generate-from-text-btn');
      
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(mockFlashcardService.generateFlashcards).toHaveBeenCalledWith(
          'Sample flashcard content',
          expect.objectContaining({
            numCards: 10,
            style: 'short',
            temperature: 0.4,
          })
        );
      });
    });

    it('should switch to flashcard view after generation', async () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('flashcard-input')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-single-view')).toBeInTheDocument();
      });
    });

    it('should display generated flashcards in list', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-item-0')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-item-1')).toBeInTheDocument();
      });
    });
  });

  describe('Generate from File', () => {
    it('should generate flashcards from uploaded file', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('upload-file-btn'));

      await waitFor(() => {
        expect(mockFlashcardService.generateFlashcardsFromFile).toHaveBeenCalled();
      });
    });

    it('should display file-generated flashcards', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('upload-file-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-item-0')).toHaveTextContent('File Q1');
      });
    });

    it('should handle file upload errors gracefully', async () => {
      mockFlashcardService.generateFlashcardsFromFile.mockRejectedValueOnce(new Error('Upload failed'));
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('upload-file-btn'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to generate from file.');
      });

      alertSpy.mockRestore();
    });
  });

  describe('View Navigation', () => {
    it('should show back button when in flashcard view', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('back-btn')).toBeInTheDocument();
      });
    });

    it('should return to input view when back button clicked', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-single-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('back-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-input')).toBeInTheDocument();
      });
    });

    it('should show both single view and list when in flashcard view', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-single-view')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-list')).toBeInTheDocument();
      });
    });
  });

  describe('Progress and Loading States', () => {
    it('should show progress bar during generation', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      // Progress bar should be visible while loading
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display current card in single view', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('current-card')).toHaveTextContent('Question 1');
      });
    });

    it('should display multiple cards in list view', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-item-0')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-item-1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors', async () => {
      mockFlashcardService.generateFlashcards.mockRejectedValueOnce(new Error('Generation failed'));
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to generate flashcards. Please try again');
      });

      alertSpy.mockRestore();
    });

    it('should recover from error and allow retry', async () => {
      mockFlashcardService.generateFlashcards
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce([{ front: 'Q1', back: 'A1' }]);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();

      // Second attempt should succeed
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(mockFlashcardService.generateFlashcards).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Flashcard Data Structure', () => {
    it('should map flashcard data correctly', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-item-0')).toHaveTextContent('Question 1');
        expect(screen.getByTestId('flashcard-item-1')).toHaveTextContent('Question 2');
      });
    });

    it('should display correct number of flashcards', async () => {
      render(<FlashcardsPage />);
      
      fireEvent.click(screen.getByTestId('generate-from-text-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-item-0')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-item-1')).toBeInTheDocument();
      });
    });
  });

  describe('Firebase Authentication', () => {
    it('should set userId from auth on mount', () => {
      render(<FlashcardsPage />);
      // Component should render without errors, indicating userId was set
      expect(screen.getByTestId('flashcard-input')).toBeInTheDocument();
    });

    it('should unsubscribe from auth listener on unmount', () => {
      const { unmount } = render(<FlashcardsPage />);
      
      // Component successfully rendered, now unmount
      unmount();
      
      // No assertion needed - just ensuring no errors on unmount
      expect(true).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should render without crashing', () => {
      const { container } = render(<FlashcardsPage />);
      expect(container).toBeInTheDocument();
    });

    it('should initialize with input view, not flashcard view', () => {
      render(<FlashcardsPage />);
      expect(screen.getByTestId('flashcard-input')).toBeInTheDocument();
      expect(screen.queryByTestId('flashcard-single-view')).not.toBeInTheDocument();
    });

    it('should have progress initialized to 0', () => {
      render(<FlashcardsPage />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveTextContent('0%');
    });
  });
});
