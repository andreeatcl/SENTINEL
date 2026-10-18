import { useSyncExternalStore } from "react";
import {
  getKeywordOverrides,
  subscribeKeywordOverrides,
} from "../utils/storage";

export function useKeywordOverrides() {
  return useSyncExternalStore(subscribeKeywordOverrides, getKeywordOverrides);
}
