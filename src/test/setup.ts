import '@testing-library/jest-dom';
import { afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup DOM globals for tests
beforeAll(() => {
  // Mock DOMMatrix for pdfjs-dist
  if (typeof global.DOMMatrix === 'undefined') {
    (global as unknown as Record<string, unknown>).DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(a?: number, b?: number, c?: number, d?: number, e?: number, f?: number) {
        if (a !== undefined) this.a = a;
        if (b !== undefined) this.b = b;
        if (c !== undefined) this.c = c;
        if (d !== undefined) this.d = d;
        if (e !== undefined) this.e = e;
        if (f !== undefined) this.f = f;
      }
    };
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Firebase Auth
vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock OpenAI API
vi.mock('../lib/openai/TextSummaryService', () => ({
  default: {
    summarizeText: vi.fn(async (text: string) => `Summary of: ${text.substring(0, 50)}...`),
    summarizeFromFile: vi.fn(async (file: File) => `Summary of file: ${file.name}`),
  },
}));
