import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { createProductSchema, productIdSchema, productQuerySchema, updateProductSchema } from "../../utils/validators.js";
import { ProductService } from "./product.service.js";

const productService = new ProductService();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true },
    });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = productQuerySchema.parse(req.query);
    const result = await productService.list(query, query.page, query.limit);
    res.json({
      success: true,
      products: result.products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    res.json({ success: true, product: await productService.getById(id) });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const body = { ...req.body };

    // Auto-resolve shopId if missing
    if (!body.shopId) {
      const shop = await prisma.shop.findFirst({
        where: { ownerId: user.id, status: "APPROVED", deletedAt: null },
      });
      if (shop) body.shopId = shop.id;
    }

    // Auto-convert price to pricePaise
    if (!body.pricePaise && body.price !== undefined) {
      body.pricePaise = Math.round(Number(body.price) * 100);
    }

    // Auto-resolve image to imageUrl
    if (!body.imageUrl && body.image) {
      body.imageUrl = body.image;
    }

    // Auto-resolve category name to categoryId
    if (!body.categoryId && body.category) {
      const catName = String(body.category).trim();
      let cat = await prisma.category.findFirst({
        where: { OR: [{ name: { equals: catName, mode: "insensitive" } }, { slug: slugify(catName) }] },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: catName, slug: `${slugify(catName)}-${Date.now().toString().slice(-4)}` },
        });
      }
      body.categoryId = cat.id;
    }

    const data = createProductSchema.parse(body);
    const product = await productService.create(user.id, user.role, data);
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    const body = { ...req.body };

    if (!body.pricePaise && body.price !== undefined) {
      body.pricePaise = Math.round(Number(body.price) * 100);
    }
    if (!body.imageUrl && body.image) {
      body.imageUrl = body.image;
    }
    if (!body.categoryId && body.category) {
      const catName = String(body.category).trim();
      const cat = await prisma.category.findFirst({
        where: { OR: [{ name: { equals: catName, mode: "insensitive" } }, { slug: slugify(catName) }] },
      });
      if (cat) body.categoryId = cat.id;
    }

    const data = updateProductSchema.parse(body);
    const product = await productService.update(req.user!.id, req.user!.role, id, data);
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    await productService.remove(req.user!.id, req.user!.role, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}