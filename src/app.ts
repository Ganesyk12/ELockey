import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { entriesRouter } from "./routes/entries";

const ALLOWED_ORIGINS = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function createApp(): express.Express {
  const app = express();

  if (process.env["TRUST_PROXY"] === "1") {
    app.set("trust proxy", 1);
  }
  app.use(helmet());
  app.use(
    cors({
      origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
    })
  );
  app.use(express.json({ limit: "64kb" }));

  const isDev = process.env.NODE_ENV !== "production";

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: isDev ? 1000 : 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(
    ["/api/register", "/api/login", "/api/unlock"],
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: isDev ? 100 : 30,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts. Try again later." },
    })
  );

  app.use("/api", authRouter);
  app.use("/api/entries", entriesRouter);

  app.use(
    (
      err: Error & { status?: number; statusCode?: number; type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status = err.status ?? err.statusCode ?? 500;
      if (status >= 500) console.error(err);
      let message = "Internal server error.";
      if (err instanceof SyntaxError && status === 400) {
        message = "Malformed JSON body.";
      } else if (status === 413) {
        message = "Request body too large.";
      }
      res.status(status).json({ error: message });
    }
  );

  return app;
}