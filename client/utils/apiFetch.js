import { getPasscode, setPasscode } from "./storage";

// every api call goes through this
// 401 response -> passcode cleared and lock screen showed to user
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, "X-App-Passcode": getPasscode() },
  });
  if (res.status === 401) setPasscode("");
  return res;
}
