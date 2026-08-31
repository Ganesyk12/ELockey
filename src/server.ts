import "dotenv/config";
import { createApp } from "./app";
import { db } from "./prisma/db";

await db.connect();

const HOST = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 5655);
createApp().listen(port, HOST, () => {
  console.log(`ELockey vault running on http://${HOST}:${port}`);
});
