import express from "express";
import { pinoHttp } from "pino-http";
import { env } from "../shared/env";
import { logger } from "../shared/logger";
import { healthRouter } from "./routes/health.route";

/**
 * `app` é exportado separado do `listen()` para poder ser testado com
 * supertest sem precisar abrir uma porta real (ver test/health.test.ts).
 */
export const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(healthRouter);

if (require.main === module) {
  app.listen(env.port, () => {
    logger.info(`API ouvindo em http://localhost:${env.port}`);
  });
}
