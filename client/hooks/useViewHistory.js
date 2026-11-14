import { useCallback, useState } from "react";

const MAX_ENTRIES = 20;

export function useViewHistory() {
  const [stack, setStack] = useState([]);

  const push = useCallback((entry) => {
    setStack((s) => [...s, entry].slice(-MAX_ENTRIES));
  }, []);

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1));
    return stack[stack.length - 1];
  }, [stack]);

  const clear = useCallback(() => setStack([]), []);

  return { canGoBack: stack.length > 0, push, pop, clear };
}
