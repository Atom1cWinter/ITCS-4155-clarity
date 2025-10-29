import { useState } from "react";

interface flashcard {
    front: string;
    back: string
}

interface FlashcardSingleViewProps {
    flashcards: flashcard[];
    onBack: () => void;

}

export default function FlashcardSingleView ({flashcards, onBack}: FlashcardSingleViewProps) {

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    const handlePreviousCard = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setShowAnswer(false);
        }
    };

    const handleNextCard = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(true);
    };

    const handleHideAnswer = () => {
        setShowAnswer(false);
    };
    
    return (
        <div className="max-w-3xl mx-auto px-4">
            <div className="flex justify-between items-center mb-8 relative-z-10">
                <h2 className="text-2xl font-bold text-white">Generated Flashcards</h2>
                <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                onClick={onBack}
                >
                ← Back
                </button>
            </div>

            <div className="px-4 pt-5 flex flex-row justify-between items-center gap-6 ">
            {/* Left arrow */}
            <button
            onClick={handlePreviousCard}
            disabled={currentIndex === 0}
            className=" bg-gray-500 border border-black rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-900 disabled:opacity-30"
            >
            ‹
            </button>

            {/* Flashcard Display */}
            <div
            className="w-full min-h-[200px] h-80 bg-white text-black rounded-lg shadow-md flex items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.01]"
            onClick={showAnswer ? handleHideAnswer : handleShowAnswer}
            >
            <p className="text-lg font-medium">
                {showAnswer ? flashcards[currentIndex].back : flashcards[currentIndex].front}
            </p>
            </div>
                
            <button
                onClick={handleNextCard}
                disabled={currentIndex === flashcards.length - 1}
                className=" bg-gray-500 border border-black rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-900 disabled:opacity-30"
                >
                ›
            </button>            
            </div>

            <div className="text-xl px-4 pt-6">
                <h3> Card {currentIndex + 1} out of {flashcards.length} </h3>
            </div>

        </div>
    );
}
