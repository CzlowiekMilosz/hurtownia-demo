import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { Button, EmptyState, QtyStepper } from "../../components/ui";
import { brand } from "../../config/brand";
import { formatPLN, formatQty, formatUnit, plural, qtyStep } from "../../lib/format";
import { getClientPrice, round2 } from "../../lib/pricing";
import { useAppState, useCurrentClient } from "../../lib/StoreContext";
import { getLastOrder, repeatLastOrder, setCartQty, toggleFavorite } from "../../lib/store";
import { CATEGORIES, type Category, type Client, type Product } from "../../types";

type Filter = "Wszystkie" | Category;

export default function Catalog() {
  const { products, carts } = useAppState();
  const client = useCurrentClient();
  const navigate = useNavigate();
  const toast = useToast();
  const cart = carts[client.id] ?? {};
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Wszystkie");
  const lastOrder = getLastOrder(client.id);

  const q = query.trim().toLocaleLowerCase("pl");
  const visible = useMemo(
    () =>
      products
        .filter((p) => filter === "Wszystkie" || p.category === filter)
        .filter((p) => !q || p.name.toLocaleLowerCase("pl").includes(q))
        // dostępne najpierw, potem alfabetycznie
        .sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name, "pl")),
    [products, filter, q],
  );
  const favorites = visible.filter((p) => client.favorites.includes(p.id));
  const showFavoritesSection = !q && filter === "Wszystkie" && favorites.length > 0;

  const cartEntries = Object.entries(cart).filter(([id, qty]) => qty > 0 && products.some((p) => p.id === id));
  const cartNet = round2(
    cartEntries.reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === id)!;
      return sum + qty * getClientPrice(client, p);
    }, 0),
  );

  const onRepeat = () => {
    const r = repeatLastOrder(client.id);
    if (r.skipped.length) toast(`Dodano ${r.added} poz. Niedostępne: ${r.skipped.join(", ")}.`, "info");
    else toast(`Koszyk wypełniony pozycjami z zamówienia nr ${lastOrder?.id}.`);
  };

  return (
    <>
      {lastOrder && (
        <Button variant="accent" size="lg" className="mb-4 w-full" onClick={onRepeat}>
          <span aria-hidden>↻</span> Powtórz ostatnie zamówienie
        </Button>
      )}

      <div className="sticky top-[112px] z-20 -mx-4 bg-[#f6f7f4]/95 px-4 pt-1 pb-3 backdrop-blur">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj produktu, np. pomidor"
            className="h-12 w-full rounded-xl bg-white pr-4 pl-10 text-base ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="mt-2.5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {(["Wszystkie", ...CATEGORIES] as Filter[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === c ? "bg-brand text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {showFavoritesSection && (
        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold tracking-wide text-stone-500 uppercase">
            <span className="text-accent">★</span> Ulubione
          </h2>
          <ProductList products={favorites} client={client} cart={cart} />
        </section>
      )}

      <section>
        {showFavoritesSection && (
          <h2 className="mb-2 text-sm font-bold tracking-wide text-stone-500 uppercase">Wszystkie produkty</h2>
        )}
        {visible.length ? (
          <ProductList products={visible} client={client} cart={cart} />
        ) : (
          <EmptyState title="Nie znaleziono produktów" icon="🔍">
            Spróbuj innej nazwy albo wybierz „Wszystkie”. Brakuje czegoś? Zadzwoń: {brand.phone}
          </EmptyState>
        )}
      </section>

      {/* Pasek koszyka */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs text-stone-500">
              {cartEntries.length} {plural(cartEntries.length, "pozycja", "pozycje", "pozycji")} · netto
            </p>
            <p className="text-lg font-bold tabular-nums">{formatPLN(cartNet)}</p>
          </div>
          <Button size="lg" disabled={!cartEntries.length} onClick={() => navigate("/klient/podsumowanie")}>
            Przejdź do podsumowania
          </Button>
        </div>
      </div>
    </>
  );
}

function ProductList({ products, client, cart }: { products: Product[]; client: Client; cart: Record<string, number> }) {
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      {products.map((p) => (
        <ProductRow key={p.id} product={p} client={client} qty={cart[p.id] ?? 0} />
      ))}
    </ul>
  );
}

function ProductRow({ product: p, client, qty }: { product: Product; client: Client; qty: number }) {
  const price = getClientPrice(client, p);
  const isFav = client.favorites.includes(p.id);
  const hasDeal = price < p.basePrice;
  return (
    <li className={`flex items-center gap-2 px-3 py-3 ${p.available ? "" : "bg-stone-50"} ${qty > 0 ? "bg-brand-50" : ""}`}>
      <button
        type="button"
        onClick={() => toggleFavorite(client.id, p.id)}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${isFav ? "text-accent" : "text-stone-300 hover:text-stone-400"}`}
        aria-label={isFav ? `Usuń z ulubionych: ${p.name}` : `Dodaj do ulubionych: ${p.name}`}
        aria-pressed={isFav}
      >
        ★
      </button>
      <div className={`min-w-0 flex-1 ${p.available ? "" : "opacity-50"}`}>
        <p className="font-semibold leading-snug text-stone-900">{p.name}</p>
        {p.available ? (
          <p className="text-sm text-stone-600 tabular-nums">
            <span className="font-semibold text-stone-900">{formatPLN(price)}</span> / {formatUnit(p.unit)}
            {hasDeal && <span className="ml-1.5 text-xs text-stone-400 line-through">{formatPLN(p.basePrice)}</span>}
          </p>
        ) : (
          <p className="text-sm text-stone-500">Chwilowo niedostępny</p>
        )}
        {qty > 0 && p.available && (
          <p className="text-xs font-medium text-brand-dark tabular-nums">
            {formatQty(qty)} {formatUnit(p.unit)} = {formatPLN(round2(qty * price))}
          </p>
        )}
      </div>
      <QtyStepper
        value={qty}
        step={qtyStep(p.unit)}
        disabled={!p.available}
        label={p.name}
        onChange={(v) => setCartQty(client.id, p.id, v)}
      />
    </li>
  );
}
