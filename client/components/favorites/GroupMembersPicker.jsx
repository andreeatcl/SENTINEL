import { useMemo, useState } from "react";
import { filterFavorites, sortFavorites } from "../../utils/favorites";
import { formatDate } from "../../utils/newsApi";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input } from "../ui/Field";
import CheckboxMark from "./CheckboxMark";
import Pager, { usePaged } from "../ui/Pager";

const PAGE_SIZE = 20;

// pick favorites from within the group
export default function GroupMembersPicker({
  group,
  favorites,
  onToggle,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const members = new Set(group.urls);
  const memberCount = favorites.filter((f) => members.has(f.url)).length;

  const visible = useMemo(
    () => sortFavorites(filterFavorites(favorites, { query }), "saved", "desc"),
    [favorites, query],
  );
  const paged = usePaged(visible, query, PAGE_SIZE);

  return (
    <Modal
      onClose={onClose}
      width="sm"
      title={`Add to “${group.name}”`}
      subtitle={`${memberCount} of ${favorites.length} favorites in this group`}
      footer={
        <Button size="sm" variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="sticky top-0 z-10 bg-carbon-900 px-4 pt-3 pb-2.5 border-b border-carbon-800">
        <Input
          size="sm"
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search favorites…"
          aria-label="Search favorites"
          className="w-full"
        />
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-carbon-500">
          No favorites match.
        </p>
      ) : (
        <>
          <Pager paged={paged} className="px-5" />
          <ul>
            {paged.visible.map((item) => {
              const checked = members.has(item.url);
              const published = formatDate(item.publishedAt);
              return (
                <li
                  key={item.url}
                  className="border-b border-carbon-800 last:border-b-0"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => onToggle(group.id, item.url, !checked)}
                    className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-carbon-850 transition-colors"
                  >
                    <span className="pt-0.5">
                      <CheckboxMark checked={checked} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-2xs text-carbon-500 truncate mb-0.5">
                        {published && <>{published} · </>}
                        {item.sourceName || "Unknown source"}
                        {item.type === "event" && " · Event"}
                      </span>
                      <span className="block text-sm text-carbon-100 leading-snug line-clamp-2">
                        {item.title}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Pager paged={paged} className="px-5" />
    </Modal>
  );
}
