import { useState, useEffect } from "react";
import FlashcardInput from "../components/FlashCardComponents/FlashcardInput";
import FlashcardList from "../components/FlashCardComponents/FlashcardList";
import FlashcardSingleView from "../components/FlashCardComponents/FlashcardSingleView";
import FlashcardService from "../lib/openai/FlashcardService";
import { auth } from "../lib/firebase"


export default function FlashcardsPage() {
  const [flashcardView, setFlashcardView] = useState(false);
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

      const flashcards = await FlashcardService.generateFlashcards(content, {
        numCards: 10,
        style: "short",
        temperature: 0.4,
      });
      setFlashcards(
        flashcards.map( card => ({
          front: card.front,
          back: card.back
        }))
      );
      setFlashcardView(true);

    } catch (error) { 
      console.error(error);
      alert("Failed to generate flashcards. Please try again");
    } finally {
      setLoading(false);
    }
  };

  //handle generate from fileUpload
  const handleFileUpload = async (file: File) => {
  try {
    setLoading(true);
    const flashcards = await FlashcardService.generateFlashcardsFromFile(file);
    setFlashcards(flashcards);
    setFlashcardView(true);
  } catch (err) {
    console.error(err);
    alert("Failed to generate from file.");
  } finally {
    setLoading(false);
  }
};

  // Handle back (from list view)
  const handleBack = () => {
    setFlashcardView(false);
  };

  

  return (
    <div className="w-full h-full px-6 ">
      <div className="w-full h-full pt-45 pb-12 px-6">
        {!flashcardView ? (
          //input selections
          <FlashcardInput onGenerate={handleGenerate} onFileUpload={handleFileUpload} loading={loading} userId={userId}/>
        ) : (
          <div className="max-w-5xl mx-auto px-6 space-y-16">
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
  );
}