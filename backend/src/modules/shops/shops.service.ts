import { UserRole, ShopRequestType, ShopRequestStatus, NotificationType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../lib/errors.js";
import type { ShopInput, OpenShopRequestInput, DeleteShopRequestInput } from "./shops.types.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ShopsService {
  list() {
    return prisma.shop.findMany({
      where: { status: "APPROVED", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getById(idOrSlug: string) {
    const shop = await prisma.shop.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
      },
      include: {
        products: { where: { status: "ACTIVE", isActive: true }, include: { images: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!shop) throw new NotFoundError("Shop not found");
    return shop;
  }

  async create(ownerId: string, input: ShopInput) {
    const slug = input.slug || `${slugify(input.name)}-${Date.now().toString().slice(-4)}`;
    return prisma.shop.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        logoUrl: input.logoUrl,
        ownerId,
        members: { create: { userId: ownerId } },
      },
    });
  }

  async update(userId: string, role: UserRole, id: string, input: Partial<ShopInput>) {
    await this.assertOwnerAccess(userId, role, id);
    return prisma.shop.update({ where: { id }, data: input });
  }

  async remove(userId: string, role: UserRole, id: string) {
    await this.assertOwnerAccess(userId, role, id);
    return prisma.shop.update({ where: { id }, data: { deletedAt: new Date(), status: "SUSPENDED" } });
  }

  private async assertOwnerAccess(userId: string, role: UserRole, id: string): Promise<void> {
    if (role === "ADMIN") return;
    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundError("Shop not found");
    if (shop.ownerId !== userId) throw new ForbiddenError("Only the shop owner or an administrator can manage this shop");
  }

  /* ─────────────────────────────────────────────────────────────
     Shop Opening Request (Initiated by Vendor, Reviewed by Admin)
     ───────────────────────────────────────────────────────────── */
  async requestOpenShop(vendorId: string, input: OpenShopRequestInput) {
    const user = await prisma.user.findUnique({ where: { id: vendorId } });
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== UserRole.VENDOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Only users with the Vendor role can request to open a shop. Please contact an admin for vendor promotion.");
    }

    // Check if vendor already has an approved or active shop
    const existingShop = await prisma.shop.findFirst({
      where: { ownerId: vendorId, deletedAt: null, status: { in: ["APPROVED", "PENDING"] } },
    });
    if (existingShop) {
      if (existingShop.status === "APPROVED") {
        throw new ConflictError("You already have an active approved shop.");
      }
      throw new ConflictError("You already have a shop currently pending admin review.");
    }

    // Check for pending opening request
    const pendingRequest = await prisma.shopRequest.findFirst({
      where: { vendorId, type: ShopRequestType.OPEN_SHOP, status: ShopRequestStatus.PENDING },
    });
    if (pendingRequest) {
      throw new ConflictError("You already have a pending shop opening request awaiting admin approval.");
    }

    let slug = input.slug ? slugify(input.slug) : slugify(input.name);
    // Ensure slug uniqueness
    const slugTaken = await prisma.shop.findUnique({ where: { slug } });
    if (slugTaken) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    // Create shop in PENDING status and create the ShopRequest record
    return prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          logoUrl: input.logoUrl,
          status: "PENDING",
          ownerId: vendorId,
          members: { create: { userId: vendorId } },
        },
      });

      const request = await tx.shopRequest.create({
        data: {
          type: ShopRequestType.OPEN_SHOP,
          status: ShopRequestStatus.PENDING,
          vendorId,
          shopId: shop.id,
          shopName: input.name,
          slug,
          category: input.category || "General",
          description: input.description,
          logoUrl: input.logoUrl,
          email: input.email,
          phone: input.phone,
          address: input.address,
        },
      });

      // Send confirmation notification to the vendor
      await tx.notification.create({
        data: {
          userId: vendorId,
          type: NotificationType.SYSTEM,
          title: "Shop Opening Request Submitted",
          message: `Your request to open '${input.name}' has been submitted to platform administrators for review.`,
          data: { requestId: request.id, shopId: shop.id },
        },
      });

      return { shop, request };
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Shop Deletion Request (Initiated by Vendor, Reviewed by Admin)
     ───────────────────────────────────────────────────────────── */
  async requestDeleteShop(vendorId: string, role: UserRole, input: DeleteShopRequestInput) {
    const shop = await prisma.shop.findUnique({ where: { id: input.shopId } });
    if (!shop || shop.deletedAt) throw new NotFoundError("Shop not found");
    if (role !== "ADMIN" && shop.ownerId !== vendorId) {
      throw new ForbiddenError("Only the shop owner can request shop deletion");
    }

    // Check if there is already a pending deletion request
    const existingReq = await prisma.shopRequest.findFirst({
      where: {
        shopId: input.shopId,
        type: ShopRequestType.DELETE_SHOP,
        status: ShopRequestStatus.PENDING,
      },
    });
    if (existingReq) {
      throw new ConflictError("A deletion request for this shop is already pending admin review.");
    }

    const request = await prisma.shopRequest.create({
      data: {
        type: ShopRequestType.DELETE_SHOP,
        status: ShopRequestStatus.PENDING,
        vendorId,
        shopId: shop.id,
        shopName: shop.name,
        slug: shop.slug,
        reason: input.reason,
      },
    });

    await prisma.notification.create({
      data: {
        userId: vendorId,
        type: NotificationType.SYSTEM,
        title: "Shop Deletion Request Submitted",
        message: `Your request to delete shop '${shop.name}' has been submitted to platform administrators for approval.`,
        data: { requestId: request.id, shopId: shop.id },
      },
    });

    return { request };
  }

  /* ─────────────────────────────────────────────────────────────
     Cancel Pending Shop Request (Vendor cancels their own request)
     ───────────────────────────────────────────────────────────── */
  async cancelShopRequest(vendorId: string, requestId: string) {
    const request = await prisma.shopRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError("Request not found");
    if (request.vendorId !== vendorId) throw new ForbiddenError("Unauthorized to cancel this request");
    if (request.status !== ShopRequestStatus.PENDING) {
      throw new ValidationError("Only pending requests can be cancelled");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.shopRequest.update({
        where: { id: requestId },
        data: { status: ShopRequestStatus.CANCELLED },
      });

      // If it was an opening request, also delete or cancel the pending shop
      if (request.type === ShopRequestType.OPEN_SHOP && request.shopId) {
        await tx.shop.delete({ where: { id: request.shopId } }).catch(() => {});
      }

      return updated;
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Vendor Workspace Data (Own shop, products, orders, requests)
     ───────────────────────────────────────────────────────────── */
  async getMyShop(userId: string) {
    const [shop, requests] = await Promise.all([
      prisma.shop.findFirst({
        where: { ownerId: userId, deletedAt: null },
        include: {
          products: {
            where: { deletedAt: null },
            include: { images: true, category: true },
            orderBy: { createdAt: "desc" },
          },
          orderItems: {
            include: { order: { select: { id: true, status: true, createdAt: true, totalPaise: true, user: { select: { firstName: true, lastName: true, email: true } } } }, product: true },
            orderBy: { id: "desc" },
            take: 30,
          },
        },
      }),
      prisma.shopRequest.findMany({
        where: { vendorId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const activePendingRequest = requests.find((r) => r.status === ShopRequestStatus.PENDING) || null;

    if (!shop) {
      return {
        shop: null,
        products: [],
        recentOrders: [],
        requests,
        activeRequest: activePendingRequest,
      };
    }

    const totalRevenue = shop.orderItems.reduce((acc, oi) => acc + (oi.subtotalPaise || 0), 0) / 100;

    return {
      shop: {
        _id: shop.id,
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        logo: shop.logoUrl,
        category: "General",
        status: shop.status.toLowerCase(),
        totalRevenue,
        totalProducts: shop.products.length,
        totalOrders: shop.orderItems.length,
        createdAt: shop.createdAt.toISOString(),
      },
      products: shop.products.map((p) => ({
        _id: p.id,
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.pricePaise / 100,
        stock: p.stock,
        category: p.category?.name || "General",
        image: p.images[0]?.url || "",
        status: p.status.toLowerCase(),
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      })),
      recentOrders: shop.orderItems.map((oi) => ({
        id: oi.order.id,
        status: oi.order.status,
        productName: oi.productName,
        quantity: oi.quantity,
        subtotal: oi.subtotalPaise / 100,
        customerName: `${oi.order.user.firstName} ${oi.order.user.lastName}`,
        customerEmail: oi.order.user.email,
        createdAt: oi.order.createdAt.toISOString(),
      })),
      requests,
      activeRequest: activePendingRequest,
    };
  }

  /* ─────────────────────────────────────────────────────────────
     Admin: List All Shop Requests (Opening & Deletion)
     ───────────────────────────────────────────────────────────── */
  async listShopRequestsAdmin(type?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type.toUpperCase() as ShopRequestType;
    }
    if (status && status !== "all") {
      where.status = status.toUpperCase() as ShopRequestStatus;
    }

    const requests = await prisma.shopRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        shop: {
          select: {
            id: true,
            name: true,
            status: true,
            products: { select: { id: true } },
            orderItems: { select: { subtotalPaise: true } },
          },
        },
      },
    });

    return requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      vendorId: r.vendorId,
      shopId: r.shopId,
      shopName: r.shopName,
      slug: r.slug,
      category: r.category,
      description: r.description,
      logoUrl: r.logoUrl,
      email: r.email,
      phone: r.phone,
      address: r.address,
      reason: r.reason,
      adminNotes: r.adminNotes,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      vendor: {
        id: r.vendor.id,
        name: `${r.vendor.firstName} ${r.vendor.lastName}`.trim(),
        email: r.vendor.email,
        phone: r.vendor.phone,
      },
      shopStats: r.shop
        ? {
            totalProducts: r.shop.products.length,
            totalRevenue: r.shop.orderItems.reduce((acc, i) => acc + i.subtotalPaise, 0) / 100,
            status: r.shop.status.toLowerCase(),
          }
        : null,
    }));
  }

  /* ─────────────────────────────────────────────────────────────
     Admin: Review Shop Request (Approve or Reject)
     ───────────────────────────────────────────────────────────── */
  async reviewShopRequestAdmin(adminId: string, requestId: string, action: "approve" | "reject", adminNotes?: string) {
    const request = await prisma.shopRequest.findUnique({
      where: { id: requestId },
      include: { shop: true, vendor: true },
    });
    if (!request) throw new NotFoundError("Shop request not found");
    if (request.status !== ShopRequestStatus.PENDING) {
      throw new ValidationError(`This request has already been ${request.status.toLowerCase()}`);
    }

    const isApprove = action === "approve";
    const nextStatus = isApprove ? ShopRequestStatus.APPROVED : ShopRequestStatus.REJECTED;

    return prisma.$transaction(async (tx) => {
      // 1. Update request status
      const updatedReq = await tx.shopRequest.update({
        where: { id: requestId },
        data: {
          status: nextStatus,
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
          reviewedById: adminId,
        },
      });

      if (request.type === ShopRequestType.OPEN_SHOP) {
        if (isApprove) {
          // Approve shop
          if (request.shopId) {
            await tx.shop.update({
              where: { id: request.shopId },
              data: { status: "APPROVED" },
            });
          }
          // Ensure vendor role is active
          await tx.user.update({
            where: { id: request.vendorId },
            data: { role: UserRole.VENDOR },
          });
          // Send notification
          await tx.notification.create({
            data: {
              userId: request.vendorId,
              type: NotificationType.SYSTEM,
              title: "🎉 Shop Opening Approved!",
              message: `Congratulations! Your store '${request.shopName}' has been approved and is now live. You can start adding products and managing orders.`,
              data: { shopId: request.shopId, requestId },
            },
          });
        } else {
          // Reject opening request
          if (request.shopId) {
            await tx.shop.update({
              where: { id: request.shopId },
              data: { status: "REJECTED" },
            });
          }
          await tx.notification.create({
            data: {
              userId: request.vendorId,
              type: NotificationType.SYSTEM,
              title: "Shop Opening Request Rejected",
              message: `Your request to open '${request.shopName}' was declined by administrators.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
              data: { shopId: request.shopId, requestId, reason: adminNotes },
            },
          });
        }
      } else if (request.type === ShopRequestType.DELETE_SHOP) {
        if (isApprove) {
          // Approve deletion: archive shop & deactivate products
          if (request.shopId) {
            await tx.shop.update({
              where: { id: request.shopId },
              data: { deletedAt: new Date(), status: "SUSPENDED" },
            });
            await tx.product.updateMany({
              where: { shopId: request.shopId },
              data: { isActive: false, status: "ARCHIVED", deletedAt: new Date() },
            });
          }
          await tx.notification.create({
            data: {
              userId: request.vendorId,
              type: NotificationType.SYSTEM,
              title: "Shop Deletion Approved",
              message: `Your shop deletion request for '${request.shopName}' was approved. The store has been closed and archived.`,
              data: { shopId: request.shopId, requestId },
            },
          });
        } else {
          // Reject deletion: shop remains approved
          await tx.notification.create({
            data: {
              userId: request.vendorId,
              type: NotificationType.SYSTEM,
              title: "Shop Deletion Request Declined",
              message: `Your request to delete shop '${request.shopName}' was declined.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
              data: { shopId: request.shopId, requestId, reason: adminNotes },
            },
          });
        }
      }

      return updatedReq;
    });
  }

  async listAllAdmin(status?: string) {
    const where: any = { deletedAt: null };
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }
    const shops = await prisma.shop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        products: { select: { id: true } },
        orderItems: { select: { subtotalPaise: true } },
      },
    });
    return shops.map((s) => ({
      _id: s.id,
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logo: s.logoUrl,
      category: s.description || "General",
      status: s.status.toLowerCase(),
      createdAt: s.createdAt.toISOString(),
      ownerId: {
        _id: s.owner.id,
        id: s.owner.id,
        firstname: s.owner.firstName,
        lastname: s.owner.lastName,
        name: `${s.owner.firstName} ${s.owner.lastName}`.trim(),
        email: s.owner.email,
        phone: s.owner.phone,
      },
      totalProducts: s.products.length,
      totalRevenue: s.orderItems.reduce((acc, oi) => acc + oi.subtotalPaise, 0) / 100,
    }));
  }

  async updateShopStatus(shopId: string, status: string) {
    const shopStatus = status.toUpperCase() as any;
    return prisma.shop.update({
      where: { id: shopId },
      data: { status: shopStatus },
    });
  }

  async updateStatus(shopId: string, status: string) {
    return this.updateShopStatus(shopId, status);
  }

  async getPlatformSales() {
    const pastDays = 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - pastDays);

    const [totalShops, approvedShops, pendingRequests, orders, topShopsData, recentOrders] = await Promise.all([
      prisma.shop.count({ where: { deletedAt: null } }),
      prisma.shop.count({ where: { status: "APPROVED", deletedAt: null } }),
      prisma.shopRequest.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({
        where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        select: { totalPaise: true },
      }),
      prisma.shop.findMany({
        where: { deletedAt: null, status: "APPROVED" },
        take: 5,
        include: {
          owner: { select: { email: true, firstName: true, lastName: true } },
          orderItems: {
            where: { order: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
            select: { subtotalPaise: true },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
          createdAt: { gte: startDate },
        },
        select: { createdAt: true, totalPaise: true },
      }),
    ]);

    const totalRevenue = orders.reduce((acc, o) => acc + o.totalPaise, 0) / 100;
    const topShops = topShopsData
      .map((s) => ({
        _id: s.id,
        name: s.name,
        category: s.description || "General",
        status: s.status.toLowerCase(),
        ownerId: { firstname: s.owner.firstName, email: s.owner.email },
        totalRevenue: s.orderItems.reduce((acc, oi) => acc + oi.subtotalPaise, 0) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Build day-by-day revenue trend
    const dailyMap = new Map<string, { date: string; label: string; revenue: number; orders: number }>();
    for (let i = pastDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(key, { date: key, label, revenue: 0, orders: 0 });
    }

    for (const ord of recentOrders) {
      const key = ord.createdAt.toISOString().split("T")[0];
      const entry = dailyMap.get(key);
      if (entry) {
        entry.revenue += (ord.totalPaise || 0) / 100;
        entry.orders += 1;
      }
    }

    const incomeTrend = Array.from(dailyMap.values());

    return {
      totalShops,
      approvedShops,
      pendingRequests,
      totalOrders: orders.length,
      totalRevenue,
      topShops,
      incomeTrend,
    };
  }
}