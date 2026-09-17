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

  const shop = await prisma.shop.upsert({
    where: { slug: "shopvault-flagship" },
    update: { ownerId: vendor.id, status: ShopStatus.APPROVED },
    create: { name: "ShopVault Flagship Store", slug: "shopvault-flagship", ownerId: vendor.id, status: ShopStatus.APPROVED }
  });
  await prisma.shopMember.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: vendor.id } },
    update: {},
    create: { shopId: shop.id, userId: vendor.id }
  });

  const categoriesData = [
    { name: "Electronics", slug: "electronics", description: "Precision audio, peripherals, and everyday tech" },
    { name: "Apparel", slug: "apparel", description: "Timeless tailoring, knitwear, and premium leather" },
    { name: "Lifestyle", slug: "lifestyle", description: "Curated accessories, eyewear, and timepieces" },
    { name: "Home", slug: "home", description: "Studio ceramics, walnut organizers, and daily essentials" },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categories[c.slug] = cat.id;
  }

  const sampleProducts = [
    {
      name: "Aura ANC Studio Headphones",
      slug: "aura-anc-studio-headphones",
      description: "Precision-tuned acoustic drivers with hybrid active noise cancellation, custom memory-foam ear cushions, and 40-hour continuous playback.",
      pricePaise: 1899900,
      stock: 25,
      categorySlug: "electronics",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"
    },
    {
      name: "Linear Mechanical Keyboard",
      slug: "linear-mechanical-keyboard",
      description: "CNC-machined aluminum chassis, custom lubed switches, hot-swappable PCB, and double-shot PBT keycaps.",
      pricePaise: 1249900,
      stock: 40,
      categorySlug: "electronics",
      imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80"
    },
    {
      name: "Chronograph Minimalist Watch",
      slug: "chronograph-minimalist-watch",
      description: "Sapphire crystal face, Swiss quartz movement, 316L stainless steel case, and vegetable-tanned Italian leather band.",
      pricePaise: 1499900,
      stock: 15,
      categorySlug: "lifestyle",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
    },
    {
      name: "Full-Grain Leather Weekender",
      slug: "full-grain-leather-weekender",
      description: "Handcrafted full-grain saddle leather, solid brass hardware, waterproof interior lining, and compliant cabin luggage dimensions.",
      pricePaise: 2299900,
      stock: 10,
      categorySlug: "apparel",
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
    },
    {
      name: "Merino Knit Overshirt",
      slug: "merino-knit-overshirt",
      description: "100% extrafine Australian merino wool with dense milano stitch, horn buttons, and tailored relaxed silhouette.",
      pricePaise: 899900,
      stock: 35,
      categorySlug: "apparel",
      imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80"
    },
    {
      name: "Ceramic Pour-Over Dripper Set",
      slug: "ceramic-pour-over-dripper-set",
      description: "Handmade matte ceramic dripper with heat-resistant borosilicate carafe and reusable stainless steel micro-filter.",
      pricePaise: 349900,
      stock: 50,
      categorySlug: "home",
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80"
    },
    {
      name: "Walnut Desk Shelf & Organizer",
      slug: "walnut-desk-shelf-organizer",
      description: "Solid American walnut platform with cork feet, anodized aluminum trays, and integrated hidden cable pass-through.",
      pricePaise: 949900,
      stock: 18,
      categorySlug: "home",
      imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80"
    },
    {
      name: "Titanium Polarized Sunglasses",
      slug: "titanium-polarized-sunglasses",
      description: "Ultralight aerospace-grade titanium frame with Category 3 polarized lenses and anti-reflective internal coating.",
      pricePaise: 1199900,
      stock: 30,
      categorySlug: "lifestyle",
      imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"
    },
  ];

  for (const p of sampleProducts) {
    const prod = await prisma.product.upsert({
      where: { shopId_slug: { shopId: shop.id, slug: p.slug } },
      update: {
        name: p.name,
        description: p.description,
        pricePaise: p.pricePaise,
        stock: p.stock,
        status: ProductStatus.ACTIVE,
        isActive: true,
      },
      create: {
        shopId: shop.id,
        categoryId: categories[p.categorySlug] || categories["electronics"],
        vendorId: vendor.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        pricePaise: p.pricePaise,
        stock: p.stock,
        status: ProductStatus.ACTIVE,
        isActive: true,
      },
    });

    // Seed image
    const existingImg = await prisma.productImage.findFirst({ where: { productId: prod.id } });
    if (!existingImg) {
      await prisma.productImage.create({
        data: {
          productId: prod.id,
          url: p.imageUrl,
          altText: p.name,
        }
      });
    }
  }

  console.log(`Successfully seeded ${sampleProducts.length} curated products with images and categories.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
