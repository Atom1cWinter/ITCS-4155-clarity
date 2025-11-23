import { highlightSearchTerm } from '../lib/SearchService';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
}

export default function HighlightedText({ text, searchTerm }: HighlightedTextProps) {
  if (!searchTerm.trim()) {
    return <>{text}</>;
  }

  const parts = highlightSearchTerm(text, searchTerm);

  return (
    <>
      {parts.map((part, idx) =>
        part.type === 'highlight' ? (
          <mark key={idx} className="bg-yellow-400/30 text-yellow-100 font-semibold">
            {part.value}
          </mark>
        ) : (
          <span key={idx}>{part.value}</span>
        )
      )}
    </>
  );
}
