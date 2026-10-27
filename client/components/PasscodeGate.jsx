import { useState, useSyncExternalStore } from "react";
import { getPasscode, setPasscode, subscribePasscode } from "../utils/storage";
import Button from "./ui/Button";
import { Input } from "./ui/Field";

// this is mostly just cosmetic and temporarily ugly
export default function PasscodeGate({ children }) {
  const passcode = useSyncExternalStore(subscribePasscode, getPasscode);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (passcode) return children;

  async function handleSubmit(e) {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/health", {
        headers: { "X-App-Passcode": value },
      });
      if (res.ok) return setPasscode(value);
      const data = await res.json().catch(() => ({}));
      setError(data.error || `HTTP ${res.status}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="h-full flex flex-col items-center justify-center gap-3 px-4 bg-carbon-950"
    >
      <Input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Passcode"
        className="w-full max-w-xs"
        autoFocus
      />
      <Button
        type="submit"
        variant="primary"
        disabled={!value || checking}
        className="w-full max-w-xs"
      >
        Unlock
      </Button>
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </form>
  );
}
