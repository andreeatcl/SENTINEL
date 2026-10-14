import { useState } from "react";
import Button from "../ui/Button";

const PAGE_SIZE = 12;

export function usePaged(items, resetKey, size = PAGE_SIZE) {
  const [limit, setLimit] = useState(size);
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setLimit(size);
  }
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
    showMore: () => setLimit((n) => n + size),
  };
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
