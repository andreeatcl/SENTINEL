import { useSyncExternalStore } from "react";
import { getMutedDomains, subscribeMutedDomains } from "../utils/storage";

export function useMutedDomains() {
  return useSyncExternalStore(subscribeMutedDomains, getMutedDomains);
}
