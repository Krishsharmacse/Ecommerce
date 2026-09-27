import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "./mail.service.js";
import { orderConfirmationTemplate } from "./email-templates.service.js";

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: true,
      },
    });

    if (!order || !order.user?.email) {
      logger.warn({ orderId }, "Order or customer email not found for confirmation email");
      return;
    }

    const totalRupees = order.totalPaise / 100;
    const tpl = orderConfirmationTemplate(order.user.firstName, order.id, totalRupees);

    await sendEmail(
      order.user.email,
      `Order Confirmed! #${order.id.slice(0, 8).toUpperCase()} — ShopVault`,
      tpl.text,
      tpl.html
    );
    logger.info({ orderId, email: order.user.email }, "Order confirmation email delivered");
  } catch (error) {
    logger.error({ err: error, orderId }, "Failed to send order confirmation email");
  }
}
