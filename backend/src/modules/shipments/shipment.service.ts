import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { ShiprocketProvider } from "./shiprocket.provider.js";
import { ShipmentRepository } from "./shipment.repository.js";

const shipmentRepository = new ShipmentRepository();
const courierProvider = new ShiprocketProvider();

export class ShipmentService {
  async schedule(orderId: string) {
    const order = await shipmentRepository.findOrder(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.shipment) return order.shipment;

    const shipment = await courierProvider.scheduleShipment({
      orderId,
      address: order.address ? { name: order.address.fullName, phone: order.address.phone, line1: order.address.line1, city: order.address.city, state: order.address.state, postalCode: order.address.postalCode } : {},
      items: order.items.map((item) => ({ name: item.product.name, quantity: item.quantity, unitPricePaise: item.unitPricePaise }))
    });
    const created = await shipmentRepository.create(orderId, shipment.providerShipmentId, shipment.trackingNumber);
    await prisma.order.update({ where: { id: orderId }, data: { status: "PROCESSING" } });
    return created;
  }
}