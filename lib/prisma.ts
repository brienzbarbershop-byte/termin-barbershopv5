import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "./config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
void DATABASE_URL;
