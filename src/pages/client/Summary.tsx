import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { Button, Card, QtyStepper } from "../../components/ui";
import { brand } from "../../config/brand";
import { earliestDeliveryDate, formatDeliveryDate } from "../../lib/dates";
import { formatPLN, formatUnit, qtyStep } from "../../lib/format";
import { computeTotals, getClientPrice, round2 } from "../../lib/pricing";
import { useAppState, useCurrentClient } from "../../lib/StoreContext";
import { placeOrder, setCartQty } from "../../lib/store";

export default function Summary() {
  const { products, carts } = useAppState();
  const client = useCurrentClient();
  const navigate = useNavigate();
  const toast = useToast();
  const minDate = earliestDeliveryDate(brand.orderCutoff);
  const [deliveryDate, setDeliveryDate] = useState(minDate);
  const [notes, setNotes] = useState("");
  const submitted = useRef(false); // po złożeniu koszyk jest pusty – nie przekierowuj do katalogu

  const lines = Object.entries(carts[client.id] ?? {})
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      return product && qty > 0 ? { product, qty, price: getClientPrice(client, product) } : null;
    })
    .filter((l) => l !== null)
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "pl"));

  if (!lines.length) return submitted.current ? null : <Navigate to="/klient" replace />;

  const unavailable = lines.filter((l) => !l.product.available);
  const totals = computeTotals(
    lines.filter((l) => l.product.available).map((l) => ({ qty: l.qty, netPrice: l.price, vatRate: l.product.vatRate })),
  );

  const onSubmit = () => {
    try {
      submitted.current = true;
      const order = placeOrder(client.id, { deliveryDate, notes });
      navigate(`/klient/potwierdzenie/${order.id}`, { replace: true });
    } catch (e) {
      submitted.current = false;
      toast(e instanceof Error ? e.message : "Nie udało się złożyć zamówienia.", "error");
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link to="/klient" className="rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100">
          ← Katalog
        </Link>
        <h1 className="text-xl font-bold">Podsumowanie zamówienia</h1>
      </div>

      <Card className="mb-4">
        <ul className="divide-y divide-stone-100">
          {lines.map(({ product: p, qty, price }) => (
            <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${p.available ? "" : "bg-red-50"}`}>
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-stone-500 tabular-nums">
                  {formatPLN(price)} / {formatUnit(p.unit)}
                  {p.available ? (
                    <span className="ml-2 font-semibold text-stone-900">= {formatPLN(round2(qty * price))}</span>
                  ) : (
                    <span className="ml-2 font-semibold text-red-700">niedostępny – nie zostanie zamówiony</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <QtyStepper value={qty} step={qtyStep(p.unit)} label={p.name} onChange={(v) => setCartQty(client.id, p.id, v)} />
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setCartQty(client.id, p.id, 0)}
                  aria-label={`Usuń: ${p.name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-4 space-y-4 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Data dostawy</span>
          <input
            type="date"
            value={deliveryDate}
            min={minDate}
            onChange={(e) => setDeliveryDate(e.target.value && e.target.value >= minDate ? e.target.value : minDate)}
            className="h-12 w-full rounded-xl bg-white px-3 text-base ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="mt-1 block text-xs text-stone-500">{formatDeliveryDate(deliveryDate)}</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Uwagi (opcjonalnie)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="np. dostawa przed 7:00, pomidory bardziej dojrzałe"
            className="w-full rounded-xl bg-white px-3 py-2.5 text-base ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <p className="rounded-xl bg-accent-50 px-3 py-2.5 text-sm text-stone-700">
          🕗 Zamówienia złożone do godz. <strong>{brand.orderCutoff}</strong> realizujemy następnego dnia.
        </p>
      </Card>

      <Card className="mb-4 p-4">
        <dl className="space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-stone-600">Wartość netto</dt>
            <dd>{formatPLN(totals.net)}</dd>
          </div>
          {totals.byRate.map((r) => (
            <div key={r.rate} className="flex justify-between">
              <dt className="text-stone-600">VAT {r.rate}%</dt>
              <dd>{formatPLN(r.vat)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-bold">
            <dt>Do zapłaty brutto</dt>
            <dd>{formatPLN(totals.gross)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-stone-500">
          Kwota orientacyjna – ostateczna wartość według faktycznie wydanych ilości (towar ważony).
        </p>
      </Card>

      {unavailable.length > 0 && (
        <p className="mb-3 text-sm text-red-700">
          Niedostępne pozycje ({unavailable.map((l) => l.product.name).join(", ")}) zostaną pominięte.
        </p>
      )}
      <Button size="lg" className="w-full" onClick={onSubmit} disabled={unavailable.length === lines.length}>
        Złóż zamówienie
      </Button>
    </>
  );
}
