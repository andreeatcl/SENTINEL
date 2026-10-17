import { useCallback, useEffect, useState } from "react";
import { fetchKeyUsage } from "../utils/newsApi";

export function useApiCredits(meta) {
  const [credits, setCredits] = useState(null);

  const refresh = useCallback(async () => {
    const usage = await fetchKeyUsage();
    setCredits(
      usage
        ? { remaining: usage.apiCallsRemaining, keyUsed: usage.keyUsed }
        : null,
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof meta?.apiCallsRemaining !== "number") return;
    setCredits((current) => ({
      remaining: meta.apiCallsRemaining,
      keyUsed: meta.keyUsed ?? current?.keyUsed ?? null,
    }));
  }, [meta]);

  return { credits, refreshCredits: refresh };
}
