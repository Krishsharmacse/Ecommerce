import { UserRole, NotificationType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import type { z } from "zod";
import { addressSchema, profileSchema } from "./users.schema.js";

export class UsersService {
  getProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  }

  updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
    return prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
      },
    });
  }

  listAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async addAddress(userId: string, input: z.infer<typeof addressSchema>) {
    if (input.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.create({ data: { ...input, userId } });
  }

  async deleteAddress(userId: string, id: string) {
    const result = await prisma.address.deleteMany({ where: { id, userId } });
    if (!result.count) throw new NotFoundError("Address not found");
  }

  async listAllUsers(roleFilter?: string) {
    let prismaRole: UserRole | undefined;
    if (roleFilter) {
      const lower = roleFilter.toLowerCase();
      if (lower === "vendor" || lower === "manager") prismaRole = UserRole.VENDOR;
      else if (lower === "admin" || lower === "owner") prismaRole = UserRole.ADMIN;
      else if (lower === "customer" || lower === "user") prismaRole = UserRole.CUSTOMER;
    }

    const users = await prisma.user.findMany({
      where: prismaRole ? { role: prismaRole } : undefined,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        ownedShops: {
          where: { deletedAt: null },
          select: { id: true, name: true, status: true, slug: true },
        },
        shopRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, type: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      _id: u.id,
      id: u.id,
      firstname: u.firstName,
      lastname: u.lastName,
      email: u.email,
      phone: u.phone,
      role: u.role.toLowerCase(),
      rawRole: u.role,
      isverified: u.isEmailVerified,
      isVendor: u.role === UserRole.VENDOR,
      isAdmin: u.role === UserRole.ADMIN,
      isCustomer: u.role === UserRole.CUSTOMER,
      isManagerApproved: u.role === UserRole.VENDOR,
      shopId: u.ownedShops[0]
        ? {
            _id: u.ownedShops[0].id,
            id: u.ownedShops[0].id,
            name: u.ownedShops[0].name,
            status: u.ownedShops[0].status.toLowerCase(),
            slug: u.ownedShops[0].slug,
          }
        : null,
      latestShopRequest: u.shopRequests[0] || null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async getUserStats() {
    const [total, vendors, admins, customers, pendingShopRequests] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.VENDOR } }),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.shopRequest.count({ where: { status: "PENDING" } }),
    ]);

    return {
      users: {
        total,
        vendors,
        admins,
        customers,
        pendingShopRequests,
        managers: vendors,
        owners: admins,
        pendingManagers: pendingShopRequests,
      },
    };
  }

  async changeRole(targetUserId: string, role: string) {
    const lower = role.toLowerCase();
    let prismaRole: UserRole = UserRole.CUSTOMER;

    if (lower === "admin" || lower === "owner") {
      prismaRole = UserRole.ADMIN;
    } else if (lower === "vendor" || lower === "manager") {
      prismaRole = UserRole.VENDOR;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: prismaRole },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    // Notify user if promoted to Vendor
    if (prismaRole === UserRole.VENDOR) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: NotificationType.SYSTEM,
          title: "🎉 You've been promoted to Vendor!",
          message: "A platform administrator has promoted your account to Vendor. You can now visit your Vendor Workspace and submit a request to open your storefront.",
        },
      }).catch(() => {});
    }

    return updated;
  }

  async approveManager(targetUserId: string, action: "approve" | "reject") {
    return this.changeRole(targetUserId, action === "approve" ? "vendor" : "customer");
  }
}