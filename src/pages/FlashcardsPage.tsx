import { useState, useEffect } from "react";
import FlashcardInput from "../components/FlashCardComponents/FlashcardInput";
import FlashcardList from "../components/FlashCardComponents/FlashcardList";
import FlashcardSingleView from "../components/FlashCardComponents/FlashcardSingleView";
import FlashcardService from "../lib/openai/FlashcardService";
import ContentService from "../lib/firebase/ContentService";
import ProgressBar from "../components/ProgressBar";
import { auth } from "../lib/firebase";
import AmbientBackground from "../components/AmbientBackground";


export default function FlashcardsPage() {
  const [flashcardView, setFlashcardView] = useState(false);
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setUserId(user.uid);
        }
      });
      return unsubscribe;
    }, []);

  // Handle generate from text 
  const handleGenerate = async (content: string) => {
    try {
      setLoading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 300);

      const flashcards = await FlashcardService.generateFlashcards(content, {
        numCards: 10,
        style: "short",
        temperature: 0.4,
      });
      setProgress(100);
      setFlashcards(
        flashcards.map( card => ({
          front: card.front,
          back: card.back
        }))
      );
      setFlashcardView(true);
      clearInterval(progressInterval);

    } catch (error) { 
      console.error(error);
      alert("Failed to generate flashcards. Please try again");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  //handle generate from fileUpload
  const handleFileUpload = async (file: File) => {
  try {
    setLoading(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    const flashcards = await FlashcardService.generateFlashcardsFromFile(file);
    setProgress(100);
    setFlashcards(flashcards);
    setFlashcardView(true);
    clearInterval(progressInterval);
  } catch (err) {
    console.error(err);
    alert("Failed to generate from file.");
  } finally {
    setLoading(false);
    setTimeout(() => setProgress(0), 500);
  }
};

  // Handle back (from list view)
  const handleBack = () => {
    setFlashcardView(false);
  };

  const handleSaveDeck = async () => {
    if (!userId) {
      alert('Sign in to save flashcards to your profile.');
      return;
    }
    if (!flashcards || flashcards.length === 0) {
      alert('No flashcards to save.');
      return;
    }

    try {
      setSaving(true);
      setSavedId(null);
      const title = `Flashcards — ${new Date().toLocaleString()}`;
      const id = await ContentService.saveContent(userId, 'flashcards', {
        title,
        cards: flashcards,
        numCards: flashcards.length,
        style: 'short',
      });
      setSavedId(id);
      alert('Flashcards saved to your profile.');
    } catch (err) {
      console.error('Failed to save flashcards', err);
      alert('Failed to save flashcards.');
    } finally {
      setSaving(false);
    }
  };

  

  return (
    <AmbientBackground>
      <ProgressBar 
        progress={progress} 
        isVisible={loading} 
        label="Generating flashcards..."
      />
      <div className="w-full h-full px-6 ">
        <div className="w-full h-full pt-45 pb-12 px-6">
          {!flashcardView ? (
            <div>
              {/* Hero Section */}
              <div className="max-w-3xl mx-auto text-center mb-12">
                <h1 className="hero-title mb-4">Flashcards</h1>
                <p className="hero-subtitle mb-6">
                  Generate AI-powered flashcards from your notes or uploaded files
                </p>
                
                {/* Info Chip */}
                <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 text-sm text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Powered by OpenAI GPT</span>
                </div>
              </div>
              
              {/* Input selections */}
              <FlashcardInput onGenerate={handleGenerate} onFileUpload={handleFileUpload} loading={loading} userId={userId}/>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto px-6 space-y-16">
              <div className="flex justify-end gap-3">
                {userId ? (
                  <button onClick={handleSaveDeck} disabled={saving} className="px-4 py-2 bg-green-600 rounded text-white disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Flashcards'}
                  </button>
                ) : (
                  <div className="text-sm text-muted">Sign in to save generated flashcards</div>
                )}
                {savedId && <div className="text-sm text-green-300">Saved ✓</div>}
              </div>
              {/* Single card view section */}
              <section className="">
                <FlashcardSingleView flashcards={flashcards} onBack={handleBack} />
              </section>

              <hr className="border-white/20" />

              {/* Flashcard list section */}
              <section>
                <FlashcardList flashcards={flashcards}/>
              </section>
            </div>
          )}
        </div>
      </div>
    </AmbientBackground>
  );
}