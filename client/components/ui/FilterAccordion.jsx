import { useState } from "react";
import { ChevronDownIcon } from "./icons";
import CheckboxMark from "../favorites/CheckboxMark";

function CountBadge({ count }) {
  return (
    <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-accent text-2xs font-semibold text-white">
      {count}
    </span>
  );
}

export function FilterGroup({ activeCount = 0, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 border-b border-carbon-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full px-4 h-10 text-xs font-semibold text-carbon-200 hover:text-white transition-colors"
      >
        Filters
        {activeCount > 0 && <CountBadge count={activeCount} />}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-carbon-500 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="border-t border-carbon-800 px-4 py-3 space-y-3.5">
          {children}
        </div>
      )}
    </div>
  );
}

// a titled block inside FilterGroup, always expanded
export function FilterSection({
  title,
  children,
  activeCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
  scrollX = false,
}) {
  const allSelected = totalCount > 0 && activeCount === totalCount;

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[18px]">
        <h3 className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-carbon-500">
          {title}
          {activeCount > 0 && <CountBadge count={activeCount} />}
        </h3>
        {onSelectAll && onDeselectAll && (
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-carbon-400 hover:text-white transition-colors"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        )}
      </div>
      <div
        className={`flex gap-1.5 ${
          scrollX ? "flex-nowrap overflow-x-auto no-scrollbar" : "flex-wrap"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

export function FilterCheckbox({ checked, onChange, disabled, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs text-carbon-200 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      <CheckboxMark checked={checked} />
      {children}
    </button>
  );
}

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  activeCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
  scrollX = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const allSelected = totalCount > 0 && activeCount === totalCount;
  const showSelectAllToggle = open && onSelectAll && onDeselectAll;

  return (
    <div className="border-b border-carbon-800">
      <div className="flex items-center justify-between px-4 h-10">
        {/* A single button, not nested inside the select-all button below */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 h-full text-xs font-medium text-carbon-300 hover:text-white transition-colors"
        >
          {title}
          {activeCount > 0 && <CountBadge count={activeCount} />}
          <ChevronDownIcon
            className={`w-3.5 h-3.5 text-carbon-500 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {showSelectAllToggle && (
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-carbon-400 hover:text-white transition-colors"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        )}
      </div>
      {open && (
        <div
          className={`px-4 pb-3 flex gap-1.5 ${
            scrollX ? "flex-nowrap overflow-x-auto no-scrollbar" : "flex-wrap"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const TONE_PILL_CLASS = {
  positive: "bg-signal-green border-signal-green text-carbon-950",
  negative: "bg-signal-red border-signal-red text-carbon-950",
  neutral: "bg-signal-amber border-signal-amber text-carbon-950",
};

export function Pill({ active, onClick, children, tone }) {
  const activeClass = tone
    ? TONE_PILL_CLASS[tone]
    : "bg-carbon-100 border-carbon-100 text-carbon-950";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`shrink-0 h-7 px-3 inline-flex items-center rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? activeClass
          : "bg-transparent border-carbon-700 text-carbon-400 hover:border-carbon-500 hover:text-carbon-100"
      }`}
    >
      {children}
    </button>
  );
}
