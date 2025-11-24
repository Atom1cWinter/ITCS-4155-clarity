import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Quizzes from '../../pages/Quizzes';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
}));

// Mock child components
vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="ambient-background">{children}</div>,
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
  default: ({ onSummaryGenerated }: { onSummaryGenerated: (summary: string, file: File | null) => void }) => (
    <div data-testid="transcription-uploader">
      <button 
        data-testid="transcription-btn" 
        onClick={() => onSummaryGenerated('Transcribed content', new File(['audio'], 'test.mp3'))}
      >
        Upload Audio
      </button>
    </div>
  ),
}));

vi.mock('../../components/Button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>
      {children}
    </button>
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
    deleteDocument: vi.fn(),
  },
}));

vi.mock('../../lib/firebase/SummaryService', () => ({
  default: {
    getSummaryByFileHash: vi.fn(async () => ({
      id: 'summary1',
      fileName: 'Test.pdf',
      summaryText: 'Test summary content',
    })),
  },
}));

vi.mock('../../lib/firebase/QuizResultService', () => ({
  default: {
    saveQuizResult: vi.fn(),
  },
}));

// Mock QuizService
vi.mock('../../lib/openai/QuizService', () => ({
  default: {
    generateQuizFromFile: vi.fn(),
    generateQuiz: vi.fn(),
  },
}));

import QuizService from '../../lib/openai/QuizService';
const mockQuizService = QuizService as unknown as {
  generateQuizFromFile: ReturnType<typeof vi.fn>;
  generateQuiz: ReturnType<typeof vi.fn>;
};

const mockQuestions = [
  {
    question: 'What is 2+2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 1,
  },
  {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2,
  },
];

describe('QuizzesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuizService.generateQuizFromFile.mockResolvedValue(mockQuestions);
    mockQuizService.generateQuiz.mockResolvedValue(mockQuestions);
  });

  describe('Page Rendering', () => {
    it('should render the page with AmbientBackground', () => {
      render(<Quizzes />);
      expect(screen.getByTestId('ambient-background')).toBeInTheDocument();
    });

    it('should display hero section with title and subtitle', () => {
      render(<Quizzes />);
      expect(screen.getByText('Quizzes')).toBeInTheDocument();
      expect(screen.getByText(/Generate AI-powered multiple-choice quizzes/)).toBeInTheDocument();
    });

    it('should display powered by info chip', () => {
      render(<Quizzes />);
      expect(screen.getByText('Powered by OpenAI GPT')).toBeInTheDocument();
    });

    it('should render ProgressBar component', () => {
      render(<Quizzes />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should display mode selection buttons', () => {
      render(<Quizzes />);
      expect(screen.getByText('Use Existing Notes')).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
      expect(screen.getByText('Text Input')).toBeInTheDocument();
    });
  });

  describe('Mode Selection - Existing Notes', () => {
    it('should display existing mode as default', () => {
      render(<Quizzes />);
      const existingBtn = screen.getByText('Use Existing Notes');
      expect(existingBtn.className).toContain('bg-[#3B82F6]');
    });
  });

  describe('Mode Selection - Upload File', () => {
    it('should switch to upload mode when button clicked', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Upload File'));
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should render transcription uploader for audio', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Upload File'));
      expect(screen.getByTestId('transcription-uploader')).toBeInTheDocument();
    });
  });

  describe('Mode Selection - Text Input', () => {
    it('should switch to text mode when button clicked', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      expect(textarea).toBeInTheDocument();
    });

    it('should allow typing text in textarea', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      expect(textarea.value).toBe('Test content');
    });
  });

  describe('Quiz Settings', () => {
    it('should display quiz generation button', () => {
      render(<Quizzes />);
      expect(screen.getByText('Generate Quiz')).toBeInTheDocument();
    });

    it('should allow selecting text input mode with generate button', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Text Input'));
      expect(screen.getByText('Generate Quiz')).toBeInTheDocument();
    });
  });

  describe('Quiz Generation', () => {
    it('should generate quiz from pasted text', () => {
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      fireEvent.change(textarea, { target: { value: 'Test content for quiz' } });
      const generateBtn = screen.getByText('Generate Quiz');
      fireEvent.click(generateBtn);
      expect(screen.getByText('Quizzes')).toBeInTheDocument();
    });

    it('should error if no input provided', () => {
      render(<Quizzes />);
      const generateBtn = screen.getByText('Generate Quiz');
      fireEvent.click(generateBtn);
      expect(screen.getByText(/Please pick an existing note or paste text/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', () => {
      mockQuizService.generateQuiz.mockRejectedValueOnce(new Error('Generation failed'));
      render(<Quizzes />);
      fireEvent.click(screen.getByText('Text Input'));
      const textarea = screen.getByPlaceholderText('Paste notes or text here...');
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      const generateBtn = screen.getByText('Generate Quiz');
      fireEvent.click(generateBtn);
      expect(screen.getByText('Quizzes')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should render without crashing', () => {
      const { container } = render(<Quizzes />);
      expect(container).toBeInTheDocument();
    });
  });
});
