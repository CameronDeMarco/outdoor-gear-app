import { PrismaClient } from "@prisma/client";

// A single shared PrismaClient. In dev, Next.js hot-reloads modules constantly;
// without this singleton each reload would open a new DB connection until we run
// out. We cache the client on globalThis so reloads reuse the same instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
