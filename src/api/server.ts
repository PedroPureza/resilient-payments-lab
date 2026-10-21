import { fileURLToPath } from "node:url";
import express from "express";
import { pinoHttp } from "pino-http";
import { startOutboxRelay } from "../queue/outbox-relay.js";
import { env } from "../shared/env.js";
import { logger } from "../shared/logger.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { healthRouter } from "./routes/health.route.js";
import { paymentsRouter } from "./routes/payments.route.js";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(healthRouter);
app.use(paymentsRouter);
app.use(errorHandler);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startOutboxRelay();
  app.listen(env.port, () => {
    logger.info(`API ouvindo em http://localhost:${env.port}`);
  });
}
