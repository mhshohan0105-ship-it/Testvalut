import "server-only";
import { createPrismaClient } from "./client";

type Client = ReturnType<typeof createPrismaClient>;

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: Client };

export const db: Client = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
