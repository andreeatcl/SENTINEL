import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadCountriesGeoJson, toCountryList } from "../utils/countries";
import { getFlagSrc } from "../utils/flags";
import { FIELD, Input } from "./ui/Field";
import { CheckIcon, ChevronDownIcon } from "./ui/icons";

function normalize(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matches(country, needle) {
  if (!needle) return true;
  return (
    normalize(country.name).includes(needle) ||
    country.code.toLowerCase() === needle
  );
}

export function CountryMark({ code }) {
  const flagSrc = getFlagSrc(code);
  if (flagSrc) {
    return (
      <img
        src={flagSrc}
        alt=""
        className="w-5 h-[15px] rounded-sm shrink-0 object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <span className="w-5 shrink-0 text-center font-mono text-2xs text-carbon-500">
      {code}
    </span>
  );
}

export default function CountryPicker({ value, onSelect }) {
  const [countries, setCountries] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    let canceled = false;
    loadCountriesGeoJson()
      .then((data) => !canceled && setCountries(toCountryList(data)))
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    return countries.filter((country) => matches(country, needle));
  }, [countries, query]);

  const selected = countries.find((country) => country.name === value) || null;

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(country) {
    close();
    onSelect(country.name);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointer(e) {
      if (!rootRef.current?.contains(e.target)) close();
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => setActiveIndex(0), [query]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visible[activeIndex]) choose(visible[activeIndex]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={countries.length === 0}
        className={`${FIELD} relative h-7 w-48 max-w-[60vw] pl-2 pr-7 inline-flex items-center gap-2 text-xs text-left cursor-pointer disabled:opacity-50 disabled:cursor-default`}
      >
        {selected && <CountryMark code={selected.code} />}
        <span
          className={`truncate ${selected ? "text-carbon-100" : "text-carbon-400"}`}
        >
          {selected ? selected.name : "Choose a country"}
        </span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-carbon-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-1.5rem)] flex flex-col bg-carbon-900 border border-carbon-800 rounded-xl shadow-panel overflow-hidden animate-pop-in">
          <div className="p-2 border-b border-carbon-800">
            <Input
              size="sm"
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search countries…"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={
                visible[activeIndex] ? `${listId}-${activeIndex}` : undefined
              }
              aria-label="Search countries"
              className="w-full max-sm:!text-base"
            />
          </div>

          {visible.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-carbon-500">
              No country matches “{query}”
            </p>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Countries"
              className="max-h-72 overflow-y-auto py-1"
            >
              {visible.map((country, i) => {
                const isSelected = country.name === value;
                return (
                  <li
                    key={country.name}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActiveIndex(i)}
                    onClick={() => choose(country)}
                    className={`flex items-center gap-2.5 px-3 h-9 cursor-pointer text-xs transition-colors ${
                      i === activeIndex
                        ? "bg-carbon-850 text-white"
                        : "text-carbon-200"
                    }`}
                  >
                    <CountryMark code={country.code} />
                    <span className="truncate flex-1">{country.name}</span>
                    {isSelected && (
                      <CheckIcon className="w-3.5 h-3.5 text-carbon-300 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
