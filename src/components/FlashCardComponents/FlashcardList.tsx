interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardListProps {
  flashcards: Flashcard[];
}


export default function FlashcardList({ flashcards}: FlashcardListProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-7">

      {/* Flashcard list (1 column) */}
      <div className="flex flex-col items-center gap-6">
        {flashcards.map((card, index) => (
          <div
            key={index}
            className="w-full h-72 flex items-stretch bg-gray-800 border border-white/10 rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.01]"
          >
            {/* front side */}
            <div className="w-1/2 p-6 text-left flex items-center justify-start bg-white/5">
              <h3 className="text-lg font-semibold text-white leading-snug">
                {card.front}
              </h3>
            </div>

            {/* back side */}
            <div className="w-1/2 p-6 text-right flex items-center justify-end border-l border-white/10">
              <p className="text-gray-300 text-sm leading-snug">{card.back}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}