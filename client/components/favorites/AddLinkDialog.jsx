import { useContext, useState } from "react";
import {
  addFavorite,
  getNote,
  isFavorite,
  updateLink,
} from "../../utils/storage";
import { favoriteFromLink } from "../../utils/favorites";
import { getDomain, safeHref } from "../../utils/url";
import CountryPicker from "../CountryPicker";
import Modal from "../ui/Modal";
import Button, { IconButton } from "../ui/Button";
import { Eyebrow, FIELD, Input } from "../ui/Field";
import { CloseIcon } from "../ui/icons";
import { FavoriteContext } from "./FavoriteButton";

const DESCRIPTION_MAX_LENGTH = 500;

// add https:// to bare links
function toUrl(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return safeHref(/^[a-z]+:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
}

export default function AddLinkDialog({ link, onSaved, onClose }) {
  const context = useContext(FavoriteContext);
  const [urlText, setUrlText] = useState(link?.url ?? "");
  const [title, setTitle] = useState(
    link && link.title !== getDomain(link.url) ? link.title : "",
  );
  const [description, setDescription] = useState(link?.description ?? "");
  const [country, setCountry] = useState(context?.country ?? null);

  const url = toUrl(urlText);
  const favorited = url && url !== link?.url && isFavorite(url);
  const noted = link && url && url !== link.url && getNote(url);
  const duplicate = favorited || noted;
  const error =
    urlText.trim() && !url
      ? "Not a valid web link"
      : favorited
        ? "Already in your favorites"
        : noted
          ? "Already in your notes"
          : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!url || duplicate) return;
    const fields = {
      ...favoriteFromLink(url, title, description),
      context: country ? { country, query: null } : null,
    };
    if (link) updateLink(link.url, fields);
    else addFavorite(fields);
    onSaved(fields);
  }

  return (
    <Modal
      onClose={onClose}
      width="sm"
      title={link ? "Edit link" : "Add a link"}
      subtitle={
        link
          ? "Its note and groups stay with it"
          : "Saved to favorites, so you can note and group it"
      }
      footer={
        <>
          <div className="mr-auto flex items-center gap-1 min-w-0">
            <CountryPicker
              value={country}
              onSelect={setCountry}
              className="h-7 w-44 max-w-[45vw]"
            />
            {country && (
              <IconButton
                size="sm"
                label="Clear country"
                onClick={() => setCountry(null)}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </IconButton>
            )}
          </div>
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            type="submit"
            form="add-link-form"
            disabled={!url || duplicate}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        id="add-link-form"
        onSubmit={handleSubmit}
        className="px-5 py-4 space-y-3"
      >
        <label className="block">
          <Eyebrow className="mb-1.5">Link</Eyebrow>
          <Input
            autoFocus
            inputMode="url"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://…"
            className="w-full max-sm:!text-base"
          />
          {error && <p className="mt-1.5 text-xs text-signal-red">{error}</p>}
        </label>
        <label className="block">
          <Eyebrow className="mb-1.5">Title</Eyebrow>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Paste the headline (optional)"
            className="w-full max-sm:!text-base"
          />
        </label>
        <label className="block">
          <Eyebrow className="mb-1.5">Description</Eyebrow>
          <textarea
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description - Optional"
            className={`${FIELD} w-full px-3 py-2 text-sm resize-none block max-sm:!text-base`}
          />
        </label>
      </form>
    </Modal>
  );
}
