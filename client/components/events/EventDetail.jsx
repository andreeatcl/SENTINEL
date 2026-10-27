import { useState } from "react";
import {
  toneCategory,
  TONE_TEXT_CLASS,
  TONE_LABELS,
  TONE_DOT_CLASS,
} from "../../utils/eventTone";
import {
  validActorLabel,
  fallbackHeadline,
  eventTimeLabel,
  getDomain,
} from "../../utils/eventDisplay";
import { favoriteFromEvent } from "../../utils/favorites";
import { safeHref } from "../../utils/url";
import FavoriteButton from "../favorites/FavoriteButton";
import NoteSection from "../notes/NoteSection";
import TrustBadge from "../TrustBadge";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Eyebrow } from "../ui/Field";
import { ExternalIcon } from "../ui/icons";

export function DetailSection({ label, children, className = "" }) {
  return (
    <div className={`px-5 py-4 border-b border-carbon-800 ${className}`}>
      {label && <Eyebrow className="mb-1.5">{label}</Eyebrow>}
      {children}
    </div>
  );
}

export function SourceLinkFooter({ href, children }) {
  return (
    <div className="px-5 py-4">
      <Button
        variant="primary"
        href={safeHref(href)}
        disabled={!safeHref(href)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        Read source article
        <ExternalIcon className="w-3.5 h-3.5" />
      </Button>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-carbon-500 mt-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

function coverageCaption(event) {
  const mentions = `${event.numMentions} mention${event.numMentions === 1 ? "" : "s"}`;
  const sources = `${event.numSources} source${event.numSources === 1 ? "" : "s"}`;
  return `Reported in ${mentions} across ${sources}`;
}

export default function EventDetail({ event, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!event) return null;

  const tone = toneCategory(event.goldstein);
  const headline = event.headline || fallbackHeadline(event);
  const domain = getDomain(event.sourceUrl);
  const actor1Label = validActorLabel(event.actor1);
  const actor2Label = validActorLabel(event.actor2);
  const favorite = favoriteFromEvent(event);

  return (
    <Modal
      onClose={onClose}
      width="sm"
      title={headline}
      subtitle={
        <>
          <span
            className={`w-1.5 h-1.5 rounded-full ${TONE_DOT_CLASS[tone]}`}
          />
          <span>{eventTimeLabel(event)}</span>
          <span className="text-carbon-600">·</span>
          <span>{event.location || "Unknown location"}</span>
        </>
      }
      headerActions={favorite && <FavoriteButton favorite={favorite} />}
    >
      {/* Image from the source article's page, when it has one */}
      {event.image && !imageFailed && (
        <img
          src={event.image}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="w-full max-h-48 object-cover border-b border-carbon-800"
        />
      )}

      {/* Preview — the source article's own description, when available */}
      {event.preview && (
        <DetailSection>
          <p className="text-sm text-carbon-300 leading-relaxed">
            {event.preview}
          </p>
        </DetailSection>
      )}

      {/* Who was involved */}
      {(actor1Label || actor2Label) && (
        <div
          className={`grid gap-4 px-5 py-4 border-b border-carbon-800 ${
            actor1Label && actor2Label ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {actor1Label && (
            <div>
              <Eyebrow className="mb-1.5">Initiated by</Eyebrow>
              <p className="text-sm text-white">{actor1Label}</p>
            </div>
          )}
          {actor2Label && (
            <div>
              <Eyebrow className="mb-1.5">Directed at</Eyebrow>
              <p className="text-sm text-white">{actor2Label}</p>
            </div>
          )}
        </div>
      )}

      <DetailSection label="Tone">
        <p className={`text-sm font-medium ${TONE_TEXT_CLASS[tone]}`}>
          {TONE_LABELS[tone]}{" "}
          <span className="text-carbon-500 font-mono font-normal text-xs">
            Goldstein {event.goldstein > 0 ? "+" : ""}
            {event.goldstein}
          </span>
        </p>
        <p className="text-xs text-carbon-500 mt-1">{coverageCaption(event)}</p>
      </DetailSection>

      {favorite && <NoteSection item={favorite} />}

      {event.sourceUrl && (
        <SourceLinkFooter href={event.sourceUrl}>
          {domain && (
            <>
              <span>{domain}</span>
              <TrustBadge trust={event._trustLabel} detailed />
            </>
          )}
        </SourceLinkFooter>
      )}
    </Modal>
  );
}
