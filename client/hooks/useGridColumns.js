import { useEffect, useState } from "react";

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
