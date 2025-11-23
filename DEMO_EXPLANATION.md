# Firebase User Summaries & Documents Storage - Technical Explanation

This document provides a detailed technical explanation of how Clarity saves user summaries and their uploaded documents using Firebase Firestore. Use this for your demo video to explain the architecture and implementation.

---

## 🎯 Overview

The application uses **Firebase Firestore** (NoSQL database) to persistently store:
1. **User-generated summaries** (from uploaded files or text input)
2. **Document metadata** (files uploaded for processing)

Each user's data is isolated using their **Firebase Authentication User ID**, ensuring data privacy and separation.

---

## 🏗️ Architecture

### High-Level Flow

```
User Uploads File/Text
         ↓
Generate Summary (OpenAI API)
         ↓
Generate File Hash (SHA-256)
         ↓
Check for Duplicates in Firestore
         ↓
If Not Duplicate → Save Summary + Document to Firestore
         ↓
Display Summary & Update UI
         ↓
User Can Retrieve Summaries Later
```

---

## 📊 Database Schema

### 1. Summaries Collection (`summaries`)

Stores all generated summaries with their source information.

**Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | string | Firebase Auth user ID - used to query only user's summaries |
| `fileName` | string | Original filename or "Text Summary - [timestamp]" for text input |
| `fileHash` | string | SHA-256 hash of file contents for duplicate detection |
| `fileSize` | number | File size in bytes |
| `fileType` | string | MIME type (e.g., "application/pdf", "text") |
| `summaryText` | string | The actual generated summary from OpenAI |
| `createdAt` | timestamp | When the summary was created |
| `updatedAt` | timestamp | When the summary was last updated |

**Example Document:**

```json
{
  "userId": "abc123xyz789",
  "fileName": "Lecture_Notes_Ch5.pdf",
  "fileHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "fileSize": 2048576,
  "fileType": "application/pdf",
  "summaryText": "# Chapter 5: Advanced Concepts\n\nThis chapter covers...",
  "createdAt": Timestamp(seconds=1635123456),
  "updatedAt": Timestamp(seconds=1635123456)
}
```

### 2. Documents Collection (`documents`)

Stores metadata about uploaded files for retrieval on the Upload page.

**Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | string | Firebase Auth user ID |
| `fileName` | string | Original filename |
| `fileHash` | string | SHA-256 hash for duplicate detection |
| `fileSize` | number | File size in bytes |
| `fileType` | string | MIME type |
| `uploadedAt` | timestamp | When file was uploaded |
| `updatedAt` | timestamp | When file record was last updated |

**Example Document:**

```json
{
  "userId": "abc123xyz789",
  "fileName": "Physics_Exam_Study.pdf",
  "fileHash": "x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6",
  "fileSize": 1024000,
  "fileType": "application/pdf",
  "uploadedAt": Timestamp(seconds=1635124000),
  "updatedAt": Timestamp(seconds=1635124000)
}
```

---

## 🔑 Key Technology: File Hashing

### Why We Use SHA-256 Hashes

**Purpose**: Detect duplicate file uploads and prevent storing the same file multiple times.

**How It Works:**

```typescript
// FileHashService.ts
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  // Convert buffer to hex string (e.g., "a1b2c3d4...")
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
```

**Key Points:**
- **Deterministic**: Same file always produces same hash
- **Collision-resistant**: Extremely unlikely two different files produce same hash
- **Fast**: Can hash large files efficiently
- **Client-side**: Done in browser, saves bandwidth

### Duplicate Detection Flow

```
User Selects File
         ↓
Generate SHA-256 hash of file contents
         ↓
Query Firestore: "Show me summaries where (userId == currentUser) AND (fileHash == generatedHash)"
         ↓
If Found: Display "File already uploaded"
         ↓
If Not Found: Proceed with processing
```

---

## 💾 Data Flow in NotesPage.tsx

### When User Uploads a File

1. **File Selection**
   ```typescript
   const handleFileSelect = (file: File) => {
     setSelectedFile(file);
     setError(null);
   };
   ```

2. **User Clicks "Generate Summary from File"**
   ```typescript
   const handleSummarizeFromFile = async () => {
     // Step 1: Check authentication
     if (!userId) return;
     
     // Step 2: Send to OpenAI
     const result = await TextSummaryService.summarizeFromFile(selectedFile);
     setSummary(result);
     
     // Step 3: Generate file hash
     const fileHash = await generateFileHash(selectedFile);
     
     // Step 4: Save to Firestore
     await SummaryService.saveSummary({
       userId,
       fileName: selectedFile.name,
       fileHash,
       fileSize: selectedFile.size,
       fileType: selectedFile.type || 'unknown',
       summaryText: result,
       createdAt: new Date(),
       updatedAt: new Date(),
     });
     
     // Step 5: Also save document record
     await DocumentService.uploadDocument({
       userId,
       fileName: selectedFile.name,
       fileHash,
       fileSize: selectedFile.size,
       fileType: selectedFile.type || 'unknown',
       uploadedAt: new Date(),
       updatedAt: new Date(),
     });
   };
   ```

3. **Summary Saved to Firestore**
   - `SummaryService.saveSummary()` is called
   - Adds new document to `summaries` collection
   - Firebase automatically generates a unique document ID
   - Returns the document ID for tracking

### When User Enters Text

Same process but with text instead:

```typescript
const handleSummarizeFromText = async () => {
  // Generate text hash
  const textHash = await generateTextHash(inputText);
  
  // Save with special filename
  await SummaryService.saveSummary({
    userId,
    fileName: `Text Summary - ${new Date().toLocaleString()}`,
    fileHash: textHash,
    fileSize: inputText.length,
    fileType: 'text',
    summaryText: result,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};
```

---

## 📖 SummaryService.ts - Core Logic

### Main Methods

#### 1. `saveSummary()` - Create a new summary

```typescript
async saveSummary(summary: Omit<Summary, 'id'>): Promise<string> {
  // Add document to Firestore collection
  const docRef = await addDoc(collection(db, 'summaries'), {
    ...summary,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  });
  
  // Returns auto-generated document ID
  return docRef.id;
}
```

**Key Points:**
- Uses `addDoc()` which auto-generates document ID
- Firestore automatically converts JavaScript `Date` objects to Firestore `Timestamp` objects
- Returns the document ID for reference

#### 2. `getUserSummaries()` - Retrieve all user summaries

```typescript
async getUserSummaries(userId: string): Promise<Summary[]> {
  // Query: Find all summaries where userId matches current user
  const q = query(
    collection(db, 'summaries'),
    where('userId', '==', userId)  // ← Critical for data isolation
  );
  
  const querySnapshot = await getDocs(q);
  const summaries: Summary[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamp back to JavaScript Date
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    
    summaries.push({
      id: doc.id,
      ...data,
      createdAt,
      updatedAt: data.updatedAt?.toDate() : new Date(),
    });
  });
  
  // Sort by newest first
  summaries.sort((a, b) => b.createdAt - a.createdAt);
  
  return summaries;
}
```

**Key Points:**
- Uses `where('userId', '==', userId)` to isolate user data
- Each user only sees their own summaries
- Sorts newest first (better UX)
- Converts Firestore Timestamps back to JavaScript Dates

#### 3. `getSummaryByFileHash()` - Duplicate detection

```typescript
async getSummaryByFileHash(userId: string, fileHash: string): Promise<Summary | null> {
  // Query: Find summary by both userId AND fileHash
  const q = query(
    collection(db, 'summaries'),
    where('userId', '==', userId),      // Only this user's files
    where('fileHash', '==', fileHash)   // Matching this specific file
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;  // File not found → not a duplicate
  }
  
  // Return the existing summary
  return {
    id: querySnapshot.docs[0].id,
    ...querySnapshot.docs[0].data(),
  };
}
```

**Used in UploadPage:**
```typescript
const fileHash = await generateFileHash(selectedFile);
const existing = await SummaryService.getSummaryByFileHash(userId, fileHash);

if (existing) {
  setError(`File already uploaded: "${existing.fileName}"`);
  return;  // Stop upload
}
```

#### 4. `deleteSummary()` - Remove a summary

```typescript
async deleteSummary(summaryId: string): Promise<void> {
  // Delete document by ID
  const docRef = doc(db, 'summaries', summaryId);
  await deleteDoc(docRef);
}
```

---

## 📂 DocumentService.ts - File Tracking

Tracks uploaded documents separately from summaries (enables file management on Upload page).

### Key Methods

#### 1. `uploadDocument()` - Save document metadata

```typescript
async uploadDocument(document: Omit<Document, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'documents'), {
    ...document,
    uploadedAt: document.uploadedAt,
    updatedAt: document.updatedAt,
  });
  return docRef.id;
}
```

#### 2. `getUserDocuments()` - Retrieve user's documents

```typescript
async getUserDocuments(userId: string): Promise<Document[]> {
  const q = query(
    collection(db, 'documents'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  const documents: Document[] = [];
  
  querySnapshot.forEach((doc) => {
    documents.push({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });
  
  // Sort newest first
  documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  
  return documents;
}
```

---

## 🔐 Security: Data Isolation

### Firebase Firestore Security Rules

Your app uses these rules (typically configured in Firebase Console):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only user can access their own summaries
    match /summaries/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Only user can access their own documents
    match /documents/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

**Key Security Features:**
- `request.auth.uid` = Currently logged-in user's ID
- `resource.data.userId` = User ID stored in document
- Read/Write only allowed if they match
- User cannot modify another user's data
- User cannot forge `userId` when creating documents

---

## 🔄 Complete User Flow - NotesPage to UploadPage

### Step 1: Generate & Save Summary (NotesPage)

```
1. User opens NotesPage
2. Uploads file or enters text
3. Clicks "Generate Summary"
4. OpenAI API generates summary
5. generateFileHash() creates SHA-256 hash of file content
6. SummaryService.saveSummary() saves to 'summaries' collection
7. DocumentService.uploadDocument() saves to 'documents' collection
8. Summary displays in UI
9. SummaryHistory component reloads to show new summary
```

### Step 2: View Previous Summaries (NotesPage)

```
1. SummaryHistory component mounts
2. Calls SummaryService.getUserSummaries(userId)
3. Firestore queries all summaries where userId == currentUser
4. Sorts by createdAt (newest first)
5. Displays in dropdown/list
6. User can select previous summary to view again
```

### Step 3: Upload Page Management (UploadPage)

```
1. UploadPage mounts
2. Calls SummaryService.getUserSummaries(userId)
3. Displays all user's uploaded files
4. User can:
   - Upload new file (checks for duplicates via file hash)
   - Delete file (removes from database)
   - View file details (size, upload date)
```

---

## 🗄️ Firestore Query Performance

### Query Optimization

**Without indexes, these queries work efficiently:**

1. **Single userId query** (most common)
   ```typescript
   where('userId', '==', userId)
   ```
   - Firestore efficiently filters by any field
   - No index required for single condition

2. **Duplicate detection query** (multi-condition)
   ```typescript
   where('userId', '==', userId)
   where('fileHash', '==', fileHash)
   ```
   - Firestore can still handle this efficiently for small datasets
   - If collection grows large, a composite index may be suggested

### Why Not Order in Firestore?

```typescript
// ❌ This would require an index:
const q = query(
  collection(db, 'summaries'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);

// ✅ Instead, sort in JavaScript:
summaries.sort((a, b) => b.createdAt - a.createdAt);
```

This is faster and cheaper (no index needed).

---

## 💡 Error Handling

### Try-Catch Pattern

All Firebase operations wrap errors:

```typescript
try {
  const result = await SummaryService.saveSummary({...});
  setProgress(100);
} catch (dbError) {
  console.error('Error saving summary:', dbError);
  setError(`Note: Summary generated but storage failed`);
}
```

**Why Important:**
- Network failures
- Authentication failures
- Firestore quota exceeded
- Invalid data
- User logs out during operation

---

## 🚀 Key Takeaways for Your Demo

### What to Emphasize

1. **Data Isolation**: Each user's `userId` is the key to keeping their data private
   - User A's summaries can only be queried with User A's ID
   - Firestore security rules enforce this at database level

2. **Efficient Duplicate Detection**: SHA-256 hashing
   - Same file always produces same hash
   - Prevents redundant processing

3. **Real-time Experience**: Firestore integration
   - Instant data retrieval
   - Automatic sorting and filtering
   - Automatic date conversion

4. **Scalability**: How to handle growth
   - Simple queries scale well
   - Easy to add composite indexes if needed
   - Can add pagination later

5. **Security**: Multiple layers
   - Firebase Authentication (who you are)
   - Firestore Security Rules (what you can access)
   - Data encryption in transit and at rest

---

## 📊 Demo Script Outline

### For Your Video

**Opening (30 seconds)**
- "Clarity stores all user data securely in Firebase Firestore"
- "Each user's account has isolated summaries and documents"

**Show File Upload (1 minute)**
- Upload a PDF file
- Explain: "We hash the file contents with SHA-256"
- Show it being saved to Firestore in real-time (show console logs)
- Explain: "This hash lets us detect duplicates"

**Try Uploading Same File (30 seconds)**
- Attempt to upload the same file again
- Show: "File already uploaded" error message
- Explain: "The hash matched, so we prevented a duplicate"

**View Summaries in UploadPage (1 minute)**
- Navigate to Upload page
- Show list of uploaded files
- Explain: "This queries Firestore for all documents where userId == currentUser"
- Show deleting a file (explain cascade behavior if applicable)

**Database Structure (1 minute)**
- Show Firebase Console
- Point out `summaries` and `documents` collections
- Show example document with fields
- Highlight: `userId`, `fileHash`, `fileName`, etc.

**Code Overview (1 minute)**
- Show SummaryService.saveSummary() method
- Highlight: `addDoc(collection(db, 'summaries'), {...})`
- Show: query with `where('userId', '==', userId)`
- Explain: "This ensures users only see their own data"

**Closing (30 seconds)**
- "All data encrypted in transit and at rest"
- "Security rules enforced at database level"
- "Scalable to thousands of users"

---

## 🔍 Debugging Tips

If something seems wrong with your data:

### Check Browser Console
```javascript
// See what's being saved
console.log('Saving summary:', summary);

// See what's being queried
console.log('Fetching summaries for user:', userId);
```

### View in Firebase Console
1. Go to Firebase Console → Your Project → Firestore
2. Click on `summaries` collection
3. See all saved summaries with their document IDs
4. Click on a document to view fields
5. Check `userId` values

### Test Duplicate Detection
1. Upload same file twice
2. Check console - should see duplicate detection query
3. Error message should appear

---

## 📚 Resources

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Web Crypto API (SHA-256)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
- [Cloud Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

## 📝 Summary

**What We Built:**
- Two Firestore collections: `summaries` and `documents`
- User-isolated data using `userId` field and security rules
- Duplicate file detection using SHA-256 hashing
- Full CRUD operations (Create, Read, Update, Delete)

**Why It Works:**
- Firebase handles authentication and authorization
- Firestore provides real-time database with automatic scaling
- Security rules enforce data isolation at database level
- Hashing prevents duplicate processing and saves resources

**What Happens When:**
- **User uploads file** → Hash generated → Duplicate check → Save to Firestore → Display summary
- **User opens Notes** → Query Firestore for user's summaries → Display in history
- **User opens Upload** → Query Firestore for user's documents → Display with delete option
- **User logs out** → Auth listener triggers → UI clears user data

This architecture is secure, scalable, and efficient! 🎉

---

---

# 🎨 Part 2: Glass Morphism Design System

## Glass Morphism Theme Overview

Clarity uses a modern **Glass Morphism** design pattern combined with a **dynamic gradient background** with animated colorful gradient orbs. This creates a sleek, modern aesthetic that's both visually appealing and functionally intuitive.

## 🌈 What is Glass Morphism?

Glass Morphism is a design trend that mimics frosted glass. It creates a semi-transparent, blurred effect that:
- Shows the background through it
- Adds a subtle border and shadow
- Creates depth through layering
- Maintains readability with proper contrast

## 🎯 Implementation in Clarity

### Tailwind CSS Glass Classes

The glass morphism effect is applied through a custom Tailwind class: `glass-surface`

**Located in**: `src/index.css` or `tailwind.config.js`

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.1);      /* 10% white opacity */
  backdrop-filter: blur(10px);                /* Blur effect */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Subtle border */
  border-radius: 0.75rem;                     /* Rounded corners */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);  /* Subtle shadow */
}
```

**What Each Property Does:**

| Property | Value | Effect |
|----------|-------|--------|
| `background` | `rgba(255, 255, 255, 0.1)` | Semi-transparent white background (10% opacity) |
| `backdrop-filter` | `blur(10px)` | Blurs everything behind it - frosted glass effect |
| `border` | `1px solid rgba(255, 255, 255, 0.2)` | Subtle white border with 20% opacity |
| `border-radius` | `0.75rem` | Smooth rounded corners |
| `box-shadow` | `0 4px 6px rgba(0, 0, 0, 0.1)` | Subtle depth shadow |

### Applied Throughout the App

```tsx
// NotesPage.tsx example
<div className="glass-surface p-6 mb-6">
  {/* Content here */}
</div>

// ProfilePage.tsx example
<div className="glass-surface p-6 rounded-lg">
  {/* User profile content */}
</div>

// UploadPage.tsx example
<div className="glass-surface p-6">
  <h3 className="text-lg font-semibold text-primary mb-3">Your Documents</h3>
  {/* File list */}
</div>
```

## 🎭 Background: Animated Gradient Orbs

### AmbientBackground Component

The dynamic background with animated colorful gradient orbs is implemented in a separate component that wraps every page.

**Located in**: `src/components/AmbientBackground.tsx`

```tsx
export default function AmbientBackground({ children }: Props) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* Animated Gradient Orbs */}
      
      {/* Orb 1: Pink/Purple (Top Left) */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full opacity-30 blur-3xl animate-pulse" 
        style={{ animation: 'float 20s infinite ease-in-out' }} />
      
      {/* Orb 2: Blue/Cyan (Bottom Right) */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 blur-3xl" 
        style={{ animation: 'float 25s infinite ease-in-out reverse' }} />
      
      {/* Orb 3: Purple/Indigo (Center) */}
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2" 
        style={{ animation: 'float 30s infinite ease-in-out' }} />
      
      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
```

### Custom Animation: `float`

The orbs use a custom `float` animation defined in `index.css`:

```css
@keyframes float {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
  }
  25% {
    transform: translateY(-30px) translateX(20px);
  }
  50% {
    transform: translateY(-60px) translateX(-20px);
  }
  75% {
    transform: translateY(-30px) translateX(-30px);
  }
}
```

**How It Works:**
- Starts at position (0, 0)
- Smoothly animates to different positions over 20-30 seconds
- Uses `ease-in-out` timing for smooth motion
- Loops infinitely
- Each orb has different animation duration for varied movement

### Tailwind Classes Used

```
w-96          → Width 384px (large orb)
h-96          → Height 384px (circle)
bg-gradient-to-br → Blue-red gradient direction
opacity-30    → 30% transparency (more visible)
opacity-20    → 20% transparency (subtle)
blur-3xl      → Heavy blur (24px)
animate-pulse → Pulsing effect (optional)
rounded-full  → Perfect circle
```

## 🎨 Color Palette

### Gradient Colors Used

1. **Pink → Purple Orb** (Top Left)
   - From: `#ec4899` (pink-500)
   - To: `#a855f7` (purple-500)
   - Opacity: 30%

2. **Blue → Cyan Orb** (Bottom Right)
   - From: `#60a5fa` (blue-400)
   - To: `#06b6d4` (cyan-400)
   - Opacity: 20%

3. **Purple → Indigo Orb** (Center)
   - From: `#a855f7` (purple-500)
   - To: `#6366f1` (indigo-500)
   - Opacity: 20%

### Base Background

```css
background: linear-gradient(
  to bottom right,
  rgb(15, 23, 42),      /* slate-900 */
  rgb(30, 27, 75),      /* blue-900 */
  rgb(15, 23, 42)       /* slate-900 */
);
```

## 📐 Why This Design Works

### Visual Appeal
- **Modern Aesthetic**: Glass morphism is trendy and professional
- **Depth Perception**: Layering creates visual hierarchy
- **Dynamic Movement**: Animated orbs keep the interface alive
- **Color Harmony**: Blues and purples create cohesive theme

### Functional Benefits
- **Readability**: Frosted glass maintains text contrast
- **Subtle Animation**: Doesn't distract from content
- **Flexible**: Works with any content placed on top
- **Responsive**: Scales with viewport

### Performance Considerations
- **GPU Acceleration**: `backdrop-filter` uses GPU
- **Smooth 60fps**: CSS animations are performant
- **No JavaScript Needed**: Pure CSS implementation
- **Mobile Friendly**: Optimized for all devices

## 🔧 How to Modify the Theme

### Change Glass Opacity
```css
/* Less transparent (more opaque) */
.glass-surface {
  background: rgba(255, 255, 255, 0.15);  /* Increased from 0.1 */
}

/* More transparent */
.glass-surface {
  background: rgba(255, 255, 255, 0.05);  /* Decreased from 0.1 */
}
```

### Change Blur Amount
```css
.glass-surface {
  backdrop-filter: blur(20px);  /* More blur for more frosted effect */
  /* or */
  backdrop-filter: blur(5px);   /* Less blur for clearer background */
}
```

### Change Orb Colors
```tsx
{/* Change Pink to Red */}
<div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-red-500 to-purple-500 rounded-full opacity-30 blur-3xl" />

{/* Change Blue to Green */}
<div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full opacity-20 blur-3xl" />
```

### Change Animation Speed
```tsx
{/* Slower animation (30s instead of 20s) */}
style={{ animation: 'float 30s infinite ease-in-out' }}

{/* Faster animation (10s) */}
style={{ animation: 'float 10s infinite ease-in-out' }}
```

---

# 📤 Part 3: Upload Page Implementation

## Upload Page Overview

The Upload Page is the file management hub of Clarity. It allows users to:
1. **Upload documents** to their account
2. **View all their uploaded files** with metadata
3. **Delete files** when no longer needed
4. **Detect and prevent duplicate uploads**

All file data is stored in Firebase Firestore and isolated by user ID.

## 🏗️ Component Structure

**File**: `src/pages/UploadPage.tsx`

### Key State Management

```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [userId, setUserId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
const [refreshTrigger, setRefreshTrigger] = useState(0);
const [previousFiles, setPreviousFiles] = useState<Summary[]>([]);
const [loadingPrevious, setLoadingPrevious] = useState(false);
const [progress, setProgress] = useState(0);
```

| State Variable | Type | Purpose |
|---|---|---|
| `selectedFile` | `File \| null` | Currently selected file from input |
| `userId` | `string \| null` | Current authenticated user's ID |
| `isLoading` | `boolean` | Whether upload is in progress |
| `error` | `string \| null` | Error message to display |
| `successMessage` | `string \| null` | Success message after upload |
| `refreshTrigger` | `number` | Counter to force refresh of file list |
| `previousFiles` | `Summary[]` | Array of user's uploaded files |
| `loadingPrevious` | `boolean` | Whether loading file list |
| `progress` | `number` | Upload progress percentage (0-100) |

## 🔐 Authentication Setup

### Get Current User

```typescript
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      setUserId(user.uid);
    }
  });
  return unsubscribe;
}, []);
```

**What This Does:**
- Listens for authentication state changes
- If user logs in, stores their Firebase UID
- If user logs out, clears the userId
- Returns cleanup function to unsubscribe on unmount

## 📥 File Upload Flow

### 1. File Selection

```typescript
const handleFileSelect = (file: File) => {
  setSelectedFile(file);
  setError(null);
  setSuccessMessage(null);
};
```

**Triggered by**: `<FileUpload onFileSelect={handleFileSelect} />`

**What Happens:**
- User clicks file input
- FileUpload component handles selection
- Calls callback with selected File object
- Clears any previous error/success messages

### 2. Upload Handler

```typescript
const handleUpload = async () => {
  // Step 1: Validation
  if (!selectedFile) {
    setError('Please select a file first');
    return;
  }

  if (!userId) {
    setError('User not authenticated');
    return;
  }

  // Step 2: Setup
  setIsLoading(true);
  setProgress(0);
  setError(null);
  setSuccessMessage(null);

  // Simulate progress (updates every 300ms)
  const progressInterval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 90) return prev;
      return prev + Math.random() * 30;
    });
  }, 300);

  try {
    // Step 3: Generate file hash
    const fileHash = await generateFileHash(selectedFile);
    setProgress(20);

    // Step 4: Check for duplicate
    const existing = await SummaryService.getSummaryByFileHash(userId, fileHash);
    
    if (existing) {
      setError(`File already uploaded: "${existing.fileName}"`);
      setIsLoading(false);
      clearInterval(progressInterval);
      setProgress(0);
      return;
    }

    setProgress(50);

    // Step 5: Upload document to Firestore
    await DocumentService.uploadDocument({
      userId,
      fileName: selectedFile.name,
      fileHash,
      fileSize: selectedFile.size,
      fileType: selectedFile.type || 'unknown',
      uploadedAt: new Date(),
      updatedAt: new Date(),
    });

    setProgress(100);

    // Step 6: Success
    setSuccessMessage(`✓ "${selectedFile.name}" uploaded successfully!`);
    setSelectedFile(null);
    
    // Step 7: Refresh file list
    setRefreshTrigger(prev => prev + 1);
    clearInterval(progressInterval);
  } catch (err) {
    console.error('Error uploading document:', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    setError(`Upload failed: ${errorMsg}`);
  } finally {
    setIsLoading(false);
    setTimeout(() => setProgress(0), 500);
  }
};
```

### Complete Upload Flow Diagram

```
User Selects File
       ↓
[handleFileSelect triggered]
  - Store file in state
  - Clear error/success messages
       ↓
User Clicks "Upload Document"
       ↓
[handleUpload triggered]
       ↓
Validate: File selected? ✓ User authenticated? ✓
       ↓
Start loading animation & progress bar
       ↓
Generate SHA-256 hash of file contents
       ↓
Query Firebase: "Does this hash already exist for this user?"
       ↓
If YES → Show error "File already uploaded"
If NO  → Continue
       ↓
Upload to DocumentService
  - Save fileName, fileHash, fileSize, fileType
  - Record uploadedAt timestamp
  - Associate with userId
       ↓
Show success message
Clear selectedFile state
       ↓
Trigger refresh: setRefreshTrigger(prev => prev + 1)
       ↓
Load documents effect runs again
  - Fetches all documents for current user
  - Updates previousFiles array
       ↓
UI updates with new file in list
```

## 📂 File List Display

### Load Files on Mount & Refresh

```typescript
useEffect(() => {
  if (!userId) return;

  const loadPreviousFiles = async () => {
    try {
      setLoadingPrevious(true);
      // Query all summaries for current user
      const summaries = await SummaryService.getUserSummaries(userId);
      setPreviousFiles(summaries);
    } catch (err) {
      console.error('Error loading previous files:', err);
    } finally {
      setLoadingPrevious(false);
    }
  };

  loadPreviousFiles();
}, [userId, refreshTrigger]);  // Re-runs when userId or refreshTrigger changes
```

**Dependency Array Explanation:**
- `[userId, refreshTrigger]` = Run this effect when either value changes
- When user logs in: userId becomes available → runs
- When file is uploaded: refreshTrigger increments → runs
- When file is deleted: refreshTrigger increments → runs

### Render File List

```tsx
<div className="glass-surface p-6">
  <h3 className="text-lg font-semibold text-primary mb-3">Your Documents</h3>
  
  {loadingPrevious ? (
    <p className="text-muted text-sm">Loading your documents...</p>
  ) : previousFiles.length === 0 ? (
    <p className="text-muted text-sm">No documents uploaded yet. Upload a file to get started!</p>
  ) : (
    <div className="space-y-2">
      {previousFiles.map((file) => (
        <div key={file.id} className="flex items-center w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          
          {/* File Information */}
          <div className="flex-1 min-w-0">
            <div className="text-primary font-medium truncate">
              {file.fileName}
            </div>
            <div className="text-xs text-muted mt-1">
              {(file.fileSize / 1024).toFixed(2)} KB • 
              {new Date(file.createdAt).toLocaleDateString()} 
              {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteFile(file.id!, file.fileName)}
            disabled={isLoading}
            className="ml-4 flex-shrink-0 text-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 w-8 h-8 flex items-center justify-center rounded transition-colors disabled:opacity-50"
            title="Delete document"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

**Key Features:**
- **Loading State**: Shows "Loading..." while fetching
- **Empty State**: Shows message if no files yet
- **File Card**: Displays filename, size, and date
- **Hover Effect**: Background changes on hover
- **Delete Button**: Quick delete with visual feedback
- **Disabled State**: Button disabled while upload in progress

## 🗑️ File Deletion

### Delete Handler

```typescript
const handleDeleteFile = async (summaryId: string, fileName: string) => {
  // Step 1: Confirm with user
  if (!confirm(`Delete "${fileName}"?`)) return;

  try {
    // Step 2: Set loading state
    setIsLoading(true);

    // Step 3: Delete from Firestore
    await SummaryService.deleteSummary(summaryId);

    // Step 4: Show success message
    setSuccessMessage(`"${fileName}" deleted`);

    // Step 5: Refresh file list
    setRefreshTrigger(prev => prev + 1);
  } catch (err) {
    console.error('Error deleting file:', err);
    setError('Failed to delete file');
  } finally {
    setIsLoading(false);
  }
};
```

### Deletion Flow

```
User Clicks Delete Button (✕)
       ↓
Browser shows confirm dialog: "Delete 'file.pdf'?"
       ↓
User Clicks "OK"?
  YES → Continue
  NO  → Cancel (return early)
       ↓
Set isLoading = true
       ↓
Call SummaryService.deleteSummary(summaryId)
  - Uses Firestore deleteDoc() with document ID
  - Removes from 'summaries' collection
       ↓
Show success message: "file.pdf" deleted
       ↓
Increment refreshTrigger
       ↓
useEffect runs again
  - Calls getUserSummaries()
  - File no longer appears in list
       ↓
UI updates with file removed
```

## 🔗 Integration with Firebase

### DocumentService.uploadDocument()

```typescript
async uploadDocument(document: Omit<Document, 'id'>): Promise<string> {
  try {
    console.log('Uploading document:', document.fileName, 'for user:', document.userId);
    
    // Add to 'documents' collection
    const docRef = await addDoc(collection(db, 'documents'), {
      ...document,
      uploadedAt: document.uploadedAt,
      updatedAt: document.updatedAt,
    });
    
    console.log('Document uploaded successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}
```

### SummaryService.getSummaryByFileHash()

Used for duplicate detection:

```typescript
async getSummaryByFileHash(userId: string, fileHash: string): Promise<Summary | null> {
  try {
    // Query summaries where userId AND fileHash match
    const q = query(
      collection(db, 'summaries'),
      where('userId', '==', userId),
      where('fileHash', '==', fileHash)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;  // Not a duplicate
    }
    
    // Return existing file info
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error getting summary by file hash:', error);
    throw error;
  }
}
```

### SummaryService.deleteSummary()

```typescript
async deleteSummary(summaryId: string): Promise<void> {
  try {
    // Delete document from 'summaries' collection by ID
    const docRef = doc(db, 'summaries', summaryId);
    await deleteDoc(docRef);
    console.log('Summary deleted:', summaryId);
  } catch (error) {
    console.error('Error deleting summary:', error);
    throw error;
  }
}
```

## ⚙️ Progress Bar

```tsx
<ProgressBar 
  progress={progress} 
  isVisible={isLoading} 
  label="Uploading document..."
/>
```

Updates as file uploads:
- **0%** → Initial state
- **20%** → After hash generation
- **50%** → During upload
- **100%** → Upload complete

---

# 👤 Part 4: Profile Page Implementation

## Profile Page Overview

The Profile Page displays user account information and provides account management features. It includes:
1. **User Authentication Information** (email, verification status)
2. **Account Statistics** (summaries created, documents uploaded)
3. **Account Actions** (logout, preferences)
4. **Firebase Auth Integration**

**File**: `src/pages/ProfilePage.tsx`

## 🔐 Authentication & User Data

### Getting Current User

```typescript
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
    try {
      if (authUser) {
        // User is logged in
        setUser(authUser);
      } else {
        // User is logged out
        setUser(null);
      }
    } catch (err) {
      console.error('Error getting user:', err);
      setError('Failed to load user information');
    } finally {
      setLoading(false);
    }
  });

  return () => unsubscribe();
}, []);
```

**What This Does:**
- Listens for Firebase Auth state changes
- When user logs in: `authUser` is populated with User object
- When user logs out: `authUser` is null
- Sets loading state appropriately
- Handles errors gracefully

### User Object Structure (Firebase)

```typescript
interface User {
  uid: string;                  // Unique user ID
  email: string;                // User's email
  displayName: string | null;   // User's display name (if set)
  photoURL: string | null;      // Profile picture URL (if set)
  emailVerified: boolean;       // Whether email is verified
  isAnonymous: boolean;         // Whether user is anonymous
  metadata: {
    creationTime: string;       // Account creation timestamp
    lastSignInTime: string;     // Last login timestamp
  };
  // ... other properties
}
```

## 📊 Displaying User Information

### Email Display

```tsx
<div className="glass-surface p-6 rounded-lg mb-6">
  <h2 className="text-2xl font-semibold text-primary mb-4">Account Information</h2>
  
  {loading ? (
    <p className="text-muted">Loading profile...</p>
  ) : user ? (
    <div className="space-y-4">
      {/* Email Section */}
      <div>
        <label className="text-sm text-muted block mb-2">Email Address</label>
        <div className="flex items-center gap-3">
          <p className="text-primary font-medium">{user.email}</p>
          
          {/* Email Verification Badge */}
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-200 text-xs font-medium">
              ✓ Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-200 text-xs font-medium">
              ⚠ Unverified
            </span>
          )}
        </div>
      </div>

      {/* Account Creation Date */}
      <div>
        <label className="text-sm text-muted block mb-2">Account Created</label>
        <p className="text-primary">
          {new Date(user.metadata?.creationTime || '').toLocaleDateString()}
        </p>
      </div>

      {/* Last Sign In */}
      <div>
        <label className="text-sm text-muted block mb-2">Last Sign In</label>
        <p className="text-primary">
          {new Date(user.metadata?.lastSignInTime || '').toLocaleString()}
        </p>
      </div>
    </div>
  ) : (
    <p className="text-muted">No user information available</p>
  )}
</div>
```

## 📈 Account Statistics

### Load Statistics from Firestore

```typescript
const [stats, setStats] = useState({
  summariesCount: 0,
  documentsCount: 0,
  totalStorageUsed: 0,
});

useEffect(() => {
  if (!user) return;

  const loadStats = async () => {
    try {
      // Get all summaries for user
      const summaries = await SummaryService.getUserSummaries(user.uid);
      
      // Get all documents for user
      const documents = await DocumentService.getUserDocuments(user.uid);
      
      // Calculate total storage
      const totalSize = summaries.reduce((acc, s) => acc + s.fileSize, 0);

      setStats({
        summariesCount: summaries.length,
        documentsCount: documents.length,
        totalStorageUsed: totalSize,
      });
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  loadStats();
}, [user]);
```

### Display Statistics

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Summaries Stat */}
  <div className="glass-surface p-6 text-center rounded-lg">
    <div className="text-3xl font-bold text-[#3B82F6] mb-2">
      {stats.summariesCount}
    </div>
    <p className="text-sm text-muted">Summaries Generated</p>
  </div>

  {/* Documents Stat */}
  <div className="glass-surface p-6 text-center rounded-lg">
    <div className="text-3xl font-bold text-[#3B82F6] mb-2">
      {stats.documentsCount}
    </div>
    <p className="text-sm text-muted">Documents Uploaded</p>
  </div>

  {/* Storage Stat */}
  <div className="glass-surface p-6 text-center rounded-lg">
    <div className="text-3xl font-bold text-[#3B82F6] mb-2">
      {(stats.totalStorageUsed / 1024 / 1024).toFixed(2)} MB
    </div>
    <p className="text-sm text-muted">Storage Used</p>
  </div>
</div>
```

**What This Shows:**
- Total summaries created (counts documents in `summaries` collection)
- Total documents uploaded (counts documents in `documents` collection)
- Total storage used (sums all fileSize values)

## 🚪 Logout Functionality

### Logout Handler

```typescript
const handleLogout = async () => {
  try {
    // Confirm with user
    if (!confirm('Are you sure you want to sign out?')) return;

    // Sign out from Firebase
    await signOut(auth);
    
    // Navigate to login page
    navigate('/');
  } catch (err) {
    console.error('Logout error:', err);
    setError('Failed to sign out. Please try again.');
  }
};
```

### Logout Button

```tsx
<button
  onClick={handleLogout}
  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors mt-6"
>
  Sign Out
</button>
```

### What Happens on Logout

```
User Clicks "Sign Out" Button
       ↓
Confirmation dialog: "Are you sure?"
       ↓
User confirms
       ↓
signOut(auth) called
  - Clears Firebase Auth token
  - Removes session from browser storage
  - Triggers auth.onAuthStateChanged() in all components
       ↓
All components with userId/user state reset to null
  - NotesPage: userId = null
  - UploadPage: userId = null
  - ProfilePage: user = null
       ↓
navigate('/') routes to login page
       ↓
User returned to AuthPage
```

## 🔧 Account Settings

### Update Display Name

```typescript
const [displayName, setDisplayName] = useState('');
const [updatingName, setUpdatingName] = useState(false);

const handleUpdateDisplayName = async () => {
  if (!user || !displayName.trim()) return;

  try {
    setUpdatingName(true);
    
    // Update Firebase Auth profile
    await updateProfile(user, {
      displayName: displayName.trim(),
    });

    // Refresh user data
    setUser(await user.getIdTokenResult());
    setDisplayName('');
  } catch (err) {
    console.error('Error updating display name:', err);
    setError('Failed to update display name');
  } finally {
    setUpdatingName(false);
  }
};
```

### Display Name Form

```tsx
<div className="glass-surface p-6 rounded-lg mb-6">
  <h3 className="text-lg font-semibold text-primary mb-4">Update Profile</h3>
  
  <div>
    <label className="text-sm text-muted block mb-2">Display Name</label>
    <input
      type="text"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      placeholder="Enter your name"
      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-primary placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
    />
    
    <button
      onClick={handleUpdateDisplayName}
      disabled={updatingName || !displayName.trim()}
      className="w-full mt-3 bg-[#3B82F6] hover:brightness-110 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-all"
    >
      {updatingName ? 'Updating...' : 'Update Name'}
    </button>
  </div>
</div>
```

## 🔗 Complete Profile Page Flow

### Component Lifecycle

```
Component Mounts
       ↓
useEffect: Set up Auth listener
       ↓
auth.onAuthStateChanged fires
       ↓
If logged in:
  - Set user data
  - Load statistics from Firestore
  - Display profile information
       ↓
User can:
  - View account info
  - See statistics
  - Update display name
  - Sign out
       ↓
User Clicks Sign Out
       ↓
signOut(auth)
       ↓
Auth state changes → user = null
       ↓
Redirect to login page
```

## 📝 Page Structure

```tsx
export default function ProfilePage() {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({...});
  
  // Wrap with AmbientBackground for glass morphism theme
  return (
    <AmbientBackground>
      <ProgressBar isVisible={loading} label="Loading profile..." />
      
      <div className="w-full h-full pt-60 pb-12 px-6">
        
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="hero-title mb-4">My Account</h1>
          <p className="hero-subtitle">Manage your Clarity account and view your activity</p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Account Information */}
          {/* Statistics Grid */}
          {/* Update Profile Section */}
          {/* Danger Zone - Logout */}
          
        </div>
      </div>
    </AmbientBackground>
  );
}
```

## 🔐 Security Considerations

### Why Firestore Security Rules Matter

When accessing user data on the profile page:

```typescript
const summaries = await SummaryService.getUserSummaries(user.uid);
```

This is protected by:

```
match /summaries/{document=**} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

**Security Flow:**
1. User calls `getUserSummaries(userIdA)`
2. Query filters: `where('userId', '==', userIdA)`
3. Firestore Security Rule checks: `request.auth.uid == resource.data.userId`
4. If logged-in user ≠ userIdA → Query returns empty
5. User cannot see another user's summaries

## 📊 Key Takeaways

### Profile Page Features
1. **Authentication Display**: Shows email and verification status
2. **Account Statistics**: Real-time counts from Firestore
3. **User Management**: Update profile, change display name
4. **Logout**: Secure session termination
5. **Data Privacy**: All queries filtered by user UID

### Integration Points
- Firebase Authentication for user data
- SummaryService for summary statistics
- DocumentService for upload statistics
- Firebase Security Rules for data isolation
- Routing for login/logout navigation

### Error Handling
- Try-catch blocks for all async operations
- User-friendly error messages
- Loading states during operations
- Confirmation dialogs for destructive actions

---

## 🎬 Complete Demo Script - All Features

### **Total Demo Duration: ~6-7 minutes**

**Opening (30 seconds)**
- "Welcome to Clarity - a modern study aid built with React and Firebase"
- "Today we're showing three major features: Glass Morphism design, File Upload management, and User Profiles"

**Part 1: Glass Morphism Theme (1 minute)**
- Show animated background with gradient orbs
- Explain: "We use CSS backdrop-filter for frosted glass effect"
- Explain: "Animated orbs create visual interest without distraction"
- Show code in browser dev tools: `class="glass-surface"`

**Part 2: File Upload (2 minutes)**
- Upload a PDF file
- Show progress bar updating
- File appears in "Your Documents" list
- Try uploading same file → shows duplicate error
- Delete a file → confirm dialog → file removed
- Show Firebase console with documents collection

**Part 3: Profile Page (1.5 minutes)**
- Navigate to profile
- Show account information (email, verification, creation date)
- Show statistics (summaries, documents, storage)
- Show update display name functionality
- Show sign out button

**Part 4: Code Walkthrough (1.5 minutes)**
- Show SummaryService for data isolation
- Show UploadPage useState management
- Show handleUpload flow with duplicate detection
- Show ProfilePage loading statistics
- Emphasize: `where('userId', '==', userId)` in all queries

**Closing (30 seconds)**
- "All data encrypted and secure"
- "Fully responsive and performant"
- "Built with modern React patterns and Firebase best practices"

