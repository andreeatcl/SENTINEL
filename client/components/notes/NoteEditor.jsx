import { useAutosave } from "../../hooks/useAutosave";
import Button from "../ui/Button";
import { FIELD } from "../ui/Field";

export default function NoteEditor({
  value,
  onChange,
  save,
  onDone,
  placeholder,
  rows = 5,
}) {
  const { queue, flush, saveFailed } = useAutosave(save, true);

  function handleChange(e) {
    onChange(e.target.value);
    queue(e.target.value);
  }

  function handleDone() {
    flush();
    onDone();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleDone();
    }
  }

  return (
    <>
      <textarea
        autoFocus
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={`${FIELD} w-full px-3 py-2 text-sm leading-relaxed resize-y`}
      />
      <div className="flex items-center justify-between gap-3 mt-2">
        <p
          className={`text-xs ${saveFailed ? "text-signal-red" : "text-carbon-500"}`}
        >
          {saveFailed
            ? "Couldn't save — browser storage is full or unavailable."
            : value.trim()
              ? "Saves automatically"
              : "Empty notes are removed"}
        </p>
        <Button size="sm" onClick={handleDone} title="Ctrl+Enter">
          Done
        </Button>
      </div>
    </>
  );
}
