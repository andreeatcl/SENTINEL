import { useState } from "react";
import { getApiKeys, setApiKeys } from "../../utils/storage";
import { testApiKey } from "../../utils/newsApi";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Input } from "../ui/Field";
import { CheckIcon } from "../ui/icons";

// Test status per field: "idle" | "testing" | "valid" | "invalid"
function KeyField({
  label,
  hint,
  value,
  onChange,
  status,
  message,
  onTest,
  active,
}) {
  const [visible, setVisible] = useState(false);

  const statusColor =
    status === "valid"
      ? "text-signal-green"
      : status === "invalid"
        ? "text-signal-red"
        : "text-carbon-400";
  const statusLabel =
    status === "testing"
      ? "Checking…"
      : status === "valid"
        ? "Working"
        : status === "invalid"
          ? "Not working"
          : "";

  return (
    <div className="bg-carbon-850 border border-carbon-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-medium text-white">{label}</h3>
          <p className="text-xs text-carbon-500 mt-0.5">{hint}</p>
        </div>
        {active && <Badge tone="accent">In use</Badge>}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your NewsAPI key"
            className="w-full font-mono pr-14 !bg-carbon-900"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 rounded text-xs text-carbon-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        <Button onClick={onTest} disabled={!value || status === "testing"}>
          Test
        </Button>
      </div>

      {statusLabel && (
        <p className={`flex items-center gap-1.5 text-xs mt-2 ${statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
          {status === "invalid" && message ? ` — ${message}` : ""}
        </p>
      )}
    </div>
  );
}

export default function ApiKeysSection() {
  const [primary, setPrimary] = useState(() => getApiKeys().primary);
  const [backup, setBackup] = useState(() => getApiKeys().backup);
  const [lastGood] = useState(() => getApiKeys().lastGood);
  const [primaryStatus, setPrimaryStatus] = useState("idle");
  const [backupStatus, setBackupStatus] = useState("idle");
  const [primaryMessage, setPrimaryMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleTest(key, setStatus, setMessage) {
    setStatus("testing");
    setMessage("");
    const result = await testApiKey(key);
    setStatus(result.valid ? "valid" : "invalid");
    setMessage(result.message || "");
  }

  function handleSave() {
    setApiKeys({ primary: primary.trim(), backup: backup.trim(), lastGood });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="px-5 py-5 space-y-3">
      <KeyField
        label="Main key"
        hint="Used for every NewsAPI request"
        value={primary}
        onChange={setPrimary}
        status={primaryStatus}
        message={primaryMessage}
        onTest={() => handleTest(primary, setPrimaryStatus, setPrimaryMessage)}
        active={lastGood === "primary"}
      />

      <KeyField
        label="Backup key (optional)"
        hint="Only used if the main key runs out of API calls"
        value={backup}
        onChange={setBackup}
        status={backupStatus}
        message={backupMessage}
        onTest={() => handleTest(backup, setBackupStatus, setBackupMessage)}
        active={lastGood === "backup"}
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-signal-green mr-auto">
            <CheckIcon className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
        <Button variant="primary" onClick={handleSave}>
          Save keys
        </Button>
      </div>
    </div>
  );
}
