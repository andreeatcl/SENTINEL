import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input, Eyebrow } from "../ui/Field";

export default function SaveSearchModal({
  isOpen,
  defaultLabel,
  query,
  onSave,
  onClose,
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (isOpen) setLabel(defaultLabel || "");
  }, [isOpen, defaultLabel]);

  function save() {
    if (!label.trim()) return;
    onSave(label.trim());
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="sm"
      title="Save search"
      subtitle="Saves this exact query and its filters"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!label.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Eyebrow className="mb-1.5">Name</Eyebrow>
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            aria-label="Search name"
            className="w-full max-sm:!text-base"
          />
        </div>
        {query && (
          <div>
            <Eyebrow className="mb-1.5">Query</Eyebrow>
            <p className="text-xs font-mono text-carbon-300 break-words max-h-24 overflow-y-auto">
              {query}
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}
