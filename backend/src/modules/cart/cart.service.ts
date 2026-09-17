import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import type { CartItemInput } from "./cart.types.js";

export class CartService {
  get(userId: string) { return prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: { include: { images: true, shop: true } } } } } }); }
  private getOrCreate(userId: string) { return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } }); }
  async addItem(userId: string, input: CartItemInput) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.status !== "ACTIVE" || !product.isActive) throw new NotFoundError("Active product not found");
    const cart = await this.getOrCreate(userId);
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
    });
    const totalQuantity = (existingItem?.quantity ?? 0) + input.quantity;
    if (product.stock < totalQuantity) {
      throw new ValidationError(`Insufficient stock. Maximum available is ${product.stock}`);
    }
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
      update: { quantity: totalQuantity },
      create: { cartId: cart.id, productId: input.productId, quantity: input.quantity },
    });
  }
  async updateItem(userId: string, id: string, quantity: number) { const item = await prisma.cartItem.findFirst({ where: { id, cart: { userId } }, include: { product: true } }); if (!item) throw new NotFoundError("Cart item not found"); if (item.product.stock < quantity) throw new ValidationError("Insufficient stock"); return prisma.cartItem.update({ where: { id }, data: { quantity } }); }
  async removeItem(userId: string, id: string) { const result = await prisma.cartItem.deleteMany({ where: { id, cart: { userId } } }); if (!result.count) throw new NotFoundError("Cart item not found"); }
  async clear(userId: string) { const cart = await prisma.cart.findUnique({ where: { userId } }); if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } }); }
}