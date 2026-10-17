import { useState } from "react";
import { useToast } from "../../components/Toast";
import { Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { brand } from "../../config/brand";
import { formatDate, formatDeliveryDate, tomorrow } from "../../lib/dates";
import { formatQtyUnit } from "../../lib/format";
import { round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { CATEGORIES, type Category, type Order, type Product } from "../../types";

interface Row {
  product: Product;
  total: number;
  perClient: { clientId: string; orderId: string; qty: number }[];
}

/** Sumuje pozycje zamówień per produkt, pogrupowane po kategoriach. */
function aggregate(orders: Order[], products: Product[]): Map<Category, Row[]> {
  const rows = new Map<string, Row>();
  for (const o of orders) {
    for (const it of o.items) {
      const product = products.find((p) => p.id === it.productId);
      if (!product || it.orderedQty <= 0) continue;
      const row = rows.get(product.id) ?? { product, total: 0, perClient: [] };
      row.total = round2(row.total + it.orderedQty);
      row.perClient.push({ clientId: o.clientId, orderId: o.id, qty: it.orderedQty });
      rows.set(product.id, row);
    }
  }
  const grouped = new Map<Category, Row[]>();
  for (const cat of CATEGORIES) {
    const list = [...rows.values()]
      .filter((r) => r.product.category === cat)
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "pl"));
    if (list.length) grouped.set(cat, list);
  }
  return grouped;
}

export default function MarketList() {
  const { orders, products, clients } = useAppState();
  const toast = useToast();
  const dates = [...new Set(orders.filter((o) => o.status !== "odrzucone").map((o) => o.deliveryDate))].sort();
  const [date, setDate] = useState(() => (dates.includes(tomorrow()) ? tomorrow() : (dates.at(-1) ?? tomorrow())));
  const [includeNew, setIncludeNew] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const counted = orders.filter(
    (o) =>
      o.deliveryDate === date &&
      (o.status === "zaakceptowane" || o.status === "skompletowane" || (includeNew && o.status === "nowe")),
  );
  const pendingNew = orders.filter((o) => o.deliveryDate === date && o.status === "nowe").length;
  const grouped = aggregate(counted, products);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const asText = () => {
    const lines = [`Lista na giełdę – dostawa ${formatDate(date)}`, `${brand.companyName}`, ""];
    for (const [cat, rows] of grouped) {
      lines.push(cat.toUpperCase());
      for (const r of rows) lines.push(`- ${r.product.name}: ${formatQtyUnit(r.total, r.product.unit)}`);
      lines.push("");
    }
    lines.push(`Zamówień: ${counted.length}`);
    return lines.join("\n");
  };

  const onCopy = async () => {
    const text = asText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Skopiowano listę – możesz wkleić ją do SMS-a.");
    } catch {
      // np. brak uprawnień do schowka – awaryjnie zaznaczenie tekstu w oknie
      window.prompt("Skopiuj listę (Ctrl+C):", text);
    }
  };

  return (
    <>
      <PageHeader
        title="Lista na giełdę"
        subtitle="Suma zaakceptowanych zamówień na wybrany dzień dostawy – co kupić na giełdzie."
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" onClick={() => window.print()} disabled={!grouped.size}>
              🖨 Drukuj
            </Button>
            <Button onClick={onCopy} disabled={!grouped.size}>
              📋 Kopiuj jako tekst
            </Button>
          </div>
        }
      />

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <select value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300" aria-label="Dzień dostawy">
          {!dates.includes(date) && <option value={date}>{formatDeliveryDate(date)}</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDeliveryDate(d)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeNew} onChange={(e) => setIncludeNew(e.target.checked)} className="h-4 w-4 accent-[var(--brand-primary)]" />
          Uwzględnij nowe (jeszcze niezaakceptowane)
        </label>
        <span className="text-sm text-stone-500">Zamówień w zestawieniu: {counted.length}</span>
      </div>

      {pendingNew > 0 && !includeNew && (
        <p className="no-print mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          ℹ️ {pendingNew} {pendingNew === 1 ? "zamówienie czeka" : "zamówienia czekają"} na akceptację i nie są jeszcze wliczone.
        </p>
      )}

      <h2 className="mb-3 hidden text-lg font-bold print:block">
        Lista na giełdę – dostawa {formatDate(date)} · {brand.companyName}
      </h2>

      {grouped.size === 0 ? (
        <EmptyState title="Brak zaakceptowanych zamówień na ten dzień" icon="🛒">
          Zaakceptuj zamówienia w zakładce „Zamówienia” – tutaj pojawi się suma do kupienia.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 print:block">
          {[...grouped].map(([cat, rows]) => (
            <Card key={cat} className="overflow-hidden print:mb-4 print:shadow-none">
              <h3 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-bold tracking-wide text-stone-600 uppercase">
                {cat} <span className="font-normal normal-case">({rows.length})</span>
              </h3>
              <ul className="divide-y divide-stone-100">
                {rows.map((r) => {
                  const isOpen = open.has(r.product.id);
                  return (
                    <li key={r.product.id}>
                      <button
                        type="button"
                        onClick={() => toggle(r.product.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-stone-50"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium">
                          <span className={`no-print mr-1.5 inline-block text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                          {r.product.name}
                        </span>
                        <span className="text-lg font-bold tabular-nums">{formatQtyUnit(r.total, r.product.unit)}</span>
                      </button>
                      {isOpen && (
                        <ul className="bg-stone-50 px-4 pt-1 pb-2.5 pl-9 text-sm">
                          {r.perClient.map((pc) => (
                            <li key={pc.orderId} className="flex justify-between py-0.5 text-stone-600">
                              <span>
                                {clientName(pc.clientId)} <span className="text-stone-400">· nr {pc.orderId}</span>
                              </span>
                              <span className="tabular-nums">{formatQtyUnit(pc.qty, r.product.unit)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
