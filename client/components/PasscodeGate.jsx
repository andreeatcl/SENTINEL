import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getLastActive,
  getPasscode,
  setPasscode,
  subscribePasscode,
  touchLastActive,
} from "../utils/storage";
import background from "../assets/lockscreen/background.webp";
import worldMap from "../assets/lockscreen/world-map.svg";
import Fingerprint from "./Fingerprint";
import Button from "./ui/Button";
import { Input } from "./ui/Field";

const LOCK_AFTER_MS = 15 * 60 * 1000;

const recentlyActive = () => Date.now() - getLastActive() < LOCK_AFTER_MS;

// this is mostly just cosmetic
export default function PasscodeGate({ children }) {
  const passcode = useSyncExternalStore(subscribePasscode, getPasscode);
  const [entered, setEntered] = useState(recentlyActive);
  const unlocked = entered && Boolean(passcode);

  useEffect(() => {
    if (!unlocked) return;
    touchLastActive();
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") touchLastActive();
      else if (!recentlyActive()) setEntered(false);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [unlocked]);

  if (unlocked) return children;

  return (
    <div className="relative flex h-full flex-col items-center overflow-hidden bg-black px-4">
      <img
        src={background}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative mt-[18vh] w-full max-w-xs">
        <img src={worldMap} alt="" className="w-full" />
        <h1 className="absolute inset-0 flex items-center justify-center pl-[0.3em] font-mono text-[clamp(2rem,11vw,2.75rem)] font-semibold tracking-[0.3em] text-white">
          SENTINEL
        </h1>
      </div>
      <div className="relative mb-[14vh] mt-auto flex w-full flex-col items-center gap-3">
        {entered ? (
          <PasscodeForm />
        ) : (
          <Fingerprint onComplete={() => setEntered(true)} />
        )}
      </div>
    </div>
  );
}

function PasscodeForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

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
      className="flex w-full max-w-xs flex-col items-center gap-3 animate-fade-in"
    >
      <Input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Passcode"
        className="w-full"
        autoFocus
      />
      <Button
        type="submit"
        variant="primary"
        disabled={!value || checking}
        className="w-full"
      >
        Unlock
      </Button>
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </form>
  );
}
