import { useEffect, useRef, useState } from "react";
import { SearchIcon, MenuIcon } from "../ui/icons";
import { useBackupReminder } from "../../hooks/useBackupReminder";
import worldMap from "../../assets/lockscreen/world-map.svg";

const HUD_SURFACE =
  "pointer-events-auto h-10 bg-carbon-900/90 border border-carbon-800 rounded-lg backdrop-blur-md shadow-pop";

const REMINDER_TONE = {
  warn: "text-signal-amber",
  overdue: "text-signal-red",
};

function NavMenu({ items, tone }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative md:hidden shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menu"
        className={`${HUD_SURFACE} w-10 flex items-center justify-center hover:text-white transition-colors ${tone ?? "text-carbon-300"}`}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-0 top-full mt-2 w-44 p-1 bg-carbon-900 border border-carbon-800 rounded-lg shadow-panel animate-pop-in">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`w-full h-9 px-3 flex items-center rounded-md text-sm hover:bg-carbon-800 hover:text-white transition-colors ${item.tone ?? "text-carbon-200"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar({
  onSearch,
  loading,
  meta,
  credits,
  onKeywordsClick,
  onSettingsClick,
  onFavoritesClick,
  onNotesClick,
  onSavedSearchesClick,
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim()) {
      onSearch({ topic: input.trim(), raw: true });
    }
  }

  const remaining =
    typeof credits?.remaining === "number" ? credits.remaining : "—";
  const backupTone = REMINDER_TONE[useBackupReminder()];
  const navItems = [
    { label: "Keywords", onClick: onKeywordsClick },
    { label: "Favorites", onClick: onFavoritesClick },
    { label: "Notes", onClick: onNotesClick },
    { label: "Saved", onClick: onSavedSearchesClick },
    { label: "Settings", onClick: onSettingsClick, tone: backupTone },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center gap-2 p-3 pointer-events-none">
      {/* Branding */}
      <div className="relative h-10 w-[110px] shrink-0">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
          <img src={worldMap} alt="" className="w-full" />
          <span className="absolute inset-0 flex items-center justify-center pl-[0.2em] font-mono text-base font-semibold tracking-[0.2em] text-white">
            SENTINEL
          </span>
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSubmit}
        className={`${HUD_SURFACE} flex-1 max-w-xl min-w-0 flex items-center focus-within:border-carbon-600 transition-colors`}
      >
        <SearchIcon className="w-4 h-4 ml-3 text-carbon-500 shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search global events…"
          className="flex-1 min-w-0 h-full bg-transparent text-sm text-white px-2.5 outline-none focus-visible:ring-0 placeholder:text-carbon-500"
        />
        {loading && (
          <span className="text-xs text-carbon-500 pr-3 shrink-0">
            Searching…
          </span>
        )}
      </form>

      {/* API credit indicator */}
      <div
        className={`${HUD_SURFACE} hidden lg:flex items-center gap-2 px-3 shrink-0`}
        title="NewsAPI calls remaining today"
      >
        <span className="text-xs text-carbon-400">Credits</span>
        <span className="text-xs font-mono text-carbon-100">
          {remaining}/100
        </span>
        {meta?.cached && (
          <span className="text-2xs text-carbon-400 border-l border-carbon-700 pl-2">
            Cached
          </span>
        )}
        {credits?.keyUsed === "backup" && (
          <span className="text-2xs text-signal-amber border-l border-carbon-700 pl-2">
            Backup key
          </span>
        )}
      </div>

      <nav
        className={`${HUD_SURFACE} hidden md:flex items-center gap-0.5 px-1 shrink-0`}
      >
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={`h-8 px-2.5 rounded-md text-xs font-medium hover:bg-carbon-800 hover:text-white transition-colors ${item.tone ?? "text-carbon-300"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <NavMenu items={navItems} tone={backupTone} />
    </div>
  );
}
