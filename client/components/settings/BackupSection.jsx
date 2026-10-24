import { useRef, useState } from "react";
import {
  exportData,
  importData,
  getStorageUsage,
  getLastBackup,
  snoozeBackupReminder,
} from "../../utils/storage";
import { useBackupReminder } from "../../hooks/useBackupReminder";
import { formatDate } from "../../utils/newsApi";
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

const BACKUP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function Meter({ label, value, title, percent }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-2xs text-carbon-500">
        <span>{label}</span>
        <span title={title}>{value}</span>
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

function backupMeter(lastBackup) {
  if (!lastBackup) return { value: "Never", percent: 100 };
  const elapsed = Date.now() - new Date(lastBackup).getTime();
  const days = Math.floor(elapsed / DAY_MS);
  return {
    value: `${formatDate(lastBackup)} · ${
      days <= BACKUP_DAYS ? `${days} of ${BACKUP_DAYS} days` : `${days} days`
    }`,
    percent: Math.min(
      100,
      Math.round((elapsed / (BACKUP_DAYS * DAY_MS)) * 100),
    ),
  };
}

function StorageMeters() {
  const usage = getStorageUsage();
  if (!usage) return null;
  const percent = Math.min(100, Math.round(usage.ratio * 100));
  const lastBackup = getLastBackup();

  return (
    <div className="pt-3 border-t border-carbon-800 space-y-3">
      <Meter
        label="Last backup"
        title={lastBackup ?? undefined}
        {...backupMeter(lastBackup)}
      />
      <Meter
        label="Browser storage"
        title="Browsers allow about 5 MB per site"
        value={`${formatSize(usage.used)} of ~5 MB · ${percent}%`}
        percent={percent}
      />
    </div>
  );
}

export default function BackupSection() {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const reminder = useBackupReminder();

  function handleExport() {
    downloadJson(exportData());
    setStatus({ type: "ok", message: "Backup downloaded." });
  }

  function handleSnooze() {
    snoozeBackupReminder();
    setStatus({ type: "ok", message: "OK, no reminder for the next 5 days." });
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
    <div className="px-5 py-5 space-y-4">
      <p className="text-sm text-carbon-400 leading-relaxed">
        API keys, favorites, saved searches, notes and muted sources are stored
        only in this browser. If you clear site data, switch devices, or the
        browser evicts storage, it's gone unless you've exported a backup.
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

      {reminder && (
        <button
          type="button"
          onClick={handleSnooze}
          className="text-xs text-carbon-400 hover:text-white underline underline-offset-2 transition-colors"
        >
          Remind me later
        </button>
      )}

      {status && (
        <p
          className={`text-xs ${
            status.type === "ok" ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {status.message}
        </p>
      )}

      <StorageMeters />
    </div>
  );
}
