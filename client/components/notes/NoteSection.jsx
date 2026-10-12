import { useContext, useRef, useState } from "react";
import { saveNote } from "../../utils/storage";
import { useNote } from "../../hooks/useNotes";
import { FavoriteContext } from "../favorites/FavoriteButton";
import { DetailSection } from "../events/EventDetail";
import Button from "../ui/Button";
import { NoteIcon } from "../ui/icons";
import NoteEditor from "./NoteEditor";

export default function NoteSection({ item }) {
  const context = useContext(FavoriteContext);
  const note = useNote(item.url);
  const [draft, setDraft] = useState(null);

  // latest item/context for saves that flush after a re-render or unmount
  const latestRef = useRef({ item, context });
  latestRef.current = { item, context };

  function save(text) {
    const { item, context } = latestRef.current;
    return saveNote(item, text, context);
  }

  if (draft !== null) {
    return (
      <DetailSection label="Your note">
        <NoteEditor
          value={draft}
          onChange={setDraft}
          save={save}
          onDone={() => setDraft(null)}
          placeholder="Why this matters, what to follow up on…"
        />
      </DetailSection>
    );
  }

  if (!note) {
    return (
      <DetailSection>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft("")}
          className="-ml-2.5"
        >
          <NoteIcon className="w-3.5 h-3.5" />
          Add a note
        </Button>
      </DetailSection>
    );
  }

  return (
    <DetailSection label="Your note">
      <p className="text-sm text-carbon-200 leading-relaxed whitespace-pre-wrap break-words">
        {note.text}
      </p>
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={() => setDraft(note.text)}>
          Edit
        </Button>
      </div>
    </DetailSection>
  );
}
