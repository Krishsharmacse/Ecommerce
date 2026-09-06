import type { Prisma, Product, UserRole } from "@prisma/client";
import { cache } from "../../config/redis.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { ProductRepository, type ProductFilters } from "./product.repository.js";

const productRepository = new ProductRepository();

export class ProductService {
  async list(filters: ProductFilters, page: number, limit: number) {
    const cacheKey = `products:${JSON.stringify({ filters, page, limit })}`;
    const cached = await cache.get<{ products: Product[]; total: number }>(cacheKey);
    if (cached) return cached;

    const [products, total] = await productRepository.findMany(filters, (page - 1) * limit, limit);
    const result = { products, total };
    await cache.set(cacheKey, result, 30);
    return result;
  }

  async getById(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await cache.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await productRepository.findById(id);
    if (!product || !product.isActive) throw new NotFoundError("Product not found");
    await cache.set(cacheKey, product, 60);
    return product;
  }

  async create(userId: string, role: UserRole, data: { name: string; description: string; pricePaise: number; stock: number; categoryId: string; imageUrl?: string; shopId: string }) {
    await this.assertShopAccess(userId, role, data.shopId);
    return productRepository.create({
      name: data.name,
      slug: `${data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`,
      description: data.description,
      pricePaise: data.pricePaise,
      stock: data.stock,
      category: { connect: { id: data.categoryId } },
      images: data.imageUrl ? { create: { url: data.imageUrl } } : undefined,
      shop: { connect: { id: data.shopId } },
      vendor: { connect: { id: userId } }
    });
  }

  async update(userId: string, role: UserRole, id: string, data: Prisma.ProductUpdateInput) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Product not found");
    await this.assertShopAccess(userId, role, product.shopId);
    const updated = await productRepository.update(id, data);
    await cache.delete(`product:${id}`);
    return updated;
  }

  async remove(userId: string, role: UserRole, id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Product not found");
    await this.assertShopAccess(userId, role, product.shopId);
    const updated = await productRepository.update(id, { isActive: false });
    await cache.delete(`product:${id}`);
    return updated;
  }

  private async assertShopAccess(userId: string, role: UserRole, shopId: string): Promise<void> {
    if (role === "ADMIN") return;
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerId: true, status: true } });
    if (!shop || shop.ownerId !== userId || shop.status !== "APPROVED") {
      throw new ForbiddenError("You can only manage products in your approved shop");
    }
  }
}