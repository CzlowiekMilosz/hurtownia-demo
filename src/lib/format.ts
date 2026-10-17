import type { Unit } from "../types";

const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const qtyFmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

export const formatPLN = (n: number) => pln.format(n);
export const formatQty = (n: number) => qtyFmt.format(n);

const unitShort: Record<Unit, string> = { kg: "kg", skrzynka: "skrz.", szt: "szt.", "pęczek": "pęcz." };
export const formatUnit = (u: Unit) => unitShort[u];
export const formatQtyUnit = (n: number, u: Unit) => `${formatQty(n)} ${unitShort[u]}`;

/** Krok przycisków +/− zależny od jednostki */
export const qtyStep = (u: Unit) => (u === "kg" ? 0.5 : 1);

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
