import type { Client, InvoiceLine, Product } from "../types";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Cena netto produktu dla danego klienta: cena indywidualna albo cena bazowa minus rabat. */
export function getClientPrice(client: Client, product: Product): number {
  const override = client.pricing.overrides?.[product.id];
  if (override !== undefined) return round2(override);
  const discount = client.pricing.discountPercent ?? 0;
  return round2(product.basePrice * (1 - discount / 100));
}

export interface Totals {
  net: number;
  vat: number;
  gross: number;
  byRate: { rate: number; net: number; vat: number }[];
}

/** Sumy netto/VAT/brutto – VAT liczony od sumy netto w każdej stawce. */
export function computeTotals(lines: Pick<InvoiceLine, "qty" | "netPrice" | "vatRate">[]): Totals {
  const rates = new Map<number, number>();
  for (const l of lines) {
    rates.set(l.vatRate, (rates.get(l.vatRate) ?? 0) + round2(l.qty * l.netPrice));
  }
  const byRate = [...rates.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, net]) => ({ rate, net: round2(net), vat: round2((net * rate) / 100) }));
  const net = round2(byRate.reduce((s, r) => s + r.net, 0));
  const vat = round2(byRate.reduce((s, r) => s + r.vat, 0));
  return { net, vat, gross: round2(net + vat), byRate };
}
