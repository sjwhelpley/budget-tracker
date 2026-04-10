"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  name: string;
  placeholder?: string;
  required?: boolean;
  suggestions: string[];
};

export function PayeeAutocompleteInput({
  name,
  placeholder,
  required,
  suggestions,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = value.trim().toLocaleLowerCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions
      .filter((s) => s.toLocaleLowerCase().includes(q))
      .slice(0, 8);
  }, [suggestions, value]);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function pick(v: string) {
    setValue(v);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        autoComplete="off"
        className={`w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
          isOpen && filtered.length > 0 ? "rounded-t-lg rounded-b-none" : "rounded-lg"
        }`}
        name={name}
        onChange={(e) => {
          setValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(e) => {
          if (!isOpen || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((i) => (i < 0 ? 0 : (i + 1) % filtered.length));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((i) =>
              i <= 0 ? filtered.length - 1 : i - 1,
            );
            return;
          }
          if (e.key === "Enter" && highlightedIndex >= 0) {
            e.preventDefault();
            pick(filtered[highlightedIndex]);
            return;
          }
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />

      {isOpen && filtered.length > 0 ? (
        <div className="absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-b-lg border border-t-0 border-zinc-200 bg-white shadow-lg">
          {filtered.map((option, index) => (
            <button
              className={`block w-full px-3 py-2 text-left text-sm ${
                index === highlightedIndex
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-800 hover:bg-zinc-50"
              }`}
              key={option}
              onClick={() => pick(option)}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

