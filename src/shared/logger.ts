import pino from "pino";
import { env } from "./env";

/**
 * Logger central da aplicação (pino). API e Worker usam a mesma configuração
 * base; cada requisição HTTP ganha um correlation ID via pino-http (ver
 * src/api/server.ts) para reconstruir a linha do tempo de um pagamento nos
 * experimentos.
 */
export const logger = pino({
  level: env.logLevel,
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});
