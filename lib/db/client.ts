import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

export function isLocalDatabase(connectionString: string) {
  const host = new URL(connectionString).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  // The Neon driver only speaks to Neon, so a local Postgres used for development goes through pg.
  const adapter = isLocalDatabase(connectionString)
    ? new PrismaPg({ connectionString })
    : new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}
