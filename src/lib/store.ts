/**
 * Warstwa danych aplikacji. Ekrany korzystają WYŁĄCZNIE z funkcji z tego pliku,
 * więc później można podmienić localStorage na prawdziwy backend (np. Supabase)
 * bez przepisywania widoków.
 */
import { createSeedState, STATE_VERSION } from "../data/seed";
import type {
  AppState,
  Client,
  InvoiceDraft,
  InvoiceLine,
  Order,
  OrderItem,
  Product,
  Session,
} from "../types";
import { buildInvoiceLines, makeInvoiceNumber, makeKsefDemoId, validateInvoice } from "./invoices";
import { getClientPrice, round2 } from "./pricing";

const STORAGE_KEY = "hurtownia-demo-state";
// Sesja trzymana osobno, per karta przeglądarki – można mieć klienta w jednej karcie, a hurtownię w drugiej.
const SESSION_KEY = "hurtownia-demo-session";

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

// ───────────────────────── stan + trwałość ─────────────────────────

/** Rozsądne limity – chronią przed literówkami typu 99999 kg. */
export const MAX_QTY = 9999;
export const MAX_PRICE = 99999;
const clampQty = (n: number) => round2(Math.min(MAX_QTY, Math.max(0, Number.isFinite(n) ? n : 0)));

/** Podstawowe sprawdzenie kształtu danych z localStorage (mogły zostać ręcznie zmienione lub uszkodzone). */
function isValidState(x: unknown): x is AppState {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<AppState>;
  return (
    s.version === STATE_VERSION &&
    Array.isArray(s.products) &&
    Array.isArray(s.clients) &&
    Array.isArray(s.orders) &&
    Array.isArray(s.invoices) &&
    !!s.carts &&
    typeof s.carts === "object" &&
    !!s.counters &&
    typeof s.counters.order === "number" &&
    typeof s.counters.invoice === "number" &&
    s.orders.every((o) => o && typeof o.id === "string" && Array.isArray(o.items)) &&
    s.invoices.every((i) => i && typeof i.id === "string" && Array.isArray(i.lines))
  );
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) return { ...parsed, session: loadSession() };
    }
  } catch {
    // brak dostępu do localStorage lub uszkodzone dane – start od danych przykładowych
  }
  return { ...createSeedState(), session: loadSession() };
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, session: null }));
  } catch {
    // np. tryb prywatny – demo działa dalej, tylko bez zapamiętywania
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  } catch {
    // np. tryb prywatny – demo działa dalej, tylko bez zapamiętywania
  }
}

/** Jedyne miejsce zmiany stanu: kopia → modyfikacja → zapis → powiadomienie. */
function update(mutator: (draft: AppState) => void) {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  persist();
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Przywraca dane startowe (sesja zostaje, żeby nie wylogowywać prezentującego). */
export function resetDemo() {
  const session = state.session;
  update((s) => {
    Object.assign(s, createSeedState(), { session });
  });
}

// Synchronizacja między kartami przeglądarki (np. klient w jednej, hurtownia w drugiej).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load(); // sesja pochodzi z sessionStorage tej karty

    listeners.forEach((l) => l());
  });
}

// ───────────────────────── odczyt ─────────────────────────

export const getProducts = (): Product[] => state.products;
export const getProduct = (id: string) => state.products.find((p) => p.id === id);
export const getClients = (): Client[] => state.clients;
export const getClient = (id: string) => state.clients.find((c) => c.id === id);
export const getOrders = (): Order[] => state.orders;
export const getOrder = (id: string) => state.orders.find((o) => o.id === id);
export const getInvoices = (): InvoiceDraft[] => state.invoices;
export const getInvoiceForOrder = (orderId: string) => state.invoices.find((i) => i.orderId === orderId);
export const getSession = (): Session => state.session;
export const getCart = (clientId: string) => state.carts[clientId] ?? {};

/** Ostatnie (nieodrzucone) zamówienie klienta – do „Powtórz ostatnie zamówienie”. */
export function getLastOrder(clientId: string): Order | undefined {
  return [...state.orders]
    .filter((o) => o.clientId === clientId && o.status !== "odrzucone")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ───────────────────────── sesja (udawane logowanie) ─────────────────────────

export function login(session: Exclude<Session, null>) {
  update((s) => {
    s.session = session;
  });
}

export function logout() {
  update((s) => {
    s.session = null;
  });
}

// ───────────────────────── koszyk klienta ─────────────────────────

export function setCartQty(clientId: string, productId: string, qty: number) {
  update((s) => {
    const cart = (s.carts[clientId] ??= {});
    const q = clampQty(qty);
    if (q > 0) cart[productId] = q;
    else delete cart[productId];
  });
}

export function clearCart(clientId: string) {
  update((s) => {
    s.carts[clientId] = {};
  });
}

/** Wypełnia koszyk pozycjami z ostatniego zamówienia klienta (tylko dostępne produkty). */
export function repeatLastOrder(clientId: string): { added: number; skipped: string[] } {
  const last = getLastOrder(clientId);
  const result = { added: 0, skipped: [] as string[] };
  if (!last) return result;
  update((s) => {
    const cart: Record<string, number> = {};
    for (const item of last.items) {
      const p = s.products.find((x) => x.id === item.productId);
      if (!p) continue;
      if (!p.available) {
        result.skipped.push(p.name);
        continue;
      }
      cart[p.id] = item.orderedQty;
      result.added++;
    }
    s.carts[clientId] = cart;
  });
  return result;
}

export function toggleFavorite(clientId: string, productId: string) {
  update((s) => {
    const c = s.clients.find((x) => x.id === clientId);
    if (!c) return;
    c.favorites = c.favorites.includes(productId)
      ? c.favorites.filter((id) => id !== productId)
      : [...c.favorites, productId];
  });
}

// ───────────────────────── zamówienia ─────────────────────────

export function placeOrder(clientId: string, input: { deliveryDate: string; notes?: string }): Order {
  const client = getClient(clientId);
  if (!client) throw new Error("Nieznany klient");
  const items: OrderItem[] = [];
  for (const [productId, qty] of Object.entries(getCart(clientId))) {
    const product = getProduct(productId);
    if (!product || !product.available || qty <= 0) continue;
    items.push({ productId, orderedQty: qty, unitPrice: getClientPrice(client, product) });
  }
  if (items.length === 0) throw new Error("Koszyk jest pusty");

  const order: Order = {
    id: String(state.counters.order),
    clientId,
    createdAt: new Date().toISOString(),
    deliveryDate: input.deliveryDate,
    notes: input.notes?.trim().slice(0, 500) || undefined,
    status: "nowe",
    items,
  };
  update((s) => {
    s.orders.push(order);
    s.counters.order++;
    s.carts[clientId] = {};
  });
  return order;
}

/** Odświeża pozycje szkicu faktury po zmianie zamówienia (o ile faktura nie została wysłana). */
function syncInvoice(s: AppState, order: Order) {
  const inv = s.invoices.find((i) => i.orderId === order.id);
  if (!inv || inv.status === "wysłana (demo)") return;
  inv.lines = buildInvoiceLines(order, s.products);
  inv.status = "szkic";
}

/** Akceptacja zamówienia – automatycznie tworzy szkic faktury. */
export function acceptOrder(orderId: string) {
  update((s) => {
    const o = s.orders.find((x) => x.id === orderId);
    if (!o || o.status !== "nowe") return;
    o.status = "zaakceptowane";
    o.rejectionReason = undefined;
    if (!s.invoices.some((i) => i.orderId === o.id)) {
      s.invoices.push({
        id: `inv-${o.id}`,
        orderId: o.id,
        clientId: o.clientId,
        status: "szkic",
        lines: buildInvoiceLines(o, s.products),
      });
    }
  });
}

export function rejectOrder(orderId: string, reason: string) {
  update((s) => {
    const o = s.orders.find((x) => x.id === orderId);
    if (!o || o.status === "skompletowane") return;
    o.status = "odrzucone";
    o.rejectionReason = reason.trim() || "Brak podanego powodu.";
    s.invoices = s.invoices.filter((i) => i.orderId !== o.id || i.status === "wysłana (demo)");
  });
}

/** Edycja zamówionych ilości przez hurtownię (0 = usunięcie pozycji). */
export function updateOrderQuantities(orderId: string, quantities: Record<string, number>) {
  update((s) => {
    const o = s.orders.find((x) => x.id === orderId);
    if (!o || o.status === "skompletowane" || o.status === "odrzucone") return;
    o.items = o.items
      .map((it) => ({ ...it, orderedQty: clampQty(quantities[it.productId] ?? it.orderedQty) }))
      .filter((it) => it.orderedQty > 0);
    syncInvoice(s, o);
  });
}

export interface FulfillmentInput {
  productId: string;
  actualQty: number; // 0 = brak towaru
  substituteProductId?: string;
}

/** Zatwierdza kompletację: faktyczne ilości, braki, zamienniki → status „skompletowane”. */
export function completeOrder(orderId: string, lines: FulfillmentInput[]) {
  update((s) => {
    const o = s.orders.find((x) => x.id === orderId);
    if (!o || o.status !== "zaakceptowane") return;
    const client = s.clients.find((c) => c.id === o.clientId)!;
    for (const item of o.items) {
      const f = lines.find((l) => l.productId === item.productId);
      if (!f) continue;
      item.actualQty = clampQty(f.actualQty);
      const sub =
        f.substituteProductId && f.substituteProductId !== item.productId
          ? s.products.find((p) => p.id === f.substituteProductId)
          : undefined;
      item.substituteProductId = sub?.id;
      item.substitutePrice = sub ? getClientPrice(client, sub) : undefined;
    }
    o.status = "skompletowane";
    syncInvoice(s, o);
  });
}

// ───────────────────────── faktury ─────────────────────────

export function updateInvoiceLines(invoiceId: string, lines: InvoiceLine[]) {
  update((s) => {
    const inv = s.invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === "wysłana (demo)") return;
    inv.lines = lines.map((l) => ({
      ...l,
      name: l.name.slice(0, 200),
      qty: clampQty(l.qty),
      netPrice: round2(Math.min(MAX_PRICE, Math.max(0, l.netPrice))),
    }));
    inv.status = "szkic";
  });
}

export function getInvoiceProblems(invoice: InvoiceDraft): string[] {
  return validateInvoice(invoice.lines, getClient(invoice.clientId), getOrder(invoice.orderId));
}

/** Szkic → gotowa (po walidacji). Zwraca listę problemów; pusta = sukces. */
export function markInvoiceReady(invoiceId: string): string[] {
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv) return ["Nie znaleziono faktury."];
  const problems = getInvoiceProblems(inv);
  if (problems.length) return problems;
  update((s) => {
    const x = s.invoices.find((i) => i.id === invoiceId);
    if (x && x.status === "szkic") x.status = "gotowa";
  });
  return [];
}

export interface KsefSendResult {
  invoiceId: string;
  ok: boolean;
  number?: string;
  ksefDemoId?: string;
  problems: string[];
}

/** SYMULACJA wysyłki do KSeF – nadaje numer faktury i fikcyjny identyfikator DEMO-…. */
export function sendInvoicesToKsefDemo(invoiceIds: string[]): KsefSendResult[] {
  const results: KsefSendResult[] = [];
  update((s) => {
    const now = new Date();
    for (const id of invoiceIds) {
      const inv = s.invoices.find((i) => i.id === id);
      if (!inv) {
        results.push({ invoiceId: id, ok: false, problems: ["Nie znaleziono faktury."] });
        continue;
      }
      if (inv.status === "wysłana (demo)") {
        results.push({ invoiceId: id, ok: false, problems: ["Faktura została już wysłana."] });
        continue;
      }
      const client = s.clients.find((c) => c.id === inv.clientId);
      const order = s.orders.find((o) => o.id === inv.orderId);
      const problems = validateInvoice(inv.lines, client, order);
      if (problems.length) {
        results.push({ invoiceId: id, ok: false, problems });
        continue;
      }
      inv.number = makeInvoiceNumber(s.counters.invoice++, now);
      inv.ksefDemoId = makeKsefDemoId(client!.nip, now);
      inv.sentAt = now.toISOString();
      inv.status = "wysłana (demo)";
      results.push({ invoiceId: id, ok: true, number: inv.number, ksefDemoId: inv.ksefDemoId, problems: [] });
    }
  });
  return results;
}

// ───────────────────────── klienci i produkty ─────────────────────────

export function updateClient(clientId: string, patch: Partial<Omit<Client, "id">>) {
  update((s) => {
    const c = s.clients.find((x) => x.id === clientId);
    if (!c) return;
    Object.assign(c, patch);
    c.name = c.name.slice(0, 120);
    c.address = c.address.slice(0, 200);
    c.nip = c.nip.slice(0, 20);
  });
}

/** Cena indywidualna klienta; null (lub ≤ 0) usuwa cenę indywidualną. */
export function setClientPriceOverride(clientId: string, productId: string, price: number | null) {
  update((s) => {
    const c = s.clients.find((x) => x.id === clientId);
    if (!c) return;
    const overrides = { ...(c.pricing.overrides ?? {}) };
    if (price === null || !(price > 0)) delete overrides[productId];
    else overrides[productId] = round2(Math.min(MAX_PRICE, price));
    c.pricing.overrides = overrides;
  });
}

export function updateProduct(productId: string, patch: Partial<Omit<Product, "id">>) {
  update((s) => {
    const p = s.products.find((x) => x.id === productId);
    if (!p) return;
    Object.assign(p, patch);
    p.basePrice = round2(Math.min(MAX_PRICE, Math.max(0.01, p.basePrice)));
  });
}
