import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OrderLines } from "../../components/OrderLines";
import { useToast } from "../../components/Toast";
import { Button, Card, EmptyState, InvoiceStatusBadge, OrderStatusBadge, PageHeader } from "../../components/ui";
import { formatDateTime, formatDeliveryDate } from "../../lib/dates";
import { formatPLN, formatUnit, plural } from "../../lib/format";
import { orderTotals } from "../../lib/invoices";
import { round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { acceptOrder, rejectOrder, updateOrderQuantities } from "../../lib/store";
import type { Order, OrderStatus } from "../../types";

const STATUSES: OrderStatus[] = ["nowe", "zaakceptowane", "skompletowane", "odrzucone"];
const statusOrder: Record<OrderStatus, number> = { nowe: 0, zaakceptowane: 1, skompletowane: 2, odrzucone: 3 };

export default function Orders() {
  const { orders, clients, products } = useAppState();
  const { orderId } = useParams();
  const [date, setDate] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus | "">("");

  const dates = [...new Set(orders.map((o) => o.deliveryDate))].sort().reverse();
  const byDate = orders.filter((o) => !date || o.deliveryDate === date);
  const filtered = byDate
    .filter((o) => !status || o.status === status)
    .sort(
      (a, b) =>
        statusOrder[a.status] - statusOrder[b.status] ||
        b.deliveryDate.localeCompare(a.deliveryDate) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const newCount = orders.filter((o) => o.status === "nowe").length;
  const selected = orders.find((o) => o.id === orderId);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Zamówienia"
        subtitle={
          newCount ? (
            <span>
              <strong className="text-stone-900">{newCount}</strong> {plural(newCount, "nowe zamówienie czeka", "nowe zamówienia czekają", "nowych zamówień czeka")} na decyzję
            </span>
          ) : (
            "Wszystkie zamówienia obsłużone 👍"
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className={selected ? "hidden xl:block" : ""}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300"
              aria-label="Data dostawy"
            >
              <option value="">Wszystkie daty dostawy</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {formatDeliveryDate(d)}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              <FilterChip active={!status} onClick={() => setStatus("")}>
                Wszystkie ({byDate.length})
              </FilterChip>
              {STATUSES.map((s) => (
                <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                  {s[0].toUpperCase() + s.slice(1)} ({byDate.filter((o) => o.status === s).length})
                </FilterChip>
              ))}
            </div>
          </div>

          {filtered.length ? (
            <Card>
              <ul className="divide-y divide-stone-100">
                {filtered.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/hurtownia/zamowienia/${o.id}`}
                      className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 ${o.id === orderId ? "bg-brand-50" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Nr {o.id}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <p className="truncate text-sm text-stone-700">{clientName(o.clientId)}</p>
                        <p className="text-xs text-stone-500">
                          Dostawa: {formatDeliveryDate(o.deliveryDate)} · {o.items.length} poz.
                          {o.notes && " · 💬 uwagi"}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                        {o.status === "odrzucone" ? "—" : formatPLN(orderTotals(o, products).net)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState title="Brak zamówień dla wybranych filtrów" icon="📭" />
          )}
        </div>

        <div>
          {selected ? (
            <OrderDetail key={selected.id} order={selected} />
          ) : (
            <div className="hidden xl:block">
              <EmptyState title="Wybierz zamówienie z listy" icon="👈">
                Tutaj zobaczysz szczegóły, zaakceptujesz lub odrzucisz zamówienie i poprawisz ilości.
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-stone-800 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50"}`}
    >
      {children}
    </button>
  );
}

const QUICK_REASONS = ["Brak towaru na giełdzie", "Zamówienie po godzinie granicznej", "Zaległe płatności – prosimy o kontakt"];

function OrderDetail({ order }: { order: Order }) {
  const { clients, products, invoices } = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const client = clients.find((c) => c.id === order.clientId);
  const invoice = invoices.find((i) => i.orderId === order.id);
  const editable = order.status === "nowe" || order.status === "zaakceptowane";
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const totals = orderTotals(order, products);

  const startEdit = () => {
    setQty(Object.fromEntries(order.items.map((i) => [i.productId, String(i.orderedQty).replace(".", ",")])));
    setEditing(true);
  };

  const saveEdit = () => {
    const parsed: Record<string, number> = {};
    for (const [id, v] of Object.entries(qty)) {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        toast("Nieprawidłowa ilość – wpisz liczbę (0 usuwa pozycję).", "error");
        return;
      }
      parsed[id] = round2(n);
    }
    if (Object.values(parsed).every((n) => n === 0)) {
      toast("Zamówienie musi mieć co najmniej jedną pozycję. Aby je anulować, użyj „Odrzuć”.", "error");
      return;
    }
    updateOrderQuantities(order.id, parsed);
    setEditing(false);
    toast(invoice ? "Zapisano zmiany – szkic faktury zaktualizowany." : "Zapisano zmiany ilości.");
  };

  const onAccept = () => {
    acceptOrder(order.id);
    toast(`Zamówienie nr ${order.id} zaakceptowane – utworzono szkic faktury.`);
  };

  const onReject = () => {
    if (!reason.trim()) {
      toast("Podaj powód odrzucenia – klient go zobaczy.", "error");
      return;
    }
    rejectOrder(order.id, reason);
    setRejecting(false);
    toast(`Zamówienie nr ${order.id} odrzucone.`, "info");
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" className="mb-2 text-sm text-stone-500 hover:text-stone-800 xl:hidden" onClick={() => navigate("/hurtownia/zamowienia")}>
            ← Lista zamówień
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Zamówienie nr {order.id}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 font-medium">{client?.name}</p>
          <p className="text-sm text-stone-500">
            {client?.address} · NIP: {client?.nip || <span className="font-semibold text-red-700">brak</span>}
          </p>
        </div>
        <dl className="text-right text-sm">
          <dt className="text-stone-500">Dostawa</dt>
          <dd className="font-semibold">{formatDeliveryDate(order.deliveryDate)}</dd>
          <dt className="mt-1 text-stone-500">Złożone</dt>
          <dd>{formatDateTime(order.createdAt)}</dd>
        </dl>
      </div>

      {order.notes && <p className="mb-4 rounded-xl bg-accent-50 px-3 py-2 text-sm">💬 {order.notes}</p>}
      {order.status === "odrzucone" && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">Powód odrzucenia: {order.rejectionReason}</p>
      )}

      {editing ? (
        <div className="mb-4">
          <p className="mb-2 text-sm text-stone-500">Zmień ilości (0 usuwa pozycję):</p>
          <ul className="divide-y divide-stone-100">
            {order.items.map((it) => {
              const p = products.find((x) => x.id === it.productId);
              return (
                <li key={it.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{p?.name}</span>
                  <label className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={qty[it.productId] ?? ""}
                      onChange={(e) => setQty({ ...qty, [it.productId]: e.target.value })}
                      className="h-9 w-20 rounded-lg px-2 text-right tabular-nums ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none"
                      aria-label={`Ilość: ${p?.name}`}
                    />
                    <span className="w-10 text-stone-500">{p && formatUnit(p.unit)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveEdit}>Zapisz zmiany</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <OrderLines order={order} products={products} />
        </div>
      )}

      <dl className="mb-5 space-y-1 border-t border-stone-100 pt-3 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt className="text-stone-600">Netto</dt>
          <dd>{formatPLN(totals.net)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-600">VAT</dt>
          <dd>{formatPLN(totals.vat)}</dd>
        </div>
        <div className="flex justify-between font-bold">
          <dt>Brutto</dt>
          <dd>{formatPLN(totals.gross)}</dd>
        </div>
      </dl>

      {invoice && (
        <Link
          to={`/hurtownia/faktury/${invoice.id}`}
          className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm ring-1 ring-stone-200 hover:bg-stone-100"
        >
          <span>🧾 Faktura {invoice.number ?? "(szkic)"}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </Link>
      )}

      {rejecting ? (
        <div className="rounded-xl bg-red-50 p-3">
          <label className="block text-sm font-semibold text-red-900" htmlFor="reason">
            Powód odrzucenia (zobaczy go klient)
          </label>
          <div className="my-2 flex flex-wrap gap-1">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-red-200 hover:bg-red-100">
                {r}
              </button>
            ))}
          </div>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-red-200 focus:ring-2 focus:ring-red-400 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button variant="danger" onClick={onReject}>
              Odrzuć zamówienie
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        !editing && (
          <div className="flex flex-wrap gap-2">
            {order.status === "nowe" && (
              <Button size="lg" onClick={onAccept}>
                ✓ Akceptuj
              </Button>
            )}
            {order.status === "zaakceptowane" && (
              <Link to="/hurtownia/kompletacja" className="inline-flex items-center rounded-xl bg-brand px-5 py-3.5 font-semibold text-white hover:bg-brand-dark">
                Przejdź do kompletacji →
              </Link>
            )}
            {editable && (
              <Button size="lg" variant="secondary" onClick={startEdit}>
                ✎ Edytuj ilości
              </Button>
            )}
            {editable && (
              <Button size="lg" variant="danger" onClick={() => setRejecting(true)}>
                ✕ Odrzuć
              </Button>
            )}
          </div>
        )
      )}
    </Card>
  );
}
