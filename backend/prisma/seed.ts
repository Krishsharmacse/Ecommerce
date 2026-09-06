import { PrismaClient, ProductStatus, ShopStatus, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@shopvault.local" },
    update: { passwordHash, role: UserRole.ADMIN },
    create: { email: "admin@shopvault.local", passwordHash, firstName: "Admin", lastName: "User", role: UserRole.ADMIN, isEmailVerified: true }
  });
  const vendor = await prisma.user.upsert({
    where: { email: "vendor@shopvault.local" },
    update: { passwordHash, role: UserRole.VENDOR },
    create: { email: "vendor@shopvault.local", passwordHash, firstName: "Demo", lastName: "Vendor", role: UserRole.VENDOR, isEmailVerified: true }
  });
  await prisma.user.upsert({
    where: { email: "customer@shopvault.local" },
    update: { passwordHash, role: UserRole.CUSTOMER },
    create: { email: "customer@shopvault.local", passwordHash, firstName: "Demo", lastName: "Customer", role: UserRole.CUSTOMER, isEmailVerified: true }
  });

  const category = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: { name: "Electronics" },
    create: { name: "Electronics", slug: "electronics", description: "Consumer electronics" }
  });
  const shop = await prisma.shop.upsert({
    where: { slug: "demo-store" },
    update: { ownerId: vendor.id, status: ShopStatus.APPROVED },
    create: { name: "Demo Store", slug: "demo-store", ownerId: vendor.id, status: ShopStatus.APPROVED }
  });
  await prisma.shopMember.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: vendor.id } },
    update: {},
    create: { shopId: shop.id, userId: vendor.id }
  });
  await prisma.product.upsert({
    where: { shopId_slug: { shopId: shop.id, slug: "demo-wireless-headphones" } },
    update: { status: ProductStatus.ACTIVE, stock: 50 },
    create: {
      shopId: shop.id,
      categoryId: category.id,
      vendorId: vendor.id,
      name: "Demo Wireless Headphones",
      slug: "demo-wireless-headphones",
      description: "Development seed product",
      pricePaise: 249900,
      stock: 50,
      status: ProductStatus.ACTIVE
    }
  });
  console.log(`Seeded admin ${admin.email}, vendor ${vendor.email}, and demo marketplace data.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
