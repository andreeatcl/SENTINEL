import { useEffect, useState } from "react";
import {
  getSavedSearches,
  removeSavedSearch,
  renameSavedSearch,
} from "../../utils/storage";
import { Input } from "../ui/Field";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

const SORT_LABELS = {
  relevancy: "Relevance",
  publishedAt: "Date",
  popularity: "Popularity",
};

function savedMeta(item) {
  if (!item.q) return "Older save · uses current keywords";
  return [
    item.raw ? "Search" : item.topic,
    item.timeRange,
    SORT_LABELS[item.sortBy],
    item.useTopSourcesOnly && "Top sources",
    item.englishOnly && "English",
    item.sourcePriority === "trusted" && "Trusted first",
    item.sourcePriority === "state-affiliated" && "State media first",
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function SavedSearchesPanel({ isOpen, onClose, onRun }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [renaming, setRenaming] = useState(null);

  useEffect(() => {
    if (isOpen) setSavedSearches(getSavedSearches());
    else setRenaming(null);
  }, [isOpen]);

  function commitRename() {
    if (renaming?.label.trim()) {
      renameSavedSearch(renaming.id, renaming.label);
      setSavedSearches(getSavedSearches());
    }
    setRenaming(null);
  }

  function handleRemove(id) {
    removeSavedSearch(id);
    setSavedSearches((current) => current.filter((item) => item.id !== id));
  }

  function handleRun(search) {
    onRun(search);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saved searches"
      subtitle="Stored on this device"
    >
      {savedSearches.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          description="Open a country's feed and use Save search to add one."
        />
      ) : (
        savedSearches.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 px-5 py-3 border-b border-carbon-800 last:border-b-0 hover:bg-carbon-850 transition-colors group"
          >
            {renaming?.id === item.id ? (
              <form
                className="min-w-0 flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  commitRename();
                }}
              >
                <Input
                  size="sm"
                  autoFocus
                  value={renaming.label}
                  maxLength={80}
                  onChange={(e) =>
                    setRenaming({ ...renaming, label: e.target.value })
                  }
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                  aria-label="Search name"
                  className="w-full max-sm:!text-base"
                />
              </form>
            ) : (
              <button
                onClick={() => handleRun(item)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-medium text-carbon-100 group-hover:text-white leading-snug truncate transition-colors">
                  {item.label}
                </p>
                {(item.q || item.extraKeywords) && (
                  <p
                    className="text-xs font-mono text-carbon-500 truncate mt-0.5"
                    title={item.q || item.extraKeywords}
                  >
                    {item.q || item.extraKeywords}
                  </p>
                )}
                <p className="text-2xs text-carbon-400 mt-0.5">
                  {savedMeta(item)}
                </p>
              </button>
            )}
            <div className="flex items-center shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRenaming({ id: item.id, label: item.label })}
              >
                Rename
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleRemove(item.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}
