import type { Client, InvoiceLine, Order, Product } from "../types";
import { computeTotals } from "./pricing";

/** Faktyczna ilość pozycji (po kompletacji) albo zamówiona. */
export const effectiveQty = (item: Order["items"][number]) => item.actualQty ?? item.orderedQty;

/** Buduje pozycje faktury z zamówienia: faktyczne ilości, zamienniki, braki pominięte. */
export function buildInvoiceLines(order: Order, products: Product[]): InvoiceLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: InvoiceLine[] = [];
  for (const item of order.items) {
    const qty = effectiveQty(item);
    if (qty <= 0) continue; // brak towaru
    const product = byId.get(item.substituteProductId ?? item.productId);
    if (!product) continue;
    lines.push({
      name: product.name,
      qty,
      unit: product.unit,
      netPrice: item.substituteProductId ? (item.substitutePrice ?? item.unitPrice) : item.unitPrice,
      vatRate: product.vatRate,
    });
  }
  return lines;
}

/** Problemy blokujące wysłanie faktury. Pusta lista = można wysłać. */
export function validateInvoice(
  lines: InvoiceLine[],
  client: Client | undefined,
  order: Order | undefined,
): string[] {
  const problems: string[] = [];
  if (!client) problems.push("Nie znaleziono nabywcy.");
  else if (!client.nip.trim()) problems.push(`Brak NIP nabywcy (${client.name}) – uzupełnij w „Klienci i cenniki”.`);
  if (lines.length === 0) problems.push("Faktura nie ma żadnych pozycji.");
  if (lines.some((l) => !(l.qty > 0))) problems.push("Faktura zawiera pozycje z zerową ilością.");
  if (lines.some((l) => !(l.netPrice > 0))) problems.push("Faktura zawiera pozycje z zerową ceną.");
  if (order && order.status !== "skompletowane") problems.push("Zamówienie nie zostało jeszcze skompletowane.");
  return problems;
}

/** Fikcyjny identyfikator w stylu numeru KSeF – wyraźnie oznaczony DEMO. */
export function makeKsefDemoId(nip: string, date: Date): string {
  const digits = nip.replace(/\D/g, "").padStart(10, "0");
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const hash = Array.from({ length: 12 }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
  return `DEMO-${digits}-${ymd}-${hash}`;
}

export function makeInvoiceNumber(n: number, date: Date): string {
  return `FV/${n}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

/** Sumy zamówienia (po kompletacji – wg faktycznych ilości i zamienników). */
export function orderTotals(order: Order, products: Product[]) {
  return computeTotals(buildInvoiceLines(order, products));
}
