import { useState } from "react";
import Button, { IconButton } from "../ui/Button";
import { CheckIcon, CloseIcon } from "../ui/icons";

const TABS = [
  { id: "notes", label: "Notes" },
  { id: "events", label: "Events" },
  { id: "articles", label: "Articles" },
];

export default function PanelHeader({
  selectedCountry,
  meta,
  activeTab,
  onTabClick,
  onSaveSearch,
  onClose,
}) {
  const [savedFlash, setSavedFlash] = useState(false);

  function handleSaveSearchClick() {
    onSaveSearch();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  return (
    <div className="shrink-0 border-b border-carbon-800">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-white truncate">
            {selectedCountry || "Search results"}
          </h2>
          {meta && (
            <p className="text-xs text-carbon-500 mt-0.5 truncate">
              {meta.totalResults?.toLocaleString()} results
              {meta.cached ? ` · cached ${meta.cacheAge}s ago` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 -mr-1.5">
          {selectedCountry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveSearchClick}
              title="Save this search"
            >
              {savedFlash ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                "Save search"
              )}
            </Button>
          )}
          <IconButton label="Close panel" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      {selectedCountry && (
        <div className="flex items-center gap-5 px-4" role="tablist">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => onTabClick(tab.id)}
                className={`relative h-9 text-sm font-medium transition-colors ${
                  active
                    ? "text-white"
                    : "text-carbon-500 hover:text-carbon-200"
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
