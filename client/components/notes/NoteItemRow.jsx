import { formatDate } from "../../utils/newsApi";
import { ROW_META_CLASS, MetaDivider } from "../articles/ArticleCard";
import TrustBadge from "../TrustBadge";
import Badge from "../ui/Badge";
import NoteMarker from "./NoteMarker";

export default function NoteItemRow({ item, excerpt, label, onOpen }) {
  const published = formatDate(item.publishedAt);
  const Wrapper = item.snapshot ? "button" : "a";
  const wrapperProps = item.snapshot
    ? { type: "button", onClick: () => onOpen(item) }
    : { href: item.url, target: "_blank", rel: "noopener noreferrer" };

  return (
    <div className="border-b border-carbon-800 last:border-b-0 group">
      <Wrapper
        {...wrapperProps}
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
          {label && (
            <span className="ml-auto pl-2 text-2xs text-carbon-500 truncate max-w-[40%]">
              {label}
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
