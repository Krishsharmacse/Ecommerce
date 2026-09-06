export type PriceLine = { unitPricePaise: number; quantity: number };

export class PriceService {
  calculateSubtotal(lines: PriceLine[]): number {
    return lines.reduce((total, line) => total + line.unitPricePaise * line.quantity, 0);
  }

  calculateTotal(subtotalPaise: number, taxPaise = 0, shippingPaise = 0, discountPaise = 0): number {
    return Math.max(subtotalPaise + taxPaise + shippingPaise - discountPaise, 0);
  }
}