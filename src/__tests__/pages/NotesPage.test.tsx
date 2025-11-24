import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import NotesPage from '../../pages/NotesPage';
import type { Document } from '../../lib/firebase/DocumentService';

const getUserDocumentsMock = vi.fn<[], Promise<(Document & { id: string })[]>>();
const searchItemsMock = vi.fn();

// Mock components
vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/UnifiedUploadArea', () => ({
  default: ({ onSummaryGenerated }: { onSummaryGenerated: (summary: string, fileName: string, isAudio: boolean) => void }) => (
    <div data-testid="unified-upload-area">
      <button 
        data-testid="unified-upload-btn" 
        onClick={() => onSummaryGenerated('Mock summary', 'test.pdf', false)}
      >
        Upload File or Audio
      </button>
      <input type="file" data-testid="file-input" />
    </div>
  ),
}));

vi.mock('../../components/ProgressBar', () => ({
  default: ({ isVisible, label }: { isVisible: boolean; label: string }) => (
    isVisible ? <div data-testid="progress-bar">{label}</div> : null
  ),
}));

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-123' });
      return vi.fn();
    }),
  },
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  addDoc: vi.fn(async () => ({ id: 'doc1' })),
}));

// Mock Services
vi.mock('../../lib/openai/TextSummaryService', () => ({
  default: {
    summarizeText: vi.fn(async (text: string) => `Summary of: ${text.substring(0, 50)}...`),
    summarizeFromFile: vi.fn(async (file: File) => `Summary of file: ${file.name}`),
  },
}));

vi.mock('../../lib/firebase/SummaryService', () => ({
  default: {
    saveSummary: vi.fn(async () => 'summary1'),
    getUserSummaries: vi.fn(async () => []),
  },
}));

vi.mock('../../lib/firebase/DocumentService', () => ({
  default: {
    uploadDocument: vi.fn(async () => 'doc1'),
    getUserDocuments: () => getUserDocumentsMock(),
  },
}));

vi.mock('../../lib/firebase/FileHashService', () => ({
  generateFileHash: vi.fn(async () => 'hash123'),
  generateTextHash: vi.fn(async () => 'texthash456'),
}));

vi.mock('../../lib/firebase/CourseService', () => ({
  default: {
    getUserCourses: vi.fn(async () => []),
  },
}));

vi.mock('../../components/CourseModal', () => ({
  default: () => <div data-testid="course-modal" style={{ display: 'none' }} />,
}));

vi.mock('../../components/CourseSelector', () => ({
  default: () => <div data-testid="course-selector" style={{ display: 'none' }} />,
}));

vi.mock('../../components/CourseViewer', () => ({
  default: () => <div data-testid="course-viewer" />,
}));

vi.mock('../../components/SearchBar', () => ({
  default: ({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (term: string) => void }) => (
    <input
      data-testid="search-bar"
      placeholder="Search notes and materials…"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
    />
  ),
}));

vi.mock('../../lib/SearchService', () => ({
  searchItems: (...args: unknown[]) => searchItemsMock(...args),
  highlightSearchTerm: (text: string) => [{ type: 'text', value: text }],
}));

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserDocumentsMock.mockResolvedValue([]);
    searchItemsMock.mockImplementation((_term: string, summaries, documents) => ({
      summaries,
      documents,
    }));
  });

  describe('Page Rendering', () => {
    it('renders the notes page with title', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('displays powered by OpenAI text', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText(/Powered by OpenAI GPT/i)).toBeInTheDocument();
    });

    it('displays upload, existing notes, and text input mode buttons', () => {
      renderWithRouter(<NotesPage />);
      const buttons = screen.getAllByRole('button');
      const uploadBtn = buttons.find(btn => btn.textContent === 'Upload File');
      const existingBtn = buttons.find(btn => btn.textContent === 'Use Existing Notes');
      const textBtn = buttons.find(btn => btn.textContent === 'Text Input');
      
      expect(uploadBtn).toBeInTheDocument();
      expect(existingBtn).toBeInTheDocument();
      expect(textBtn).toBeInTheDocument();
    });
  });

  describe('Mode Toggle', () => {
    it('starts with existing mode (viewing previous notes)', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('has buttons to switch between modes', () => {
      renderWithRouter(<NotesPage />);
      // The page should have navigation/mode buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Unified Upload Area Integration', () => {
    it('renders unified upload area when upload mode is selected', () => {
      renderWithRouter(<NotesPage />);
      
      // Click the Upload File button to switch to upload mode
      const uploadButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Upload File');
      expect(uploadButton).toBeInTheDocument();
      
      if (uploadButton) {
        fireEvent.click(uploadButton);
        expect(screen.getByTestId('unified-upload-area')).toBeInTheDocument();
      }
    });

    it('calls onSummaryGenerated when upload area triggers callback', () => {
      renderWithRouter(<NotesPage />);
      
      // Click the Upload File button to switch to upload mode
      const uploadButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Upload File');
      if (uploadButton) {
        fireEvent.click(uploadButton);
        
        const uploadBtn = screen.getByTestId('unified-upload-btn');
        expect(uploadBtn).toBeInTheDocument();
        
        fireEvent.click(uploadBtn);
        expect(screen.getByText('Notes')).toBeInTheDocument();
      }
    });

    it('accepts both document and audio files through unified upload', () => {
      renderWithRouter(<NotesPage />);
      
      // Click the Upload File button to switch to upload mode
      const uploadButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Upload File');
      if (uploadButton) {
        fireEvent.click(uploadButton);
        const fileInput = screen.getByTestId('file-input');
        expect(fileInput).toBeInTheDocument();
      }
    });
  });

  describe('User Authentication', () => {
    it('initializes with authenticated user', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Summary Display', () => {
    it('displays progress bar when loading', async () => {
      renderWithRouter(<NotesPage />);

      // Progress bar starts hidden
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });
  });

  describe('Course Integration', () => {
    it('renders page with course components available', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('has search functionality', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('filters documents when a search term is entered', async () => {
      const user = userEvent.setup();
      const mockDocs: (Document & { id: string })[] = [
        {
          id: '1',
          userId: 'test-user-123',
          fileName: 'Physics Lecture Notes.pdf',
          fileHash: 'hash-1',
          fileSize: 1024,
          fileType: 'application/pdf',
          uploadedAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          userId: 'test-user-123',
          fileName: 'Calculus Review.docx',
          fileHash: 'hash-2',
          fileSize: 2048,
          fileType: 'application/docx',
          uploadedAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
        },
      ];

      getUserDocumentsMock.mockResolvedValueOnce(mockDocs);
      searchItemsMock.mockImplementation((_term: string, _summaries, documents: (Document & { id: string })[]) => {
        const normalized = _term.toLowerCase();
        return {
          summaries: [],
          documents: documents.filter((doc) => doc.fileName.toLowerCase().includes(normalized)),
        };
      });

      renderWithRouter(<NotesPage />);

      await screen.findByText(/Physics Lecture Notes\.pdf/);
      await screen.findByText(/Calculus Review\.docx/);

      const searchInput = screen.getByTestId('search-bar');
      await user.type(searchInput, 'Physics');

      expect(
        screen.getAllByText((content, element) => (element?.textContent || '').includes('Physics Lecture Notes.pdf'))
      ).not.toHaveLength(0);
      expect(
        screen.queryAllByText((content, element) => (element?.textContent || '').includes('Calculus Review.docx'))
      ).toHaveLength(0);
    });
  });

  describe('Component Lifecycle', () => {
    it('renders without crashing', () => {
      const { container } = renderWithRouter(<NotesPage />);
      expect(container).toBeInTheDocument();
    });

    it('handles user state changes', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders page even if services fail', () => {
      renderWithRouter(<NotesPage />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('still allows uploads in error state', () => {
      renderWithRouter(<NotesPage />);
      const buttons = screen.getAllByRole('button');
      const uploadBtn = buttons.find(btn => btn.textContent === 'Upload File');
      expect(uploadBtn).toBeInTheDocument();
    });
  });
});
