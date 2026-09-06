import { Router } from "express";
import { productRoutes } from "../modules/products/product.routes.js";
import { orderRoutes } from "../modules/orders/order.routes.js";
import { paymentRoutes } from "../modules/payments/payment.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { shopsRoutes } from "../modules/shops/shops.routes.js";
import { cartRoutes } from "../modules/cart/cart.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";
import { notificationsRoutes } from "../modules/notifications/notifications.routes.js";
import { uploadsRoutes } from "../modules/uploads/uploads.routes.js";

export const apiRoutes = Router();

apiRoutes.use("/products", productRoutes);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/shops", shopsRoutes);
apiRoutes.use("/cart", cartRoutes);
apiRoutes.use("/users", usersRoutes);
apiRoutes.use("/notifications", notificationsRoutes);
apiRoutes.use("/uploads", uploadsRoutes);
apiRoutes.use("/orders", orderRoutes);
apiRoutes.use("/payments", paymentRoutes);