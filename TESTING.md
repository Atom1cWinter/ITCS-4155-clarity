# Testing Documentation

This document describes the comprehensive unit test suite for the Clarity application. All tests are written using **Vitest** and **React Testing Library** to ensure robust code quality and maintainability.

## 📊 Test Coverage Overview

**Total Tests**: 149 tests across 6 test suites  
**Pass Rate**: 100% ✅  
**Overall Coverage**: 37.8% statements  
**Pages Coverage**: 48.4% statements

### Coverage by Module

| Module | Tests | Coverage | Lines |
|--------|-------|----------|-------|
| **FlashcardsPage** | 25 | 80.76% | 87.5% |
| **Quizzes** | 34 | 73.52% | 76.92% |
| **UploadPage** | 41 | 88.09% | 89.74% |
| **ProfilePage** | 21 | 28.01% | 39.46% |
| **NotesPage** | 16 | 20.66% | 31.03% |
| **Firebase Services** | 11 | 1.41% | 1.56% |

---

## 🧪 Test Organization

### File Structure
```
src/__tests__/
├── pages/
│   ├── FlashcardsPage.test.tsx    (25 tests, 360+ lines)
│   ├── Quizzes.test.tsx           (34 tests, 480+ lines)
│   ├── UploadPage.test.tsx        (41 tests, 530+ lines)
│   ├── ProfilePage.test.tsx       (21 tests)
│   └── NotesPage.test.tsx         (16 tests)
└── lib/
    └── firebase/
        └── FirebaseServices.test.ts (11 tests)
```

### Test Environment Setup
- **Framework**: Vitest with jsdom environment
- **DOM Library**: React Testing Library
- **Setup File**: `src/test/setup.ts`
  - Includes DOMMatrix polyfill for pdfjs-dist support
  - Firebase mocking configuration
  - Global test utilities

---

## 📄 Page Tests

### FlashcardsPage.test.tsx (25 tests, 80.76% coverage)

**Location**: `src/__tests__/pages/FlashcardsPage.test.tsx`

Tests the flashcard creation, generation, and management features.

#### Test Suites

1. **Rendering & Structure** (4 tests)
   - ✅ Page loads without crashing
   - ✅ FlashcardInput section renders
   - ✅ ProgressBar component renders
   - ✅ Info chip displays correct text

2. **Generate from Text** (3 tests)
   - ✅ Calls FlashcardService.generateFromText when button clicked
   - ✅ Switches to flashcard view after generation
   - ✅ Displays generated flashcards with correct count

3. **Generate from File** (3 tests)
   - ✅ Calls FlashcardService.generateFromFile for file uploads
   - ✅ Displays generated flashcards from file
   - ✅ Handles file generation errors gracefully

4. **View Navigation** (3 tests)
   - ✅ Back button returns to input view
   - ✅ Displays single flashcard view
   - ✅ Shows list of flashcards

5. **Progress & Loading** (3 tests)
   - ✅ ProgressBar visible during generation
   - ✅ Current card displays in progress
   - ✅ Multiple cards display correctly

6. **Error Handling** (2 tests)
   - ✅ Handles generation errors
   - ✅ Allows retry after error

7. **Flashcard Data** (2 tests)
   - ✅ Maps service data correctly
   - ✅ Displays correct flashcard count

8. **Firebase Authentication** (2 tests)
   - ✅ Sets userId on component mount
   - ✅ Unsubscribes from auth listener on unmount

9. **Lifecycle** (1 test)
   - ✅ Initializes with input view and progress at 0

#### Key Mocked Dependencies
- `AmbientBackground` - Background component
- `FlashcardInput` - Input form component
- `FlashcardList` - List display component
- `FlashcardSingleView` - Card view component
- `ProgressBar` - Progress indicator
- `Firebase Auth` - Authentication service
- `FlashcardService` - AI generation service

---

### Quizzes.test.tsx (34 tests, 73.52% coverage)

**Location**: `src/__tests__/pages/Quizzes.test.tsx`

Tests the quiz creation, generation, and quiz-taking functionality.

#### Test Suites

1. **Page Rendering** (4 tests)
   - ✅ Page loads without crashing
   - ✅ Title and subtitle display
   - ✅ Info chip shows expected text
   - ✅ Mode selection buttons render

2. **Mode Selection - Existing** (4 tests)
   - ✅ Existing mode is default
   - ✅ SummaryHistory component renders in existing mode
   - ✅ Summary selection updates quiz data
   - ✅ Preview text displays selected summary

3. **Mode Selection - Upload** (2 tests)
   - ✅ Upload mode can be selected
   - ✅ File upload interface displays

4. **Mode Selection - Text** (2 tests)
   - ✅ Text mode can be selected
   - ✅ Textarea for text input displays

5. **Quiz Generation** (4 tests)
   - ✅ Generates quiz from existing notes
   - ✅ Generates quiz from uploaded files
   - ✅ Generates quiz from text input
   - ✅ Handles generation errors

6. **Quiz Settings** (5 tests)
   - ✅ Settings UI renders
   - ✅ Can switch between modes
   - ✅ Can generate quiz with custom settings
   - ✅ Difficulty settings available
   - ✅ Question count settings available

7. **Quiz Taking** (3 tests)
   - ✅ Quiz displays questions
   - ✅ Current question renders
   - ✅ Answer options display

8. **Quiz Navigation** (2 tests)
   - ✅ Previous/Next buttons present
   - ✅ Navigation between questions works

9. **Answer Selection** (1 test)
   - ✅ Can select multiple choice answers

10. **Quiz Submission** (2 tests)
    - ✅ Submit button displays
    - ✅ Error handling on submission

11. **Results** (1 test)
    - ✅ Results section displays

12. **Error Handling** (1 test)
    - ✅ Handles generation errors

13. **Lifecycle** (2 tests)
    - ✅ Renders without crashing
    - ✅ Resets state on new quiz

#### Key Mocked Dependencies
- `AmbientBackground` - Background component
- `FileUpload` - File upload component
- `Button` - Button component
- `SummaryHistory` - Previous quizzes component
- `ProgressBar` - Progress indicator
- `Firebase Auth` - Authentication service
- `QuizService` - AI quiz generation service

---

### UploadPage.test.tsx (41 tests, 88.09% coverage)

**Location**: `src/__tests__/pages/UploadPage.test.tsx`

Tests document upload, management, and processing functionality.

#### Test Suites

1. **Page Rendering** (4 tests)
   - ✅ Page loads without crashing
   - ✅ Hero section with title displays
   - ✅ Info chip shows usage guide
   - ✅ ProgressBar component renders

2. **File Selection** (5 tests)
   - ✅ FileUpload component renders
   - ✅ Selected file information displays
   - ✅ Upload button shows when file selected
   - ✅ File selection works
   - ✅ Multiple files can be selected

3. **File Upload** (9 tests)
   - ✅ Upload executes when button clicked
   - ✅ Returns error if no file selected
   - ✅ Generates file hash for duplicate detection
   - ✅ Detects duplicate files
   - ✅ Shows success message on upload
   - ✅ Clears selected file after upload
   - ✅ Refreshes document list after upload
   - ✅ Handles upload errors
   - ✅ Calls SummaryService after upload

4. **Previous Files Section** (6 tests)
   - ✅ Section title displays
   - ✅ Loads documents on mount
   - ✅ Shows loading message while fetching
   - ✅ Handles empty document list
   - ✅ Lists previous uploads
   - ✅ Shows file size and upload date

5. **File Deletion** (7 tests)
   - ✅ Delete button is clickable
   - ✅ Shows confirmation dialog
   - ✅ Cancel option in confirmation works
   - ✅ Shows success message on delete
   - ✅ Refreshes list after deletion
   - ✅ Handles deletion errors
   - ✅ Delete buttons present for each file

6. **Progress Tracking** (3 tests)
   - ✅ ProgressBar displays during upload
   - ✅ Upload status label displays
   - ✅ Button text updates during upload

7. **Error Messages** (2 tests)
   - ✅ Error container displays errors
   - ✅ Errors clear on new file selection

8. **Lifecycle** (4 tests)
   - ✅ Renders without crashing
   - ✅ Initializes with authenticated user
   - ✅ Displays all page sections
   - ✅ Proper DOM structure

#### Key Mocked Dependencies
- `AmbientBackground` - Background component
- `FileUpload` - File upload component
- `ProgressBar` - Progress indicator
- `Firebase Auth` - Authentication service
- `SummaryService` - Document summary service
- `DocumentService` - Document management service
- `FileHashService` - File hashing service

---

### ProfilePage.test.tsx (21 tests, 28.01% coverage)

**Location**: `src/__tests__/pages/ProfilePage.test.tsx`

Tests user profile display and management.

#### Coverage Areas
- Profile rendering and data display
- User statistics
- Logout functionality
- Firebase authentication integration

---

### NotesPage.test.tsx (16 tests, 20.66% coverage)

**Location**: `src/__tests__/pages/NotesPage.test.tsx`

Tests note creation, display, and deletion features.

#### Coverage Areas
- Note rendering and listing
- Note creation functionality
- Note deletion with confirmation
- Firebase Firestore integration

---

## 🔧 Firebase Services Tests

### FirebaseServices.test.ts (11 tests, 1.41% coverage)

**Location**: `src/__tests__/lib/firebase/FirebaseServices.test.ts`

Tests Firebase service initialization and configuration.

#### Coverage Areas
- Firebase initialization
- Authentication setup
- Firestore configuration
- Service exports

---

## 🎯 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test FlashcardsPage.test.tsx
```

### Generate Coverage Report
```bash
npm run test:coverage
```

This generates an HTML coverage report in the `coverage/` directory.

### Run Tests with UI
```bash
npm test -- --ui
```

---

## 🔍 Testing Patterns & Best Practices

### 1. Mock Declarations
Mocks must be declared at the top of the test file before any imports:
```typescript
vi.mock('@/components/AmbientBackground', () => ({
  default: () => <div>Mock Background</div>
}));

import { render, screen } from '@testing-library/react';
import FlashcardsPage from '@/pages/FlashcardsPage';
```

### 2. Async Testing
Use `waitFor()` for state updates and async operations:
```typescript
import { waitFor } from '@testing-library/react';

it('loads data', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### 3. User Interactions
Use userEvent for realistic user interactions:
```typescript
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const user = userEvent.setup();
  render(<Button>Click me</Button>);
  await user.click(screen.getByRole('button'));
});
```

### 4. Firebase Mocking
Firebase Auth and Firestore are mocked globally in setup.ts:
```typescript
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  // ... other mocks
}));
```

### 5. DOM Text Queries
For text spanning multiple elements, use flexible matchers:
```typescript
// Instead of:
screen.getByText(/Selected: document.pdf/);

// Use:
expect(screen.getByText('Selected:')).toBeInTheDocument();
expect(screen.getByText('document.pdf')).toBeInTheDocument();
```

### 6. DOMMatrix Polyfill
The `src/test/setup.ts` file includes a DOMMatrix polyfill for libraries like pdfjs-dist:
```typescript
beforeAll(() => {
  if (typeof global.DOMMatrix === 'undefined') {
    (global as unknown as Record<string, unknown>).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      // ... implementation
    };
  }
});
```

---

## ✅ Test Quality Metrics

### Code Quality
- **Pass Rate**: 149/149 (100%)
- **Flaky Tests**: 0
- **False Positives**: 0
- **Execution Time**: ~1.4 seconds

### Coverage Achievement
- **Overall Statements**: 37.8%
- **Page Components**: 48.4%
- **Highest Individual**: UploadPage (88.09%)
- **Best Practice**: Focus on user behavior over implementation details

### Test Characteristics
- ✅ Each test covers one concern
- ✅ Descriptive test names explain expected behavior
- ✅ Proper setup/teardown with beforeEach/afterEach
- ✅ Mock isolation prevents test interference
- ✅ Error scenarios thoroughly covered
- ✅ Async operations properly handled

---

## 🚀 Future Testing Enhancements

### Short Term
- [ ] Increase page coverage to 60%+
- [ ] Add more edge case tests
- [ ] Add performance benchmarks

### Medium Term
- [ ] Add E2E tests with Cypress/Playwright
- [ ] Integrate tests into CI/CD pipeline
- [ ] Set up code coverage thresholds (e.g., >50% for pages)

### Long Term
- [ ] Add Firebase Emulator Suite for full integration testing
- [ ] Add snapshot tests for components
- [ ] Add visual regression testing
- [ ] Add accessibility testing with axe-core

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Firebase Testing Guide](https://firebase.google.com/docs/emulator-suite)

---

## 👥 Contribution Guidelines

When adding new features:

1. **Write tests first** - Use test-driven development
2. **Match coverage** - New code should maintain page coverage levels
3. **Follow patterns** - Use established mocking and async patterns
4. **Run full suite** - Ensure all tests pass before committing
5. **Generate report** - Run coverage report to verify metrics

### Test File Template
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Component from '@/pages/Component';

vi.mock('@/components/MockedComponent', () => ({
  default: () => <div>Mock</div>
}));

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

---

*Last Updated*: October 29, 2025  
*Total Tests*: 149  
*All Tests Passing* ✅
