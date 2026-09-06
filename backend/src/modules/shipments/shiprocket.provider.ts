import axios, { type AxiosInstance } from "axios";
import { env } from "../../config/env.js";
import type { CourierProvider, ShipmentRequest, ShipmentResult } from "./courier.provider.js";

export class ShiprocketProvider implements CourierProvider {
  private readonly client: AxiosInstance = axios.create({ baseURL: env.SHIPROCKET_API_URL, timeout: 10000 });

  async scheduleShipment(input: ShipmentRequest): Promise<ShipmentResult> {
    const response = await this.client.post<{ shipment_id?: string; awb_code?: string }>("/orders/create/adhoc", {
      order_id: input.orderId,
      billing_customer_name: input.address.name,
      billing_address: input.address.line1,
      billing_city: input.address.city,
      billing_pincode: input.address.postalCode,
      billing_phone: input.address.phone,
      order_items: input.items.map((item) => ({ name: item.name, units: item.quantity, selling_price: item.unitPricePaise / 100 })),
      payment_method: "Prepaid"
    });
    if (!response.data.shipment_id) throw new Error("Courier did not return a shipment ID");
    return { providerShipmentId: response.data.shipment_id, trackingNumber: response.data.awb_code };
  }

  async trackShipment(providerShipmentId: string) {
    const response = await this.client.get<{ tracking_data?: { shipment_status?: string; awb_code?: string } }>(`/courier/track/shipment/${providerShipmentId}`);
    return { status: response.data.tracking_data?.shipment_status ?? "UNKNOWN", trackingNumber: response.data.tracking_data?.awb_code };
  }
}