import { Select } from "./Field";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";

export default function SortControl({
  value,
  direction,
  options,
  onChange,
  onToggleDirection,
  children,
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-carbon-800 shrink-0">
      <span className="text-xs text-carbon-500 shrink-0">Sort by</span>
      <Select
        size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 sm:flex-none sm:w-44"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={onToggleDirection}
        title={direction === "asc" ? "Ascending" : "Descending"}
        aria-label={`Sort direction: ${direction === "asc" ? "ascending" : "descending"}`}
        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-carbon-850 border border-carbon-700 text-carbon-300 hover:border-carbon-600 hover:text-white transition-colors shrink-0"
      >
        {direction === "asc" ? (
          <ArrowUpIcon className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownIcon className="w-3.5 h-3.5" />
        )}
      </button>
      {children && <div className="ml-auto shrink-0 pl-2">{children}</div>}
    </div>
  );
}
