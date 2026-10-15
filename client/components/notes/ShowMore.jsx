import { useEffect, useState } from "react";
import Button from "../ui/Button";

const PAGE_SIZE = 8;

export function usePaged(items, resetKey, size = PAGE_SIZE) {
  const [pages, setPages] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setPages(1);
  }
  const limit = pages * size;
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
    showMore: () => setPages((n) => n + 1),
  };
}

// columns of the 1 / sm:2 / lg:3 card grid at the current width
const GRID_QUERIES = ["(min-width: 1024px)", "(min-width: 640px)"];

function gridColumns() {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia(GRID_QUERIES[0]).matches) return 3;
  if (window.matchMedia(GRID_QUERIES[1]).matches) return 2;
  return 1;
}

export function useGridColumns() {
  const [columns, setColumns] = useState(gridColumns);
  useEffect(() => {
    const lists = GRID_QUERIES.map((q) => window.matchMedia(q));
    const update = () => setColumns(gridColumns());
    lists.forEach((list) => list.addEventListener("change", update));
    return () =>
      lists.forEach((list) => list.removeEventListener("change", update));
  }, []);
  return columns;
}

export default function ShowMore({ paged, className = "px-4" }) {
  if (paged.remaining === 0) return null;
  return (
    <div className={`py-2 border-b border-carbon-800 ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={paged.showMore}
        className="w-full"
      >
        Show more
        <span className="text-carbon-500">· {paged.remaining} left</span>
      </Button>
    </div>
  );
}
