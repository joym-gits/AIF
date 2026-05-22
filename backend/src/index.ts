import { app } from "./app";
import { env } from "./env";
import { logger } from "./lib/logger";
import { startScheduler } from "./services/scheduler";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "aif-backend listening");
  startScheduler();
});
