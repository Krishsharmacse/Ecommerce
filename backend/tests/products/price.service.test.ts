import { describe, expect, it } from "vitest";
import { PriceService } from "../../src/services/price.service.js";

describe("PriceService", () => {
  it("calculates integer paise totals without floating point currency", () => {
    const service = new PriceService();
    expect(service.calculateSubtotal([{ unitPricePaise: 1999, quantity: 2 }, { unitPricePaise: 501, quantity: 1 }])).toBe(4499);
    expect(service.calculateTotal(4499, 450, 100, 500)).toBe(4549);
  });
});