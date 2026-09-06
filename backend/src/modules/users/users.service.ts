import { prisma } from "../../lib/prisma.js";
import type { z } from "zod";
import { addressSchema, profileSchema } from "./users.schema.js";

export class UsersService {
  getProfile(userId: string) { return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isEmailVerified: true, createdAt: true } }); }
  updateProfile(userId: string, input: z.infer<typeof profileSchema>) { return prisma.user.update({ where: { id: userId }, data: input, select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isEmailVerified: true } }); }
  listAddresses(userId: string) { return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }); }
  async addAddress(userId: string, input: z.infer<typeof addressSchema>) { if (input.isDefault) await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }); return prisma.address.create({ data: { ...input, userId } }); }
  async deleteAddress(userId: string, id: string) { await prisma.address.deleteMany({ where: { id, userId } }); }
}