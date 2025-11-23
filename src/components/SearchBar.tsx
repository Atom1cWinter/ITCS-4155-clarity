interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  error?: string | null;
  isSearching?: boolean;
}

export default function SearchBar({ searchTerm, onSearchChange, error, isSearching }: SearchBarProps) {
  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search notes and materials…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={isSearching}
          className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors text-primary placeholder-muted disabled:opacity-50"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
