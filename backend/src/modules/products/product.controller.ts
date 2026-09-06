import type { NextFunction, Request, Response } from "express";
import { createProductSchema, productIdSchema, productQuerySchema, updateProductSchema } from "../../utils/validators.js";
import { ProductService } from "./product.service.js";

const productService = new ProductService();

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = productQuerySchema.parse(req.query);
    const result = await productService.list(query, query.page, query.limit);
    res.json({ success: true, products: result.products, pagination: { page: query.page, limit: query.limit, total: result.total, pages: Math.ceil(result.total / query.limit) } });
  } catch (error) { next(error); }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    res.json({ success: true, product: await productService.getById(id) });
  } catch (error) { next(error); }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const data = createProductSchema.parse(req.body);
    const product = await productService.create(user.id, user.role, data);
    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);
    const product = await productService.update(req.user!.id, req.user!.role, id, data);
    res.json({ success: true, product });
  } catch (error) { next(error); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    await productService.remove(req.user!.id, req.user!.role, id);
    res.status(204).send();
  } catch (error) { next(error); }
}