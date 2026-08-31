import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const DATABASE_URL = process.env["DATABASE_URL"]!;

const schema = new URL(DATABASE_URL).searchParams.get("schema") ?? undefined;

const adapter = new PrismaPg({ connectionString: DATABASE_URL }, { schema });

export const db = new PrismaClient({ adapter });