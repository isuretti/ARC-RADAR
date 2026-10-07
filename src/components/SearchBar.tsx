import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Search…', initialValue = '', autoFocus }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch(value.trim());
      }
    },
    [value, onSearch],
  );

  const handleClear = () => {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex items-center">
      <Search
        size={14}
        className="absolute left-3 text-[var(--subtle)] pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--ink)] placeholder-[var(--subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--border-strong)] transition-all"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 text-[var(--subtle)] hover:text-[var(--muted)]"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
