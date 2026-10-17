import { useSyncExternalStore } from "react";
import { getReadItems, subscribeReadItems } from "../utils/storage";

export function useReadItems() {
  return useSyncExternalStore(subscribeReadItems, getReadItems);
}
