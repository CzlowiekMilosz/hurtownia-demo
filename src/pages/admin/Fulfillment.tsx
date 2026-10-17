import { useState } from "react";
import { Link } from "react-router-dom";
import { OrderLines } from "../../components/OrderLines";
import { useToast } from "../../components/Toast";
import { Button, Card, EmptyState, OrderStatusBadge, PageHeader } from "../../components/ui";
import { formatDeliveryDate, tomorrow } from "../../lib/dates";
import { formatPLN, formatQtyUnit, formatUnit } from "../../lib/format";
import { getClientPrice, round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { completeOrder, type FulfillmentInput } from "../../lib/store";
import type { Client, Order, Product } from "../../types";

export default function Fulfillment() {
  const { orders } = useAppState();
  const relevant = orders.filter((o) => o.status === "zaakceptowane" || o.status === "skompletowane");
  const dates = [...new Set(relevant.map((o) => o.deliveryDate))].sort();
  const firstPending = [...new Set(orders.filter((o) => o.status === "zaakceptowane").map((o) => o.deliveryDate))].sort()[0];
  const [date, setDate] = useState(firstPending ?? (dates.includes(tomorrow()) ? tomorrow() : (dates.at(-1) ?? tomorrow())));

  const forDate = relevant.filter((o) => o.deliveryDate === date);
  const pending = forDate.filter((o) => o.status === "zaakceptowane").sort((a, b) => a.id.localeCompare(b.id));
  const done = forDate.filter((o) => o.status === "skompletowane");

  return (
    <>
      <PageHeader
        title="Kompletacja"
        subtitle="Wpisz faktycznie wydane ilości (po zważeniu), zaznacz braki i zamienniki. Szkic faktury zaktualizuje się automatycznie."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300" aria-label="Dzień dostawy">
          {!dates.includes(date) && <option value={date}>{formatDeliveryDate(date)}</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDeliveryDate(d)}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500">
          Do skompletowania: <strong className="text-stone-900">{pending.length}</strong> · gotowe: {done.length}
        </span>
      </div>

      {pending.length === 0 && (
        <EmptyState title="Brak zamówień do skompletowania na ten dzień" icon="⚖️">
          Kompletować można zaakceptowane zamówienia. <Link className="font-semibold text-brand underline" to="/hurtownia/zamowienia">Przejdź do zamówień</Link>.
        </EmptyState>
      )}

      <div className="space-y-5">
        {pending.map((o) => (
          <FulfillmentCard key={o.id} order={o} />
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-stone-500 uppercase">Skompletowane</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {done.map((o) => (
              <DoneCard key={o.id} order={o} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

interface LineState {
  actual: string;
  missing: boolean;
  sub: string; // "" = brak zamiennika
}

const parseQty = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? round2(n) : NaN;
};

function FulfillmentCard({ order }: { order: Order }) {
  const { products, clients } = useAppState();
  const toast = useToast();
  const client = clients.find((c) => c.id === order.clientId) as Client;
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      order.items.map((it) => [
        it.productId,
        { actual: String(it.actualQty ?? it.orderedQty).replace(".", ","), missing: false, sub: it.substituteProductId ?? "" },
      ]),
    ),
  );
  const set = (id: string, patch: Partial<LineState>) => setLines((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  let total = 0;
  let changes = 0;
  let invalid = false;
  for (const it of order.items) {
    const l = lines[it.productId];
    const qty = l.missing ? 0 : parseQty(l.actual);
    if (Number.isNaN(qty)) invalid = true;
    if (l.missing || l.sub || qty !== it.orderedQty) changes++;
    const p = products.find((x) => x.id === (l.sub || it.productId));
    if (p && !Number.isNaN(qty)) total += qty * (l.sub ? getClientPrice(client, p) : it.unitPrice);
  }

  const onConfirm = () => {
    if (invalid) {
      toast("Popraw ilości – wpisz liczby (np. 9,6).", "error");
      return;
    }
    const input: FulfillmentInput[] = order.items.map((it) => {
      const l = lines[it.productId];
      return {
        productId: it.productId,
        actualQty: l.missing ? 0 : parseQty(l.actual),
        substituteProductId: l.missing ? undefined : l.sub || undefined,
      };
    });
    if (input.every((i) => i.actualQty === 0)) {
      toast("Wszystkie pozycje oznaczone jako brak – rozważ odrzucenie zamówienia.", "error");
      return;
    }
    completeOrder(order.id, input);
    toast(`Zamówienie nr ${order.id} skompletowane – szkic faktury zaktualizowany.`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
        <div>
          <span className="font-bold">Nr {order.id}</span> · <span className="font-medium">{client.name}</span>
          {order.notes && <p className="text-sm text-stone-600">💬 {order.notes}</p>}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-stone-500 uppercase">
            <tr>
              <th className="px-4 py-2 font-semibold">Produkt</th>
              <th className="px-2 py-2 text-right font-semibold">Zamówiono</th>
              <th className="px-2 py-2 font-semibold">Faktycznie</th>
              <th className="px-2 py-2 font-semibold">Brak</th>
              <th className="px-4 py-2 font-semibold">Zamiennik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {order.items.map((it) => {
              const p = products.find((x) => x.id === it.productId) as Product;
              const l = lines[it.productId];
              const qty = l.missing ? 0 : parseQty(l.actual);
              const diff = l.missing || !!l.sub || qty !== it.orderedQty;
              const sub = l.sub ? products.find((x) => x.id === l.sub) : undefined;
              return (
                <tr key={it.productId} className={l.missing ? "bg-red-50" : diff ? "bg-amber-50" : ""}>
                  <td className={`px-4 py-2 font-medium ${l.missing ? "text-stone-400 line-through" : ""}`}>{p.name}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-600">{formatQtyUnit(it.orderedQty, p.unit)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        inputMode="decimal"
                        value={l.missing ? "0" : l.actual}
                        disabled={l.missing}
                        onChange={(e) => set(it.productId, { actual: e.target.value })}
                        className={`h-9 w-20 rounded-lg bg-white px-2 text-right font-semibold tabular-nums ring-1 focus:ring-2 focus:ring-brand focus:outline-none disabled:bg-stone-100 ${
                          Number.isNaN(qty) ? "ring-red-500" : diff && !l.missing ? "ring-amber-400" : "ring-stone-300"
                        }`}
                        aria-label={`Faktyczna ilość: ${p.name}`}
                      />
                      <span className="text-stone-500">{formatUnit((sub ?? p).unit)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={l.missing}
                      onChange={(e) => set(it.productId, { missing: e.target.checked, sub: e.target.checked ? "" : l.sub })}
                      className="h-5 w-5 accent-red-600"
                      aria-label={`Brak towaru: ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={l.sub}
                      disabled={l.missing}
                      onChange={(e) => set(it.productId, { sub: e.target.value })}
                      className="h-9 max-w-56 rounded-lg bg-white px-2 ring-1 ring-stone-300 disabled:bg-stone-100"
                      aria-label={`Zamiennik: ${p.name}`}
                    >
                      <option value="">— bez zamiennika —</option>
                      {products
                        .filter((x) => x.id !== p.id && x.available && x.category === p.category)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({formatPLN(getClientPrice(client, x))}/{formatUnit(x.unit)})
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3">
        <p className="text-sm text-stone-600">
          {changes ? (
            <span className="font-semibold text-amber-800">Zmiany: {changes}</span>
          ) : (
            "Bez zmian względem zamówienia"
          )}{" "}
          · wartość netto po kompletacji: <strong className="text-stone-900 tabular-nums">{formatPLN(round2(total))}</strong>
        </p>
        <Button size="lg" onClick={onConfirm} disabled={invalid}>
          ✓ Zatwierdź kompletację
        </Button>
      </div>
    </Card>
  );
}

function DoneCard({ order }: { order: Order }) {
  const { products, clients, invoices } = useAppState();
  const client = clients.find((c) => c.id === order.clientId);
  const invoice = invoices.find((i) => i.orderId === order.id);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p>
          <span className="font-bold">Nr {order.id}</span> · {client?.name}
        </p>
        <OrderStatusBadge status={order.status} />
      </div>
      <OrderLines order={order} products={products} />
      {invoice && (
        <Link to={`/hurtownia/faktury/${invoice.id}`} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
          Zobacz fakturę →
        </Link>
      )}
    </Card>
  );
}
