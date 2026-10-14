import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { adminProductsRouter } from "./routes/admin-products.routes.js";
import { adminQuotesRouter } from "./routes/admin-quotes.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { categoriesRouter } from "./routes/categories.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { quotesRouter } from "./routes/quotes.routes.js";
import { usersRouter } from "./routes/users.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins,
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ message: "Luna API" });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/quotes", quotesRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin/quotes", adminQuotesRouter);

  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  return app;
}
