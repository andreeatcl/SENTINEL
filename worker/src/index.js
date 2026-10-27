import { Hono } from "hono";
import { cors } from "hono/cors";
import news from "./routes/news.js";
import health from "./routes/health.js";
import events from "./routes/events.js";
import { scheduled } from "./scheduled.js";
import { rateLimit } from "./lib/rateLimit.js";
import { requirePasscode } from "./lib/passcode.js";

const app = new Hono();

app.use("/api/*", cors());
app.use("/api/keys/test", rateLimit("RL_KEYS_TEST"));
app.use("/api/news", rateLimit("RL_NEWS"));
app.use("/api/events", rateLimit("RL_EVENTS"));
app.use("/api/keys/usage", rateLimit("RL_LIGHT"));
app.use("/api/health", rateLimit("RL_LIGHT"));
app.use("/api/*", requirePasscode());
app.route("/api", news);
app.route("/api", health);
app.route("/api", events);

app.get("/", (c) => c.text("Sentinel API worker is running."));

export default { fetch: app.fetch, scheduled };
