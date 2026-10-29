import { formatDate } from "../../utils/newsApi";
import { isExternal } from "../../utils/favorites";
import { safeHref } from "../../utils/url";
import { ROW_META_CLASS, MetaDivider } from "../articles/ArticleCard";
import TrustBadge from "../TrustBadge";
import Badge from "../ui/Badge";
import NoteMarker from "./NoteMarker";

function openProps(item, onOpen) {
  return item.snapshot
    ? { type: "button", onClick: () => onOpen(item) }
    : {
        href: safeHref(item.url),
        target: "_blank",
        rel: "noopener noreferrer",
      };
}

export function NoteItemCard({ item, excerpt, onOpen }) {
  const published = formatDate(item.publishedAt);
  const Wrapper = item.snapshot ? "button" : "a";

  return (
    <Wrapper
      {...openProps(item, onOpen)}
      className="group flex flex-col w-full min-w-0 text-left p-3 rounded-md border border-carbon-800 bg-carbon-850 hover:border-carbon-600 hover:bg-carbon-800 transition-colors"
    >
      <p className="text-sm font-medium text-carbon-100 group-hover:text-white leading-snug line-clamp-2 transition-colors">
        {item.title}
      </p>
      {excerpt && (
        <p className="mt-1.5 pl-2.5 border-l-2 border-carbon-700 text-xs text-carbon-300 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
          {excerpt}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-auto pt-2.5 min-w-0">
        {published && (
          <>
            <span className={`${ROW_META_CLASS} shrink-0`}>{published}</span>
            <MetaDivider />
          </>
        )}
        <span className="text-xs font-medium text-carbon-300 truncate">
          {item.sourceName || "Unknown source"}
        </span>
        <TrustBadge trust={item.trust} />
        {item.type === "event" && <Badge>Event</Badge>}
        {isExternal(item) && <Badge>External</Badge>}
      </div>
    </Wrapper>
  );
}

export default function NoteItemRow({
  item,
  excerpt,
  label,
  labelMark,
  onOpen,
}) {
  const published = formatDate(item.publishedAt);
  const Wrapper = item.snapshot ? "button" : "a";

  return (
    <div className="border-b border-carbon-800 last:border-b-0 group">
      <Wrapper
        {...openProps(item, onOpen)}
        className="block w-full text-left px-4 py-3 hover:bg-carbon-850 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1 min-w-0">
          {published && (
            <>
              <span className={`${ROW_META_CLASS} shrink-0`}>{published}</span>
              <MetaDivider />
            </>
          )}
          <span className="text-xs font-medium text-carbon-300 truncate">
            {item.sourceName || "Unknown source"}
          </span>
          <TrustBadge trust={item.trust} />
          {!excerpt && <NoteMarker url={item.url} />}
          {item.type === "event" && <Badge>Event</Badge>}
          {isExternal(item) && <Badge>External</Badge>}
          {label && (
            <span className="ml-auto pl-2 flex items-center gap-1.5 min-w-0 max-w-[40%]">
              <span className="text-2xs text-carbon-500 truncate">{label}</span>
              {labelMark}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-carbon-100 group-hover:text-white leading-snug line-clamp-2 transition-colors">
          {item.title}
        </p>
        {excerpt && (
          <p className="mt-1.5 pl-2.5 border-l-2 border-carbon-700 text-xs text-carbon-300 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
            {excerpt}
          </p>
        )}
      </Wrapper>
    </div>
  );
}
