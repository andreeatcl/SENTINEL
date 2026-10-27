const encoder = new TextEncoder();

async function sha256(text) {
  return crypto.subtle.digest("SHA-256", encoder.encode(text));
}

export function requirePasscode() {
  return async (c, next) => {
    const expected = c.env.APP_PASSCODE;
    if (!expected) {
      return c.json({ error: "Server passcode is not configured yet" }, 500);
    }
    const given = c.req.header("X-App-Passcode") || "";
    const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
    if (!crypto.subtle.timingSafeEqual(a, b)) {
      return c.json({ error: "Wrong passcode. Please try again" }, 401);
    }
    await next();
  };
}
