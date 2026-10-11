import { useRef, useState } from "react";
import { exportData, importData, getStorageUsage } from "../../utils/storage";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

// download the export as a plain json file that the user can keep
function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sentinel-backup-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSize(chars) {
  if (chars < 100_000) return `${Math.max(1, Math.round(chars / 1000))} KB`;
  return `${(chars / 1_000_000).toFixed(1)} MB`;
}

function StorageMeter() {
  const usage = getStorageUsage();
  if (!usage) return null;
  const percent = Math.min(100, Math.round(usage.ratio * 100));

  return (
    <div className="pt-3 border-t border-carbon-800">
      <div className="flex items-center justify-between gap-3 text-2xs text-carbon-500">
        <span>Browser storage</span>
        <span title="Browsers allow about 5 MB per site">
          {formatSize(usage.used)} of ~5 MB · {percent}%
        </span>
      </div>
      <div className="h-1 mt-1.5 rounded-full bg-carbon-800 overflow-hidden">
        <div
          className="h-full bg-carbon-500"
          style={{ width: `${Math.max(percent, 1)}%` }}
        />
      </div>
    </div>
  );
}

export default function DataBackupModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);

  function handleExport() {
    downloadJson(exportData());
    setStatus({ type: "ok", message: "Backup downloaded." });
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      importData(JSON.parse(text));
      setStatus({
        type: "ok",
        message: "Backup restored. Reload to see it everywhere.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Couldn't read that file.",
      });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="sm"
      title="Backup"
      subtitle="API keys, favorites, saved searches and notes"
    >
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-carbon-400 leading-relaxed">
          Everything is stored only in this browser. If you clear site data,
          switch devices, or the browser evicts storage, it's gone unless you've
          exported a backup.
        </p>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={handleExport} className="flex-1">
            Export backup
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            Import backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {status && (
          <p
            className={`text-xs ${
              status.type === "ok" ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {status.message}
          </p>
        )}

        {isOpen && <StorageMeter />}
      </div>
    </Modal>
  );
}
