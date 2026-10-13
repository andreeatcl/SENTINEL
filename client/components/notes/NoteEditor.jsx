import { useRef } from "react";
import { useAutosave } from "../../hooks/useAutosave";
import Button from "../ui/Button";
import { FIELD } from "../ui/Field";

export default function NoteEditor({
  value,
  onChange,
  title,
  onTitleChange,
  save,
  onDone,
  placeholder,
  rows = 5,
}) {
  const hasTitle = onTitleChange !== undefined;
  const textRef = useRef(null);
  const { queue, flush, saveFailed } = useAutosave(
    (next) => save(next.text, next.title),
    true,
  );

  function handleChange(e) {
    onChange(e.target.value);
    queue({ text: e.target.value, title });
  }

  function handleTitleChange(e) {
    onTitleChange(e.target.value);
    queue({ text: value, title: e.target.value });
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

  function handleTitleKeyDown(e) {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      textRef.current?.focus();
    } else {
      handleKeyDown(e);
    }
  }

  const isEmpty = !value.trim() && !(title ?? "").trim();
  const focusTitle = hasTitle && isEmpty;

  return (
    <>
      {hasTitle && (
        <input
          autoFocus={focusTitle}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Title (optional)"
          className={`${FIELD} w-full px-3 py-2 mb-2 text-sm font-medium`}
        />
      )}
      <textarea
        ref={textRef}
        autoFocus={!focusTitle}
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
            : isEmpty
              ? "Empty notes are removed"
              : "Saves automatically"}
        </p>
        <Button size="sm" onClick={handleDone} title="Ctrl+Enter">
          Done
        </Button>
      </div>
    </>
  );
}
