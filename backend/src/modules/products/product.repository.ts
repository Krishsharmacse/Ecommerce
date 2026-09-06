import type { Prisma, Product } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type ProductFilters = {
  shopId?: string;
  category?: string;
  search?: string;
};

export class ProductRepository {
  async findMany(filters: ProductFilters, skip: number, take: number): Promise<[Product[], number]> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      shopId: filters.shopId,
      category: filters.category ? { slug: { equals: filters.category, mode: "insensitive" } } : undefined,
      OR: filters.search ? [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } }
      ] : undefined
    };

    return Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.product.count({ where })
    ]);
  }

  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  }
}