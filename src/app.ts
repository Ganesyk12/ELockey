import express from "express";
import { authRouter } from "./routes/auth";
import { entriesRouter } from "./routes/entries";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use("/api", authRouter);
  app.use("/api/entries", entriesRouter);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error." });
    }
  );

  return app;
}
