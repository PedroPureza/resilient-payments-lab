import { fileURLToPath } from "node:url";
import express from "express";
import { pinoHttp } from "pino-http";
import { env } from "../shared/env.js";
import { logger } from "../shared/logger.js";
import { healthRouter } from "./routes/health.route.js";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(healthRouter);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(env.port, () => {
    logger.info(`API ouvindo em http://localhost:${env.port}`);
  });
}
