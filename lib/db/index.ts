import "server-only";
import { createPrismaClient } from "./client";

type Client = ReturnType<typeof createPrismaClient>;

// One client per process: hot reloads in development and separate server bundles in production
// would otherwise each open their own connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: Client };

export const db: Client = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;
