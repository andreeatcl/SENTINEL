import { useHasNote } from "../../hooks/useNotes";
import { NoteIcon } from "../ui/icons";

export default function NoteMarker({ url }) {
  const hasNote = useHasNote(url);
  if (!hasNote) return null;
  return (
    <span title="Has a note" className="shrink-0 text-carbon-300">
      <NoteIcon className="w-3.5 h-3.5" />
      <span className="sr-only">Has a note</span>
    </span>
  );
}
