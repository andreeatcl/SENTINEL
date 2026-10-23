import { topicLabel } from "../../utils/favorites";
import { formatDate } from "../../utils/newsApi";
import { plural } from "../../utils/notesOverview";
import { CountryMark } from "../CountryPicker";
import { ROW_META_CLASS } from "../articles/ArticleCard";
import { Eyebrow } from "../ui/Field";
import NoteItemRow from "./NoteItemRow";
import Pager from "../ui/Pager";

export function SectionHeader({ label, count, divider = true }) {
  return (
    <div
      className={`flex items-center justify-between px-5 pt-4 pb-1.5 ${
        divider ? "border-b border-carbon-800" : ""
      }`}
    >
      <Eyebrow>{label}</Eyebrow>
      <span className="text-2xs text-carbon-500">{count}</span>
    </div>
  );
}

function EntryRow({ country, code, entry, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(country)}
      className="block w-full text-left px-4 py-3 border-b border-carbon-800 hover:bg-carbon-850 transition-colors group"
    >
      <div className="flex items-center gap-1.5 mb-1 min-w-0">
        <span className={`${ROW_META_CLASS} shrink-0`}>
          {formatDate(entry.createdAt, { withYear: true })}
        </span>
        <span className="ml-auto pl-2 flex items-center gap-1.5 min-w-0 max-w-[40%]">
          <span className="text-2xs text-carbon-500 truncate">{country}</span>
          <CountryFlag country={country} code={code} />
        </span>
      </div>
      {entry.title && (
        <p className="text-sm font-medium text-carbon-100 group-hover:text-white leading-snug line-clamp-1 transition-colors">
          {entry.title}
        </p>
      )}
      {entry.text && (
        <p className="mt-1.5 pl-2.5 border-l-2 border-carbon-700 text-xs text-carbon-300 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
          {entry.text}
        </p>
      )}
    </button>
  );
}

function CountryFlag({ country, code }) {
  return <CountryMark code={code ?? country.slice(0, 2).toUpperCase()} />;
}

export function NoteResult({ result, codes, onOpenCountry, onOpenItem }) {
  const country =
    result.kind === "entry" ? result.country : result.note.context?.country;
  return result.kind === "entry" ? (
    <EntryRow
      country={country}
      code={codes?.get(country)}
      entry={result.entry}
      onOpen={onOpenCountry}
    />
  ) : (
    <NoteItemRow
      item={result.note}
      excerpt={result.note.text}
      label={topicLabel(result.note)}
      labelMark={
        country && <CountryFlag country={country} code={codes?.get(country)} />
      }
      onOpen={onOpenItem}
    />
  );
}

export function CountryChip({ summary, code, onOpen }) {
  const details = [
    summary.entries && plural(summary.entries, "entry", "entries"),
    summary.items && plural(summary.items, "item note"),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={() => onOpen(summary.country)}
      title={`${summary.country} — ${details}`}
      aria-label={`${summary.country}, ${details}`}
      className="flex items-center justify-between gap-2 h-9 px-2.5 rounded-md border border-carbon-800 bg-carbon-850 hover:border-carbon-600 hover:bg-carbon-800 transition-colors"
    >
      <CountryFlag country={summary.country} code={code} />
      <span className="text-xs font-medium tabular-nums text-carbon-200">
        {summary.total}
      </span>
    </button>
  );
}

export const PAGES = [
  {
    id: "countries",
    label: "Countries",
    placeholder: "Search entries, countries…",
  },
  {
    id: "items",
    label: "Item notes",
    placeholder: "Search item notes, titles, sources…",
  },
];

export function PageTabs({ page, onChange, counts, pages = PAGES }) {
  return (
    <div
      className="flex items-center gap-5 px-5 border-b border-carbon-800"
      role="tablist"
    >
      {pages.map((p) => {
        const active = page === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            className={`relative h-9 text-sm font-medium transition-colors ${
              active ? "text-white" : "text-carbon-500 hover:text-carbon-200"
            }`}
          >
            {p.label}
            {counts && (
              <span className="ml-1.5 text-2xs text-carbon-500">
                {counts[p.id]}
              </span>
            )}
            {active && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ResultList({ paged, codes, onOpenCountry, onOpenItem }) {
  return (
    <>
      {paged.visible.map((result) => (
        <NoteResult
          key={result.key}
          result={result}
          codes={codes}
          onOpenCountry={onOpenCountry}
          onOpenItem={onOpenItem}
        />
      ))}
      <Pager paged={paged} className="px-5" />
    </>
  );
}
