import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UploadPage from '../../pages/UploadPage';

vi.mock('../../components/AmbientBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="ambient">{children}</div>,
}));

vi.mock('../../components/UploadOnlyArea', () => ({
  default: ({ onUploadComplete }: { onUploadComplete: () => void }) => (
    <div data-testid="upload-area">
      <button onClick={() => onUploadComplete()}>Upload</button>
    </div>
  ),
}));

vi.mock('../../lib/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: 'test' });
      return vi.fn();
    }),
  },
}));

vi.mock('../../lib/firebase/DocumentService', () => ({
  default: {
    getUserDocuments: vi.fn(async () => []),
    deleteDocument: vi.fn(),
  },
}));

function renderWithRouter(comp: React.ReactElement) {
  return render(<BrowserRouter>{comp}</BrowserRouter>);
}

describe('UploadPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<UploadPage />);
    expect(container).toBeInTheDocument();
  });

  it('displays page title', () => {
    renderWithRouter(<UploadPage />);
    expect(screen.getByText(/Upload Documents & Audio/i)).toBeInTheDocument();
  });

  it('renders UploadOnlyArea component', () => {
    renderWithRouter(<UploadPage />);
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
  });

  it('displays Your Files section', () => {
    renderWithRouter(<UploadPage />);
    expect(screen.getByText('Your Files')).toBeInTheDocument();
  });

  it('displays Upload Files heading', () => {
    renderWithRouter(<UploadPage />);
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });

  it('handles upload completion callback', () => {
    renderWithRouter(<UploadPage />);
    const uploadBtn = screen.getByText('Upload');
    fireEvent.click(uploadBtn);
    // Page should still be interactive after upload
    expect(screen.getByText(/Upload Documents & Audio/i)).toBeInTheDocument();
  });
});
