import { useEffect, useRef, useState } from "react";

// instead of saving after every keystroke,
// saving is done every 2 seconds or 0.5s after a pause in typing
const SAVE_DELAY_MS = 500;
const MAX_WAIT_MS = 2000;

export function useAutosave(save, active) {
  const [saveFailed, setSaveFailed] = useState(false);
  const pendingRef = useRef(null);
  const delayTimerRef = useRef(null);
  const maxWaitTimerRef = useRef(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  function flush() {
    clearTimeout(delayTimerRef.current);
    clearTimeout(maxWaitTimerRef.current);
    delayTimerRef.current = null;
    maxWaitTimerRef.current = null;
    if (pendingRef.current === null) return;
    const value = pendingRef.current;
    pendingRef.current = null;
    setSaveFailed(!saveRef.current(value));
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => () => flushRef.current(), []);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  function queue(value) {
    pendingRef.current = value;
    clearTimeout(delayTimerRef.current);
    delayTimerRef.current = setTimeout(flush, SAVE_DELAY_MS);
    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(flush, MAX_WAIT_MS);
    }
  }

  return { queue, flush, saveFailed };
}
