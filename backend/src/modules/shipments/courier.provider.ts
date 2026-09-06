export type ShipmentRequest = {
  orderId: string;
  address: Record<string, unknown>;
  items: Array<{ name: string; quantity: number; unitPricePaise: number }>;
};

export type ShipmentResult = {
  providerShipmentId: string;
  trackingNumber?: string;
};

export interface CourierProvider {
  scheduleShipment(input: ShipmentRequest): Promise<ShipmentResult>;
  trackShipment(providerShipmentId: string): Promise<{ status: string; trackingNumber?: string }>;
}