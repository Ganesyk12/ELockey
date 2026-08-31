import type { Session } from "./session";

declare global {
  namespace Express {
    interface Request {
      token: string;
      session: Session;
      userId: string;
      username: string;
      masterKey: string;
    }
  }
}

export {};
