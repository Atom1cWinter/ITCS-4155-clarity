# Firebase Setup Guide for Clarity

This guide explains how to configure and use Firebase as your database for the Clarity project.

## 📋 What's Been Set Up

✅ Firebase SDK installed  
✅ Environment configuration  
✅ Firebase services initialization  
✅ TypeScript types and utilities  
✅ Database helper functions  
✅ Example service classes  

## 🔧 Configuration Required

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Follow the setup wizard
4. Enable Firestore Database in your project
5. Set up authentication if needed

### 2. Get Your Firebase Configuration

1. In your Firebase project, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a name (e.g., "Clarity Web App")
5. Copy the configuration object

### 3. Update Environment Variables

Edit the `.env` file in your project root and replace the placeholder values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id

# Optional: Analytics
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

### 4. Configure Firestore Security Rules

In your Firebase Console, go to Firestore Database > Rules and set up appropriate security rules. Here's a basic example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tasks are readable by authenticated users, writable by owner
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || resource.data.assignedTo == request.auth.uid);
    }
    
    // Projects are readable by members, writable by owner
    match /projects/{projectId} {
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.members || 
         request.auth.uid == resource.data.owner);
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.owner);
    }
  }
}
```

## 🚀 Usage Examples

### Basic Database Operations

```typescript
import { TaskService } from './services/examples';
import type { CreateDocument, Task } from './types/firebase';

// Create a new task
const newTask: CreateDocument<Task> = {
  title: 'Complete Firebase setup',
  description: 'Set up Firebase for the Clarity project',
  completed: false,
  priority: 'high',
  assignedTo: 'user123'
};

const taskId = await TaskService.createTask(newTask);

// Get a task
const task = await TaskService.getTask(taskId);

// Update a task
await TaskService.updateTask(taskId, { completed: true });

// Get tasks by user
const userTasks = await TaskService.getTasksByUser('user123');
```

### Using Database Utilities Directly

```typescript
import { addDocument, getDocuments, updateDocument } from './lib/database';
import { Collections } from './types/firebase';

// Add a document
const docId = await addDocument('custom-collection', {
  name: 'Example',
  value: 42
});

// Get all documents from a collection
const docs = await getDocuments(Collections.TASKS);

// Update a document
await updateDocument('custom-collection', docId, {
  value: 100
});
```

## 📁 Project Structure

```
src/
├── config/
│   └── firebase.ts          # Firebase configuration
├── lib/
│   ├── firebase.ts          # Firebase initialization
│   └── database.ts          # Database utilities
├── types/
│   └── firebase.ts          # TypeScript types
└── services/
    └── examples.ts          # Example service classes
```

## 🔐 Security Best Practices

1. **Never commit your `.env` file** - it's already added to `.gitignore`
2. **Use Firestore Security Rules** to protect your data
3. **Validate data on the client and server side**
4. **Use TypeScript types** for better type safety
5. **Handle errors appropriately** in your application

## 🔄 Development Workflow

1. **Start your dev server**: `npm run dev`
2. **Set up your Firebase project** and update `.env`
3. **Use the service classes** in your React components
4. **Test your database operations** in the browser console

## 📚 Next Steps

1. Set up Firebase Authentication for user management
2. Create your data models based on your app requirements
3. Implement real-time listeners for live updates
4. Add Firebase Storage for file uploads if needed
5. Set up Firebase Functions for server-side logic

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to get document" errors**: Check your Firestore security rules
2. **Environment variables not loading**: Make sure you restart your dev server after updating `.env`
3. **TypeScript errors**: Ensure all Firebase types are properly imported
4. **Network errors**: Check your Firebase project configuration

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase TypeScript Support](https://firebase.google.com/docs/reference/js)

---

Your Firebase setup is complete! Update your `.env` file with your actual Firebase configuration to start using the database.