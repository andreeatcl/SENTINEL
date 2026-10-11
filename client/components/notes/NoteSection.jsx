import { useContext, useEffect, useRef, useState } from "react";
import { saveNote } from "../../utils/storage";
import { timeAgo } from "../../utils/newsApi";
import { useNote } from "../../hooks/useNotes";
import { FavoriteContext } from "../favorites/FavoriteButton";
import { DetailSection } from "../events/EventDetail";
import Button from "../ui/Button";
import { FIELD } from "../ui/Field";
import { NoteIcon } from "../ui/icons";

// instead of saving the note after every keystroke,
// saving is done every 2 seconds or 0.5s after a pause in typing
const SAVE_DELAY_MS = 500;
const MAX_WAIT_MS = 2000;

export default function NoteSection({ item }) {
  const context = useContext(FavoriteContext);
  const note = useNote(item.url);
  const [draft, setDraft] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const editing = draft !== null;

  const pendingRef = useRef(null);
  const delayTimerRef = useRef(null);
  const maxWaitTimerRef = useRef(null);
  // latest item/context for flushes from timers, listeners and unmount
  const latestRef = useRef({ item, context });
  latestRef.current = { item, context };

  function flush() {
    clearTimeout(delayTimerRef.current);
    clearTimeout(maxWaitTimerRef.current);
    delayTimerRef.current = null;
    maxWaitTimerRef.current = null;
    if (pendingRef.current === null) return;
    const text = pendingRef.current;
    pendingRef.current = null;
    const { item, context } = latestRef.current;
    setSaveFailed(!saveNote(item, text, context));
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // save on unmount (modal closed, e.g. with Escape)
  useEffect(() => () => flushRef.current(), []);

  useEffect(() => {
    if (!editing) return;
    function onHide() {
      if (document.visibilityState === "hidden") flushRef.current();
    }
    function onPageHide() {
      flushRef.current();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [editing]);

  function handleChange(e) {
    setDraft(e.target.value);
    pendingRef.current = e.target.value;
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = setTimeout(flush, SAVE_DELAY_MS);
    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(flush, MAX_WAIT_MS);
    }
  }

  function handleDone() {
    flush();
    setDraft(null);
  }

  if (editing) {
    return (
      <DetailSection label="Your note">
        <textarea
          autoFocus
          value={draft}
          onChange={handleChange}
          rows={5}
          placeholder="Why this matters, what to follow up on…"
          className={`${FIELD} w-full px-3 py-2 text-sm leading-relaxed resize-y`}
        />
        <div className="flex items-center justify-between gap-3 mt-2">
          <p
            className={`text-xs ${saveFailed ? "text-signal-red" : "text-carbon-500"}`}
          >
            {saveFailed
              ? "Couldn't save — browser storage is full or unavailable."
              : draft.trim()
                ? "Saves automatically"
                : "Empty notes are removed"}
          </p>
          <Button size="sm" onClick={handleDone}>
            Done
          </Button>
        </div>
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
      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-xs text-carbon-500" title={note.updatedAt}>
          Edited {timeAgo(note.updatedAt)}
        </p>
        <Button size="sm" onClick={() => setDraft(note.text)}>
          Edit
        </Button>
      </div>
    </DetailSection>
  );
}
