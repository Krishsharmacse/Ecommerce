import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from "./cart.controller.js";

export const cartRoutes = Router();
cartRoutes.use(authenticate);
cartRoutes.get("/", getCart);
cartRoutes.post("/items", addCartItem);
cartRoutes.patch("/items/:id", updateCartItem);
cartRoutes.delete("/items/:id", removeCartItem);
cartRoutes.delete("/clear", clearCart);