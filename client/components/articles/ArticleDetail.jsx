import { useState } from "react";
import { timeAgo, formatDate } from "../../utils/newsApi";
import { getDomain } from "../../utils/url";
import { favoriteFromArticle } from "../../utils/favorites";
import FavoriteButton from "../favorites/FavoriteButton";
import NoteSection from "../notes/NoteSection";
import TrustBadge from "../TrustBadge";
import { DetailSection, SourceLinkFooter } from "../events/EventDetail";
import Modal from "../ui/Modal";
import { Eyebrow } from "../ui/Field";

export default function ArticleDetail({ article, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!article) return null;

  const isGdelt = article._provider === "gdelt";
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
    <Modal
      onClose={onClose}
      width="sm"
      title={title}
      subtitle={
        <>
          <span>{timeAgo(article.publishedAt)}</span>
          <span className="text-carbon-600">·</span>
          <span>{sourceName}</span>
        </>
      }
      headerActions={<FavoriteButton favorite={favorite} />}
    >
      {/* Image, when the article has one */}
      {article.urlToImage && !imageFailed && (
        <img
          src={article.urlToImage}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="w-full max-h-48 object-cover border-b border-carbon-800"
        />
      )}

      {/* Preview — the article's own description */}
      {article.description && (
        <DetailSection>
          <p className="text-sm text-carbon-300 leading-relaxed">
            {article.description}
          </p>
        </DetailSection>
      )}

      {/* Source / published */}
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

      {/* Provenance — same visual slot as EventDetail's Tone section */}
      <DetailSection label="Provenance">
        <p className="text-sm font-medium text-white">
          {isGdelt ? "GDELT" : "NewsAPI"}
          {hasNonEnglish && (
            <span className="text-carbon-500 font-normal text-xs">
              {" "}
              · {article.language}
            </span>
          )}
        </p>
        <p className="text-xs text-carbon-500 mt-1">
          {isGdelt
            ? "Broad global coverage, weaker metadata"
            : "Curated English-language source"}
        </p>
      </DetailSection>

      {article.url && <NoteSection item={favorite} />}

      {/* Source link — the "learn more" step */}
      {article.url && (
        <SourceLinkFooter href={article.url}>
          {domain && <span>{domain}</span>}
        </SourceLinkFooter>
      )}
    </Modal>
  );
}
