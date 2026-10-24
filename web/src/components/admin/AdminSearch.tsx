"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { adminSectionTitles, type AdminSection } from "@/lib/admin-navigation";
import styles from "./AdminShell.module.css";

export type AdminSearchResult = { id: string; label: string; hint: string; section: AdminSection; onSelect: () => void };

export default function AdminSearch({ value, onChange, results, inputRef }: {
  value: string;
  onChange: (value: string) => void;
  results: AdminSearchResult[];
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const open = focused && Boolean(value.trim());
  const activeIndex = Math.max(0, results.findIndex(result => result.id === activeId));
  const activeResult = results[activeIndex];
  const choose = (result: AdminSearchResult) => { result.onSelect(); setFocused(false); setActiveId(null); };
  const move = (direction: 1 | -1) => {
    if (!results.length) return;
    const next = (activeIndex + direction + results.length) % results.length;
    setActiveId(results[next].id);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  return <div className={styles.searchControl}>
    <input
      ref={inputRef} type="search" role="combobox" aria-autocomplete="list"
      aria-label="Search admin sections and content" aria-expanded={open}
      aria-controls={open ? `${id}-results` : undefined}
      aria-activedescendant={open && activeResult ? `${id}-option-${activeIndex}` : undefined}
      aria-describedby={`${id}-help`}
      className={styles.searchInput} placeholder="Search pages and content…" value={value}
      onChange={event => { onChange(event.target.value); setActiveId(null); setFocused(true); }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); onChange(""); setFocused(false); setActiveId(null); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setFocused(true);
          if (open) move(event.key === "ArrowDown" ? 1 : -1);
        }
        if (event.key === "Enter" && open && activeResult) { event.preventDefault(); choose(activeResult); }
      }}
    />
    <span id={`${id}-help`} className="sr-only">Use up and down arrows to choose a result, Enter to open it, and Escape to close. Shortcut: Control or Command K.</span>
    {open && <div className={styles.searchPopover}>
      <div ref={listRef} id={`${id}-results`} role="listbox" aria-label="Admin search results" className={styles.searchResults}>
        {results.map((result, index) => <div key={result.id} id={`${id}-option-${index}`} role="option" aria-selected={index === activeIndex}
          className={styles.searchOption} onMouseDown={event => event.preventDefault()} onClick={() => choose(result)}>
          <span className={styles.searchResultText}><strong>{result.label}</strong><small>{result.hint}</small></span>
          <span className={styles.searchResultSection}>{adminSectionTitles[result.section]}</span>
        </div>)}
      </div>
      {!results.length && <p role="status" className={styles.searchEmpty}>No matches found.</p>}
      <p className="sr-only" role="status">{results.length} results available.</p>
    </div>}
  </div>;
}
