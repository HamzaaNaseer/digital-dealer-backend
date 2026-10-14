import { Router } from "express";
import { Health } from "../models/health.model.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    const record = await Health.create({ status: "ok" });

    res.json({
      status: "ok",
      service: "luna-backend",
      database: "connected",
      checkedAt: record.checkedAt,
    });
  } catch (error) {
    next(error);
  }
});
