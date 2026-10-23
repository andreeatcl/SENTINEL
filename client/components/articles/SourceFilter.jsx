import { useMemo, useState } from "react";
import { getDomain } from "../../utils/url";
import { FilterCheckbox, Pill } from "../ui/FilterAccordion";
import { ChevronDownIcon } from "../ui/icons";

// hide certain domains for a search (not permanent)
export default function SourceFilter({ articles, hidden, onChange }) {
  const [open, setOpen] = useState(false);

  const domains = useMemo(() => {
    const counts = new Map(hidden.map((d) => [d, 0]));
    articles.forEach((a) => {
      const domain = getDomain(a.url);
      if (domain) counts.set(domain, (counts.get(domain) || 0) + 1);
    });
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [articles, hidden]);

  function toggle(domain) {
    onChange(
      hidden.includes(domain)
        ? hidden.filter((d) => d !== domain)
        : [...hidden, domain],
    );
  }

  if (!domains.length) return null;

  return (
    <>
      <Pill active={hidden.length > 0} onClick={() => setOpen((o) => !o)}>
        {hidden.length ? `${hidden.length} hidden` : "Pick sources"}
        <ChevronDownIcon
          className={`w-3 h-3 ml-1 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Pill>
      {open && (
        <div className="basis-full">
          <div className="max-h-48 overflow-y-auto grid sm:grid-cols-2 gap-x-4 gap-y-1.5 py-1">
            {domains.map(([domain, count]) => (
              <FilterCheckbox
                key={domain}
                checked={!hidden.includes(domain)}
                onChange={() => toggle(domain)}
              >
                <span className="truncate min-w-0">{domain}</span>
                <span className="text-2xs text-carbon-500">{count}</span>
              </FilterCheckbox>
            ))}
          </div>
          {hidden.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1.5 text-xs text-carbon-400 hover:text-white transition-colors"
            >
              Show all
            </button>
          )}
        </div>
      )}
    </>
  );
}
