import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// PrismaClient 单例：tsx watch 热重载会反复执行模块，
// 挂到 globalThis 上避免每次重载都新建连接池。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
