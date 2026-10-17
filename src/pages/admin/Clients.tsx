import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { formatPLN, formatUnit } from "../../lib/format";
import { getClientPrice, round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { setClientPriceOverride, updateClient } from "../../lib/store";
import type { Client, ClientType } from "../../types";

const TYPES: { value: ClientType; label: string }[] = [
  { value: "restauracja", label: "Restauracja" },
  { value: "sklep", label: "Sklep" },
  { value: "catering", label: "Catering" },
  { value: "inne", label: "Inne" },
];

export default function Clients() {
  const { clientId } = useParams();
  const { clients, orders } = useAppState();
  const selected = clients.find((c) => c.id === clientId);

  return (
    <>
      <PageHeader title="Klienci i cenniki" subtitle="Rabat od ceny bazowej i ceny indywidualne dla każdego klienta." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
        <div className={selected ? "hidden xl:block" : ""}>
          <Card>
            <ul className="divide-y divide-stone-100">
              {clients.map((c) => {
                const overrides = Object.keys(c.pricing.overrides ?? {}).length;
                return (
                  <li key={c.id}>
                    <Link to={`/hurtownia/klienci/${c.id}`} className={`block px-4 py-3 hover:bg-stone-50 ${c.id === clientId ? "bg-brand-50" : ""}`}>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-stone-500">
                        {TYPES.find((t) => t.value === c.type)?.label} · rabat {c.pricing.discountPercent ?? 0}%
                        {overrides > 0 && ` · ${overrides} cen indyw.`} · {orders.filter((o) => o.clientId === c.id).length} zam.
                      </p>
                      {!c.nip && <p className="text-xs font-semibold text-red-700">⚠ brak NIP</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
        <div>
          {selected ? (
            <ClientDetail key={selected.id} client={selected} />
          ) : (
            <div className="hidden xl:block">
              <EmptyState title="Wybierz klienta z listy" icon="👈" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const input = "h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none";

function ClientDetail({ client }: { client: Client }) {
  const { products } = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: client.name,
    nip: client.nip,
    address: client.address,
    type: client.type,
    discount: String(client.pricing.discountPercent ?? 0),
  });
  const [query, setQuery] = useState("");
  const [onlyOverrides, setOnlyOverrides] = useState(false);

  const save = () => {
    const discount = Number(form.discount.replace(",", "."));
    if (!form.name.trim()) return toast("Podaj nazwę klienta.", "error");
    if (!Number.isFinite(discount) || discount < 0 || discount > 90) return toast("Rabat musi być liczbą od 0 do 90%.", "error");
    if (form.nip.trim() && form.nip.replace(/\D/g, "").length !== 10) return toast("NIP powinien mieć 10 cyfr.", "error");
    updateClient(client.id, {
      name: form.name.trim(),
      nip: form.nip.trim(),
      address: form.address.trim(),
      type: form.type,
      pricing: { ...client.pricing, discountPercent: round2(discount) },
    });
    toast("Zapisano dane klienta.");
  };

  const q = query.trim().toLocaleLowerCase("pl");
  const rows = products
    .filter((p) => !q || p.name.toLocaleLowerCase("pl").includes(q))
    .filter((p) => !onlyOverrides || client.pricing.overrides?.[p.id] !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <button type="button" className="mb-2 text-sm text-stone-500 hover:text-stone-800 xl:hidden" onClick={() => navigate("/hurtownia/klienci")}>
          ← Lista klientów
        </button>
        <h2 className="mb-4 text-lg font-bold">Dane klienta</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nazwa</span>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Typ</span>
            <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              NIP <span className="font-normal text-stone-500">(przykładowy)</span>
            </span>
            <input className={`${input} ${form.nip ? "" : "ring-red-300"}`} value={form.nip} placeholder="np. 000-000-00-00" onChange={(e) => setForm({ ...form, nip: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Rabat od ceny bazowej (%)</span>
            <input className={input} inputMode="decimal" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Adres</span>
            <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save}>Zapisz dane</Button>
          <span className="text-xs text-stone-500">Login demo: {client.login}</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Cennik klienta</h2>
            <p className="text-xs text-stone-500">Puste pole = cena bazowa minus rabat. Wpisz kwotę, aby ustawić cenę indywidualną.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyOverrides} onChange={(e) => setOnlyOverrides(e.target.checked)} className="h-4 w-4 accent-[var(--brand-primary)]" />
              Tylko ceny indywidualne
            </label>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj produktu" className="h-10 w-48 rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-stone-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-semibold">Produkt</th>
                <th className="px-2 py-2 text-right font-semibold">Cena bazowa</th>
                <th className="px-2 py-2 font-semibold">Cena indywidualna</th>
                <th className="px-5 py-2 text-right font-semibold">Cena klienta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {rows.map((p) => {
                const override = client.pricing.overrides?.[p.id];
                return (
                  <tr key={p.id} className={override !== undefined ? "bg-accent-50" : ""}>
                    <td className="px-5 py-2 font-medium">
                      {p.name}
                      {!p.available && <span className="ml-2 text-xs font-normal text-stone-400">(niedostępny)</span>}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-600">
                      {formatPLN(p.basePrice)}/{formatUnit(p.unit)}
                    </td>
                    <td className="px-2 py-2">
                      <OverrideInput
                        value={override}
                        label={p.name}
                        onCommit={(v) => {
                          setClientPriceOverride(client.id, p.id, v);
                          toast(v ? `Cena indywidualna: ${p.name} – ${formatPLN(v)}` : `Usunięto cenę indywidualną: ${p.name}`, "info");
                        }}
                      />
                    </td>
                    <td className="px-5 py-2 text-right font-semibold">{formatPLN(getClientPrice(client, p))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-500">Brak produktów dla wybranych filtrów.</p>}
        </div>
      </Card>
    </div>
  );
}

function OverrideInput({ value, label, onCommit }: { value?: number; label: string; onCommit: (v: number | null) => void }) {
  const initial = value !== undefined ? value.toFixed(2).replace(".", ",") : "";
  const [text, setText] = useState(initial);
  const commit = () => {
    const t = text.trim();
    if (t === initial) return;
    if (!t) return onCommit(null);
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setText(initial);
      return;
    }
    setText(round2(n).toFixed(2).replace(".", ","));
    onCommit(round2(n));
  };
  return (
    <div className="flex items-center gap-1">
      <input
        inputMode="decimal"
        value={text}
        placeholder="—"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-9 w-24 rounded-lg bg-white px-2 text-right ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none"
        aria-label={`Cena indywidualna: ${label}`}
      />
      {value !== undefined && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onCommit(null);
          }}
          className="rounded-lg px-1.5 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Usuń cenę indywidualną: ${label}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
