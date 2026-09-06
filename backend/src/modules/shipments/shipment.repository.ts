import { prisma } from "../../lib/prisma.js";

export class ShipmentRepository {
  findOrder(orderId: string) {
    return prisma.order.findUnique({ where: { id: orderId }, include: { address: true, items: { include: { product: true } }, shipment: true } });
  }

  create(orderId: string, providerShipmentId: string, trackingNumber?: string) {
    return prisma.shipment.create({ data: { orderId, provider: "shiprocket", providerShipmentId, awbNumber: trackingNumber, status: "CREATED" } });
  }
}