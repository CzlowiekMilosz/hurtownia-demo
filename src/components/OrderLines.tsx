import { formatPLN, formatQtyUnit } from "../lib/format";
import { effectiveQty } from "../lib/invoices";
import { round2 } from "../lib/pricing";
import type { Order, Product } from "../types";

/**
 * Pozycje zamówienia. Po kompletacji pokazuje różnice: zmienione ilości,
 * braki towaru i zamienniki.
 */
export function OrderLines({ order, products }: { order: Order; products: Product[] }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const completed = order.status === "skompletowane";
  return (
    <ul className="divide-y divide-stone-100 text-sm">
      {order.items.map((item) => {
        const p = byId.get(item.productId);
        if (!p) return null;
        const sub = item.substituteProductId ? byId.get(item.substituteProductId) : undefined;
        const qty = effectiveQty(item);
        const missing = completed && qty === 0;
        const qtyChanged = completed && !missing && qty !== item.orderedQty;
        const price = sub ? (item.substitutePrice ?? item.unitPrice) : item.unitPrice;
        const changed = missing || qtyChanged || !!sub;
        return (
          <li key={item.productId} className={`flex items-start justify-between gap-3 py-2 ${changed ? "-mx-2 rounded-lg bg-amber-50 px-2" : ""}`}>
            <div className="min-w-0">
              <p className={`font-medium ${missing ? "text-stone-400 line-through" : ""} ${sub ? "text-stone-400 line-through" : ""}`}>
                {p.name}
              </p>
              {sub && (
                <p className="font-medium text-stone-900">
                  ↳ {sub.name} <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">zamiennik</span>
                </p>
              )}
              {missing && <p className="text-xs font-semibold text-red-700">Brak towaru – pozycja usunięta</p>}
              {qtyChanged && (
                <p className="text-xs text-amber-800">
                  Zamówiono {formatQtyUnit(item.orderedQty, p.unit)} → wydano <strong>{formatQtyUnit(qty, p.unit)}</strong>
                </p>
              )}
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="font-semibold">{formatQtyUnit(missing ? item.orderedQty : qty, (sub ?? p).unit)}</p>
              {!missing && <p className="text-xs text-stone-500">{formatPLN(round2(qty * price))}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
