import { useState } from "react";
import { useToast } from "../../components/Toast";
import { Card, PageHeader } from "../../components/ui";
import { formatPLN, formatUnit } from "../../lib/format";
import { round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { updateProduct } from "../../lib/store";
import { CATEGORIES, type Category, type Product } from "../../types";

export default function Products() {
  const { products } = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const q = query.trim().toLocaleLowerCase("pl");
  const rows = products
    .filter((p) => !category || p.category === category)
    .filter((p) => !q || p.name.toLocaleLowerCase("pl").includes(q))
    .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, "pl"));
  const unavailable = products.filter((p) => !p.available).length;

  return (
    <>
      <PageHeader
        title="Produkty"
        subtitle={`Szybka edycja ceny bazowej dnia i dostępności. Niedostępne: ${unavailable}. Zmiany dotyczą nowych zamówień.`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj produktu"
          className="h-10 w-56 rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none"
        />
        {(["", ...CATEGORIES] as const).map((c) => (
          <button
            key={c || "all"}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === c ? "bg-stone-800 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50"}`}
          >
            {c || "Wszystkie"}
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-stone-100 text-left text-xs text-stone-500 uppercase">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Produkt</th>
              <th className="px-2 py-2.5 font-semibold">Kategoria</th>
              <th className="px-2 py-2.5 font-semibold">Cena bazowa netto</th>
              <th className="px-2 py-2.5 font-semibold">VAT</th>
              <th className="px-4 py-2.5 font-semibold">Dostępny</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-stone-500">Stawki VAT – do potwierdzenia z księgową.</p>
    </>
  );
}

function ProductRow({ product: p }: { product: Product }) {
  const toast = useToast();
  const initial = p.basePrice.toFixed(2).replace(".", ",");
  const [price, setPrice] = useState(initial);
  const commit = () => {
    if (price === initial) return;
    const n = Number(price.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      toast("Cena musi być liczbą większą od zera.", "error");
      setPrice(initial);
      return;
    }
    updateProduct(p.id, { basePrice: round2(n) });
    setPrice(round2(n).toFixed(2).replace(".", ","));
    toast(`${p.name}: nowa cena bazowa ${formatPLN(round2(n))}`);
  };
  return (
    <tr className={p.available ? "" : "bg-stone-50 text-stone-400"}>
      <td className="px-4 py-2 font-medium">{p.name}</td>
      <td className="px-2 py-2 text-stone-500">{p.category}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1.5">
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-9 w-24 rounded-lg bg-white px-2 text-right font-semibold text-stone-900 tabular-nums ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none"
            aria-label={`Cena bazowa: ${p.name}`}
          />
          <span className="text-stone-500">zł/{formatUnit(p.unit)}</span>
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          value={p.vatRate}
          onChange={(e) => updateProduct(p.id, { vatRate: Number(e.target.value) })}
          className="h-9 rounded-lg bg-white px-2 text-stone-900 ring-1 ring-stone-300"
          aria-label={`Stawka VAT: ${p.name}`}
        >
          {[0, 5, 8, 23].map((r) => (
            <option key={r} value={r}>
              {r}%
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          role="switch"
          aria-checked={p.available}
          aria-label={`Dostępność: ${p.name}`}
          onClick={() => {
            updateProduct(p.id, { available: !p.available });
            toast(`${p.name}: ${p.available ? "niedostępny" : "dostępny"}`, "info");
          }}
          className={`relative h-7 w-12 rounded-full transition-colors ${p.available ? "bg-brand" : "bg-stone-300"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${p.available ? "left-6" : "left-1"}`} />
        </button>
      </td>
    </tr>
  );
}
