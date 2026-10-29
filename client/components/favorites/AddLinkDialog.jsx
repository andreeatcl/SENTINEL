import { useContext, useState } from "react";
import { addFavorite, isFavorite } from "../../utils/storage";
import { favoriteFromLink } from "../../utils/favorites";
import { safeHref } from "../../utils/url";
import CountryPicker from "../CountryPicker";
import Modal from "../ui/Modal";
import Button, { IconButton } from "../ui/Button";
import { Eyebrow, Input } from "../ui/Field";
import { CloseIcon } from "../ui/icons";
import { FavoriteContext } from "./FavoriteButton";

// add https:// to bare links
function toUrl(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return safeHref(/^[a-z]+:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
}

export default function AddLinkDialog({ onSaved, onClose }) {
  const context = useContext(FavoriteContext);
  const [urlText, setUrlText] = useState("");
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState(context?.country ?? null);

  const url = toUrl(urlText);
  const duplicate = url && isFavorite(url);
  const error =
    urlText.trim() && !url
      ? "Not a valid web link"
      : duplicate
        ? "Already in your favorites"
        : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!url || duplicate) return;
    addFavorite({
      ...favoriteFromLink(url, title),
      context: country ? { country, query: null } : null,
    });
    onSaved();
  }

  return (
    <Modal
      onClose={onClose}
      width="sm"
      title="Add a link"
      subtitle="Saved to favorites, so you can note and group it"
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
      </form>
    </Modal>
  );
}
