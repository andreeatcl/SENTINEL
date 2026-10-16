import { useState } from "react";
import Button from "./Button";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const PAGE_SIZE = 8;

export function usePaged(items, resetKey, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setPage(1);
  }
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  // clamped so deletes or a narrower grid never leave an empty page
  const current = Math.min(page, pageCount);
  const start = (current - 1) * size;
  return {
    visible: items.slice(start, start + size),
    page: current,
    pageCount,
    setPage,
  };
}

// first, last, current +/- 1, ... max 7 slots
function pageSlots(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const from = Math.max(2, Math.min(page - 1, count - 4));
  const to = Math.min(count - 1, Math.max(page + 1, 5));
  const slots = [1];
  if (from > 2) slots.push("gap-start");
  for (let n = from; n <= to; n++) slots.push(n);
  if (to < count - 1) slots.push("gap-end");
  slots.push(count);
  return slots;
}

export default function Pager({ paged, scrollRef, className = "px-4" }) {
  const { page, pageCount } = paged;
  if (pageCount <= 1) return null;
  const setPage = (next) => {
    paged.setPage(next);
    scrollRef?.current?.scrollTo({ top: 0 });
  };
  return (
    <nav
      aria-label="Pages"
      className={`flex items-center justify-between gap-2 py-2 border-b border-carbon-800 ${className}`}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex items-center gap-1">
        {pageSlots(page, pageCount).map((slot) =>
          typeof slot === "string" ? (
            <span
              key={slot}
              className="w-5 text-center text-xs text-carbon-600"
            >
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              onClick={() => setPage(slot)}
              aria-current={slot === page ? "page" : undefined}
              className={`min-w-7 h-7 px-1.5 rounded-md text-xs tabular-nums transition-colors ${
                slot === page
                  ? "bg-carbon-800 text-white font-medium"
                  : "text-carbon-400 hover:bg-carbon-800 hover:text-white"
              }`}
            >
              {slot}
            </button>
          ),
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setPage(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon className="w-3.5 h-3.5" />
      </Button>
    </nav>
  );
}
