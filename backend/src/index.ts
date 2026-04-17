import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./env";
import { logger } from "./lib/logger";
import authRouter from "./routes/auth";
import feedsRouter from "./routes/feeds";
import meRouter from "./routes/me";
import statsRouter from "./routes/stats";
import itemsRouter from "./routes/items";
import shareRouter from "./routes/share";
import apiKeysRouter from "./routes/apiKeys";
import publicFeedRouter from "./routes/publicFeed";
import notificationsRouter from "./routes/notifications";
import insightsRouter from "./routes/insights";
import { startScheduler } from "./services/scheduler";

const app = express();

// Trust the proxy Cloud Run / Render / Fly sit behind so client IPs are correct
// (req.ip becomes the real client address, which makes rate-limiting per-IP work).
app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no Origin header) and anything in the allow-list.
      if (!origin) return cb(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  "/widget",
  express.static(path.resolve(__dirname, "../../shared/widget"), {
    maxAge: "1h",
    setHeaders: (res) => res.setHeader("Content-Type", "application/javascript; charset=utf-8"),
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "aif-backend" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/feeds", feedsRouter);
app.use("/api/v1/me/api-keys", apiKeysRouter);
app.use("/api/v1/me/notifications", notificationsRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/insights", insightsRouter);
app.use("/api/v1/items", itemsRouter);
app.use("/share", shareRouter);
app.use("/feeds", publicFeedRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "aif-backend listening");
  startScheduler();
});
