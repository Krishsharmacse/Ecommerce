import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import type { ShopInput } from "./shops.types.js";

export class ShopsService {
  list() { return prisma.shop.findMany({ where: { status: "APPROVED", deletedAt: null }, orderBy: { createdAt: "desc" }, include: { owner: { select: { id: true, firstName: true, lastName: true } } } }); }
  async getById(id: string) { const shop = await prisma.shop.findFirst({ where: { id, deletedAt: null }, include: { products: { where: { status: "ACTIVE", isActive: true }, include: { images: true } } } }); if (!shop) throw new NotFoundError("Shop not found"); return shop; }
  create(ownerId: string, input: ShopInput) { return prisma.shop.create({ data: { ...input, ownerId, members: { create: { userId: ownerId } } } }); }
  async update(userId: string, role: UserRole, id: string, input: Partial<ShopInput>) { await this.assertAccess(userId, role, id); return prisma.shop.update({ where: { id }, data: input }); }
  async remove(userId: string, role: UserRole, id: string) { await this.assertAccess(userId, role, id); return prisma.shop.update({ where: { id }, data: { deletedAt: new Date(), status: "SUSPENDED" } }); }
  private async assertAccess(userId: string, role: UserRole, id: string): Promise<void> { if (role === "ADMIN") return; const membership = await prisma.shopMember.findFirst({ where: { shopId: id, userId } }); if (!membership) throw new ForbiddenError("You do not own this shop"); }
}