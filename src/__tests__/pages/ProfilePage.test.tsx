import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the components first, before importing ProfilePage
vi.mock('../../components/PrivacyPolicy', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="privacy-policy-modal">Privacy Policy Modal</div> : null
  ),
}));

vi.mock('../../components/FeedbackModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="feedback-modal">Feedback Modal</div> : null
  ),
}));

vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Firebase before importing ProfilePage
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-123' });
      return vi.fn(); // Return unsubscribe function
    }),
  },
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  doc: vi.fn(),
  deleteDoc: vi.fn(async () => {}),
}));

// Now import ProfilePage after all mocks are set up
import ProfilePage from '../../pages/ProfilePage';

// Wrap component with Router for testing
function renderWithRouter(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the profile page successfully', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('renders the account information section', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    it('renders the learning statistics section', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Learning Statistics')).toBeInTheDocument();
    });

    it('renders the about section', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('displays the app version', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });
  });

  describe('Account Actions', () => {
    it('renders change password button', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('renders logout button', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('renders delete account button', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  describe('Resources Section', () => {
    it('renders privacy policy link', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders send feedback link', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText('Send Feedback')).toBeInTheDocument();
    });

    it('renders powered by text', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/OpenAI GPT & Firebase/i)).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('opens privacy policy modal when button clicked', async () => {
      renderWithRouter(<ProfilePage />);
      
      const privacyButton = screen.getByText('Privacy Policy');
      fireEvent.click(privacyButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('privacy-policy-modal')).toBeInTheDocument();
      });
    });

    it('opens feedback modal when button clicked', async () => {
      renderWithRouter(<ProfilePage />);
      
      const feedbackButton = screen.getByText('Send Feedback');
      fireEvent.click(feedbackButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('logout button is clickable', async () => {
      renderWithRouter(<ProfilePage />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeEnabled();
    });
  });

  describe('Delete Account', () => {
    it('delete account button is present', async () => {
      renderWithRouter(<ProfilePage />);
      
      const deleteButton = screen.getByText('Delete Account');
      expect(deleteButton).toBeInTheDocument();
    });

    it('delete account button opens modal when clicked', async () => {
      renderWithRouter(<ProfilePage />);
      
      const deleteButton = screen.getByText('Delete Account');
      fireEvent.click(deleteButton);
      
      // Modal should appear with delete account heading
      expect(screen.getAllByText('Delete Account').length).toBeGreaterThan(1);
    });
  });

  describe('Learning Statistics', () => {
    it('displays summaries generated stat', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/Summaries Generated/i)).toBeInTheDocument();
    });

    it('displays flashcards created stat', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/Flashcards Created/i)).toBeInTheDocument();
    });

    it('displays quizzes taken stat', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/Quizzes Taken/i)).toBeInTheDocument();
    });

    it('displays documents uploaded stat', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/Documents Uploaded/i)).toBeInTheDocument();
    });

    it('displays storage information', async () => {
      renderWithRouter(<ProfilePage />);
      
      expect(screen.getByText(/Storage/i)).toBeInTheDocument();
    });
  });
});
