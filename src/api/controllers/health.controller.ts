import type { Request, Response } from "express";

/**
 * Controller "burro" por design (ver planejamento/01-arquitetura.md §2.1):
 * só lê a request e formata a resposta. Nenhuma lógica de negócio mora aqui.
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}
