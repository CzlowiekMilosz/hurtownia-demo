import { Link } from "react-router-dom";
import { OrderLines } from "../../components/OrderLines";
import { buttonClass, Card, EmptyState, OrderStatusBadge } from "../../components/ui";
import { formatDateTime, formatDeliveryDate } from "../../lib/dates";
import { formatPLN } from "../../lib/format";
import { effectiveQty, orderTotals } from "../../lib/invoices";
import { useAppState, useCurrentClient } from "../../lib/StoreContext";
import type { Order, OrderStatus } from "../../types";

const statusHint: Record<OrderStatus, string> = {
  nowe: "Czeka na potwierdzenie przez hurtownię.",
  zaakceptowane: "Potwierdzone – kompletujemy towar.",
  skompletowane: "Skompletowane – gotowe do dostawy.",
  odrzucone: "Zamówienie odrzucone.",
};

export default function MyOrders() {
  const { orders, products } = useAppState();
  const client = useCurrentClient();
  const mine = orders
    .filter((o) => o.clientId === client.id)
    .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate) || b.createdAt.localeCompare(a.createdAt));

  if (!mine.length) {
    return (
      <EmptyState title="Nie masz jeszcze zamówień" icon="🧺">
        <p className="mb-4">Wybierz produkty w katalogu i złóż pierwsze zamówienie.</p>
        <Link to="/klient" className={buttonClass()}>
          Przejdź do katalogu
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Moje zamówienia</h1>
      <div className="space-y-3">
        {mine.map((o, i) => (
          <OrderCard key={o.id} order={o} defaultOpen={i === 0} products={products} />
        ))}
      </div>
    </>
  );
}

function OrderCard({ order, products, defaultOpen }: { order: Order; products: Parameters<typeof orderTotals>[1]; defaultOpen: boolean }) {
  const totals = orderTotals(order, products);
  const changes =
    order.status === "skompletowane"
      ? order.items.filter((it) => it.substituteProductId || effectiveQty(it) !== it.orderedQty).length
      : 0;
  return (
    <Card>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">Nr {order.id}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-stone-600">Dostawa: {formatDeliveryDate(order.deliveryDate)}</p>
            <p className="text-xs text-stone-500">Złożone {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold tabular-nums">{order.status === "odrzucone" ? "—" : formatPLN(totals.net)}</p>
            <p className="text-xs text-stone-500">netto</p>
            <span className="mt-1 inline-block text-stone-400 transition-transform group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </div>
        </summary>
        <div className="border-t border-stone-100 px-4 pt-2 pb-4">
          <p className="mb-2 text-sm text-stone-600">{statusHint[order.status]}</p>
          {order.status === "odrzucone" && order.rejectionReason && (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Powód: {order.rejectionReason}</p>
          )}
          {changes > 0 && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Podczas kompletacji zmieniono {changes} {changes === 1 ? "pozycję" : "pozycje"} – szczegóły poniżej.
            </p>
          )}
          <OrderLines order={order} products={products} />
          {order.notes && <p className="mt-2 text-sm text-stone-500">Uwagi: {order.notes}</p>}
          {order.status !== "odrzucone" && (
            <p className="mt-3 flex justify-between border-t border-stone-100 pt-2 text-sm tabular-nums">
              <span className="text-stone-600">Brutto</span>
              <span className="font-semibold">{formatPLN(totals.gross)}</span>
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
