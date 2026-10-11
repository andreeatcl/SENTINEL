import { useState } from "react";
import { topicLabel } from "../../utils/favorites";
import { formatDate } from "../../utils/newsApi";
import {
  toneCategory,
  TONE_LABELS,
  TONE_DOT_CLASS,
} from "../../utils/eventTone";
import { ROW_META_CLASS, MetaDivider } from "../articles/ArticleCard";
import TrustBadge from "../TrustBadge";
import NoteMarker from "../notes/NoteMarker";
import Badge from "../ui/Badge";
import { StarIcon, FolderIcon } from "../ui/icons";

const MAX_GROUP_BADGES = 3;

function fullDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "";
}

export default function FavoriteRow({
  item,
  showTopic,
  inGroup,
  groupNames,
  onOpen,
  onRemove,
  onPickGroups,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const isEvent = item.type === "event";
  const tone =
    isEvent && item.snapshot?.goldstein !== undefined
      ? toneCategory(item.snapshot.goldstein)
      : null;
  const published = formatDate(item.publishedAt);

  const Wrapper = item.snapshot ? "button" : "a";
  const wrapperProps = item.snapshot
    ? { type: "button", onClick: onOpen }
    : { href: item.url, target: "_blank", rel: "noopener noreferrer" };

  return (
    <div className="relative border-b border-carbon-800 last:border-b-0 group">
      <Wrapper
        {...wrapperProps}
        className="w-full flex gap-3 text-left px-5 py-3.5 pr-12 hover:bg-carbon-850 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
            {tone && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT_CLASS[tone]}`}
                title={TONE_LABELS[tone]}
              />
            )}
            {published && (
              <>
                <span
                  className={`${ROW_META_CLASS} shrink-0`}
                  title={`Published ${fullDate(item.publishedAt)}`}
                >
                  {published}
                </span>
                <MetaDivider />
              </>
            )}
            <span className="text-xs font-medium text-carbon-300 truncate">
              {item.sourceName || "Unknown source"}
            </span>
            <TrustBadge trust={item.trust} />
            <NoteMarker url={item.url} />
            {isEvent && <Badge>Event</Badge>}
          </div>

          <p className="text-sm font-medium text-carbon-100 group-hover:text-white leading-snug line-clamp-2 transition-colors">
            {item.title}
          </p>

          {item.description && (
            <p className="text-xs text-carbon-400 leading-relaxed line-clamp-2 mt-1">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5 text-2xs text-carbon-500 min-w-0">
            <span title={fullDate(item.savedAt)}>
              Saved {formatDate(item.savedAt)}
            </span>
            {showTopic && item.context && <span>· {topicLabel(item)}</span>}
            {isEvent && item.snapshot?.location && (
              <span>· {item.snapshot.location}</span>
            )}
            {groupNames.slice(0, MAX_GROUP_BADGES).map((name) => (
              <Badge key={name}>{name}</Badge>
            ))}
            {groupNames.length > MAX_GROUP_BADGES && (
              <span
                className="text-carbon-500"
                title={groupNames.slice(MAX_GROUP_BADGES).join(", ")}
              >
                + {groupNames.length - MAX_GROUP_BADGES} more
              </span>
            )}
          </div>
        </div>

        {item.image && !imageFailed && (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-16 h-16 rounded-md object-cover shrink-0 border border-carbon-800"
          />
        )}
      </Wrapper>

      <div className="absolute top-2.5 right-3 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onRemove}
          title="Remove from favorites"
          aria-label="Remove from favorites"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-signal-amber hover:bg-carbon-800 transition-colors"
        >
          <StarIcon filled className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onPickGroups}
          title="Add to group"
          aria-label="Add to group"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-carbon-100 hover:bg-carbon-800 transition-colors"
        >
          <FolderIcon filled={inGroup} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
