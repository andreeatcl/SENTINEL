import { timeAgo } from "../../utils/newsApi";
import { getDomain } from "../../utils/url";
import { favoriteFromArticle } from "../../utils/favorites";
import FavoriteButton from "../favorites/FavoriteButton";
import NoteMarker from "../notes/NoteMarker";
import TrustBadge from "../TrustBadge";
import Badge from "../ui/Badge";
import { BanIcon } from "../ui/icons";

export const ROW_CLASS = "relative border-b border-carbon-800 group";
export const ROW_BUTTON_CLASS =
  "w-full text-left px-4 py-3.5 pr-12 hover:bg-carbon-850 transition-colors";
export const ROW_TITLE_CLASS =
  "text-sm font-medium text-carbon-100 leading-snug group-hover:text-white transition-colors";
export const ROW_META_CLASS = "text-xs text-carbon-500";
export const ROW_READ_CLASS = "opacity-55";

export function MetaDivider() {
  return <span aria-hidden className="w-px h-3 bg-carbon-700 shrink-0" />;
}

export function SkeletonCard() {
  return (
    <div className="px-4 py-3.5 border-b border-carbon-800 space-y-2.5">
      <div className="skeleton h-3 w-28 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}

export default function ArticleCard({
  article,
  read = false,
  muted = false,
  onClick,
}) {
  const domain = getDomain(article.url);

  return (
    <div className={ROW_CLASS}>
      <button
        onClick={onClick}
        className={`${ROW_BUTTON_CLASS} ${read ? ROW_READ_CLASS : ""}`}
      >
        {/* Time + source */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <span className={`${ROW_META_CLASS} shrink-0`}>
            {timeAgo(article.publishedAt)}
          </span>
          <MetaDivider />
          <span className="text-xs font-medium text-carbon-300 truncate">
            {article.source?.name || domain}
          </span>
          {muted && <BanIcon className="w-3 h-3 text-signal-red shrink-0" />}
          {article._duplicateCount > 1 && (
            <span className={`${ROW_META_CLASS} shrink-0`}>
              · {article._duplicateCount} sources
            </span>
          )}
          <TrustBadge trust={article._trustLabel} />
          <NoteMarker url={article.url} />
          {article._provider === "gdelt" && <Badge>GDELT</Badge>}
          {article.language && !/^english$/i.test(article.language) && (
            <Badge>{article.language}</Badge>
          )}
        </div>

        {/* Title */}
        <h3 className={`${ROW_TITLE_CLASS} line-clamp-3`}>
          {article.title?.replace(" - " + (article.source?.name || ""), "")}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-xs text-carbon-400 leading-relaxed line-clamp-2 mt-1">
            {article.description}
          </p>
        )}
      </button>

      <div className="absolute top-2.5 right-3">
        <FavoriteButton favorite={favoriteFromArticle(article)} />
      </div>
    </div>
  );
}
