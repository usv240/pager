import type { NextFunction, Request, Response } from "express";
import { nextId } from "../utils/ids.js";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id")?.trim();
  req.requestId = incoming && incoming.length <= 100 ? incoming : nextId("request");
  res.setHeader("x-request-id", req.requestId);
  next();
}
