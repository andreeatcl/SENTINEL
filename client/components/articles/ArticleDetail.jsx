import { useContext, useState } from "react";
import { timeAgo, formatDate } from "../../utils/newsApi";
import { getDomain } from "../../utils/url";
import { favoriteFromArticle } from "../../utils/favorites";
import AddLinkDialog from "../favorites/AddLinkDialog";
import FavoriteButton, { FavoriteContext } from "../favorites/FavoriteButton";
import NoteSection from "../notes/NoteSection";
import TrustBadge from "../TrustBadge";
import { DetailSection, SourceLinkFooter } from "../events/EventDetail";
import { IconButton } from "../ui/Button";
import Modal from "../ui/Modal";
import { Eyebrow } from "../ui/Field";
import { BanIcon, PencilIcon } from "../ui/icons";
import { useMutedDomains } from "../../hooks/useMutedDomains";
import { isMutedDomain } from "../../utils/articleFilters";
import {
  muteDomain,
  normalizeDomain,
  replaceMutedDomains,
} from "../../utils/storage";

const PROVENANCE = {
  gdelt: "GDELT",
  newsapi: "NewsAPI",
  manual: "External",
};

export default function ArticleDetail({ article: original, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(null);
  const mutedDomains = useMutedDomains();
  const originalContext = useContext(FavoriteContext);
  const article = edited?.snapshot ?? original;
  const context = edited ? edited.context : originalContext;
  if (!article) return null;

  const hostname = normalizeDomain(article.url || "");
  const muted = isMutedDomain(article.url, mutedDomains);

  // unmuting a domain also unmutes its parent domain (leave as is unless it causes issues later)
  function toggleMute() {
    if (!muted) return muteDomain(hostname);
    replaceMutedDomains(
      mutedDomains.filter((d) => !isMutedDomain(`https://${hostname}`, [d])),
    );
  }

  const provenance = PROVENANCE[article._provider] || PROVENANCE.newsapi;
  const domain = getDomain(article.url);
  const title = article.title?.replace(
    " - " + (article.source?.name || ""),
    "",
  );
  const sourceName = article.source?.name || domain;
  const hasNonEnglish =
    article.language && !/^english$/i.test(article.language);
  const favorite = favoriteFromArticle(article);

  return (
    <FavoriteContext.Provider value={context}>
      <Modal
        onClose={onClose}
        width="sm"
        title={title}
        subtitle={
          <>
            {article.publishedAt && (
              <>
                <span>{timeAgo(article.publishedAt)}</span>
                <span className="text-carbon-600">·</span>
              </>
            )}
            <span>{sourceName}</span>
          </>
        }
        headerActions={
          <>
            {article._provider === "manual" && (
              <IconButton label="Edit link" onClick={() => setEditing(true)}>
                <PencilIcon className="w-4 h-4" />
              </IconButton>
            )}
            <FavoriteButton favorite={favorite} />
          </>
        }
      >
        {/* image */}
        {article.urlToImage && !imageFailed && (
          <img
            src={article.urlToImage}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full max-h-48 object-cover border-b border-carbon-800"
          />
        )}

        {/* preview */}
        {article.description && (
          <DetailSection>
            <p className="text-sm text-carbon-300 leading-relaxed">
              {article.description}
            </p>
          </DetailSection>
        )}

        {/* source/published */}
        <div className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-carbon-800">
          <div>
            <Eyebrow className="mb-1.5">Source</Eyebrow>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-white">
              <span>{sourceName}</span>
              <TrustBadge trust={article._trustLabel} detailed />
              {article._duplicateCount > 1 && (
                <span className="text-xs text-carbon-500">
                  · {article._duplicateCount} sources
                </span>
              )}
            </div>
            {hostname && (
              <button
                type="button"
                onClick={toggleMute}
                className={`mt-2 inline-flex items-center gap-1.5 text-xs transition-colors ${
                  muted
                    ? "text-carbon-400 hover:text-white"
                    : "text-carbon-300 hover:text-signal-red"
                }`}
              >
                <BanIcon
                  className={`w-3.5 h-3.5 ${
                    muted ? "text-carbon-500" : "text-signal-red"
                  }`}
                />
                {muted ? `Unmute ${hostname}` : "Mute this source"}
              </button>
            )}
          </div>
          <div>
            <Eyebrow className="mb-1.5">Published</Eyebrow>
            <p className="text-sm text-white">
              {formatDate(article.publishedAt, { withYear: true }) || "Unknown"}
            </p>
            {article.publishedAt && (
              <p className="text-xs text-carbon-500 mt-0.5">
                {timeAgo(article.publishedAt)}
              </p>
            )}
          </div>
        </div>

        {/* provenance */}
        <DetailSection label="Provenance">
          <p className="text-sm font-medium text-white">
            {provenance}
            {hasNonEnglish && (
              <span className="text-carbon-500 font-normal text-xs">
                {" "}
                · {article.language}
              </span>
            )}
          </p>
        </DetailSection>

        {article.url && <NoteSection item={favorite} />}

        {/* source link */}
        {article.url && (
          <SourceLinkFooter href={article.url}>
            {domain && <span>{domain}</span>}
          </SourceLinkFooter>
        )}
      </Modal>

      {editing && (
        <AddLinkDialog
          link={article}
          onSaved={(fields) => {
            setEdited(fields);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </FavoriteContext.Provider>
  );
}
