import { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export default function Autocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: AutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Фильтруем подсказки при вводе
  useEffect(() => {
    if (!value.trim()) {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const lower = value.toLowerCase();
    const matches = suggestions.filter(s =>
      s.toLowerCase().startsWith(lower) && s.toLowerCase() !== lower
    );
    setFiltered(matches.slice(0, 8));
    setShowDropdown(matches.length > 0);
    setActiveIdx(-1);
  }, [value, suggestions]);

  // Закрываем при клике вне компонента
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      onChange(filtered[activeIdx]);
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        className={`form-input ${className || ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value && filtered.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--tg-section-bg)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          marginTop: 2,
          maxHeight: 200,
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {filtered.map((s, i) => (
            <div
              key={s}
              onClick={() => {
                onChange(s);
                setShowDropdown(false);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: 14,
                background: i === activeIdx ? 'var(--tg-secondary-bg)' : 'transparent',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}