# Clarity - Class Project

A simple React + TypeScript web application built for our class assignment. This project demonstrates modern web development with Firebase authentication and basic note-taking features.

## 🎯 Project Overview

**Clarity** is a student-built web app that includes:
- User authentication (login/signup) using Firebase
- Notes page for creating and managing text notes  
- Flashcards page for creating and studying flashcards
- Clean, responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v4** for styling
- **Firebase** for authentication and database

## 📁 Project Structure

```
src/
├── pages/              # Main application pages
│   ├── AuthPage.tsx    # Login/signup page
│   ├── NotesPage.tsx   # Notes management
│   └── FlashcardsPage.tsx  # Flashcard creation and study
├── components/         # Reusable UI components
│   └── Button.tsx      # Basic button component
│   └── NavBar.tsx      # Basic navigation component
├── lib/               # Firebase configuration
│   └── firebase.ts    # Firebase initialization
├── App.tsx            # Main app component
├── main.tsx          # App entry point
└── index.css         # Global styles with Tailwind

docs/
└── FIREBASE_SETUP.md  # Firebase configuration guide
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Firebase account for backend services

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Atom1cWinter/ITCS-4155-clarity.git
   cd clarity
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Follow the setup guide in `docs/FIREBASE_SETUP.md`
   - Create a `.env.local` file with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Set up OpenAI:
   - Go to https://platform.openai.com/api-keys
   - Generate a new secret key
   - Add the following line to your '.env.local' file:
   ```env
   VITE_OPENAI_API_KEY=your_openai_secret_api_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📱 Features

### Authentication
- User registration and login
- Firebase authentication integration
- Protected routes for authenticated users

### Notes
- Create, view, and delete text notes
- Timestamps for note creation
- Simple and clean interface

### Flashcards  
- Create flashcard pairs (front/back)
- Study mode with card flipping
- Navigate through flashcard deck
- Delete unwanted flashcards

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Environment Setup

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **⚠️ SECURITY NOTICE**: The `.env.local` file is included in this repository for private class project collaboration. **If this repository becomes public, immediately add `.env.local` to `.gitignore` and remove it from version control!**

## 🔒 Security Best Practices

- **Private Repository**: Environment variables are shared for team collaboration
- **Before Going Public**: Remove `.env.local` from tracking with:
  ```bash
  echo ".env.local" >> .gitignore
  git rm --cached .env.local
  git commit -m "Remove environment file from tracking"
  ```
- **Production**: Use proper environment variable management in deployment

## 📚 Documentation

- [Firebase Setup Guide](./docs/FIREBASE_SETUP.md) - Complete Firebase configuration steps

## 👥 Team Members

- Bryan Witherspoon
- Cameron Dingle
- Jonathan Pina Elacio
- Sam Phillips
- Sebastian Lopez-Gallardo

## 📝 Class Information

- **Course**: ITSC 4155 Section 003
- **Semester**: Fall 2025
- **Instructor**: Mary Sun

---

*This is a student project created for educational purposes.*
