import { useSyncExternalStore } from "react";
import { getBackupReminder, subscribeBackupReminder } from "../utils/storage";

export function useBackupReminder() {
  return useSyncExternalStore(subscribeBackupReminder, getBackupReminder);
}
