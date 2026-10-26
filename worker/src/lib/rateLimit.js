// per-IP limit using a Workers rate-limit binding from wrangler.toml
export function rateLimit(bindingName) {
  return async (c, next) => {
    const key = c.req.header("cf-connecting-ip") || "local";
    const { success } = await c.env[bindingName].limit({ key });
    if (!success) {
      return c.json({ error: "Too many requests! Try again later" }, 429);
    }
    await next();
  };
}
