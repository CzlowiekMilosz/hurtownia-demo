import type { AppState, Order, OrderItem, OrderStatus } from "../types";
import { addDays, today } from "../lib/dates";
import { buildInvoiceLines, makeInvoiceNumber, makeKsefDemoId } from "../lib/invoices";
import { getClientPrice } from "../lib/pricing";
import { initialClients } from "./clients";
import { initialProducts } from "./products";

export const STATE_VERSION = 1;

type SeedItem = [productId: string, qty: number, extra?: Partial<OrderItem>];

/** Stan startowy demo. Daty liczone względem dnia wygenerowania (zamówienia „na jutro”). */
export function createSeedState(): AppState {
  const products = structuredClone(initialProducts);
  const clients = structuredClone(initialClients);
  const d0 = today();
  const d1 = addDays(d0, 1);
  const yesterday = addDays(d0, -1);

  const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

  const mk = (
    id: string,
    clientId: string,
    deliveryDate: string,
    status: OrderStatus,
    createdAt: string,
    items: SeedItem[],
    extra: Partial<Order> = {},
  ): Order => {
    const client = clients.find((c) => c.id === clientId)!;
    return {
      id,
      clientId,
      deliveryDate,
      status,
      createdAt,
      items: items.map(([productId, orderedQty, more]) => {
        const product = products.find((p) => p.id === productId)!;
        const item: OrderItem = { productId, orderedQty, unitPrice: getClientPrice(client, product) };
        if (more?.substituteProductId) {
          const sub = products.find((p) => p.id === more.substituteProductId)!;
          item.substitutePrice = getClientPrice(client, sub);
        }
        return { ...item, ...more };
      }),
      ...extra,
    };
  };

  const orders: Order[] = [
    // Dostawy na dziś – już skompletowane
    mk("1001", "bistro", d0, "skompletowane", at(yesterday, "18:42"), [
      ["pomidor-malinowy", 10, { actualQty: 9.6 }],
      ["ogorek-szklarniowy", 5, { actualQty: 5 }],
      ["salata-maslowa", 12, { actualQty: 10 }],
      ["natka-pietruszki", 10, { actualQty: 10 }],
      ["pieczarki", 4, { actualQty: 4.2 }],
    ]),
    mk("1002", "catering", d0, "skompletowane", at(yesterday, "17:15"), [
      ["ziemniaki", 6, { actualQty: 6 }],
      ["marchew", 10, { actualQty: 10.4 }],
      ["cebula-zolta", 8, { actualQty: 8 }],
      ["papryka-czerwona", 5, { actualQty: 5, substituteProductId: "papryka-zolta" }],
      ["brokul", 15, { actualQty: 15 }],
    ]),
    // Dostawy na jutro
    mk("1003", "trattoria", d1, "zaakceptowane", at(d0, "07:58"), [
      ["pomidor-koktajlowy", 8],
      ["rukola", 2],
      ["bazylia", 6],
      ["czosnek", 1],
      ["cytryny", 3],
    ]),
    mk("1004", "kosz", d1, "zaakceptowane", at(d0, "08:20"), [
      ["ziemniaki", 4],
      ["cebula-zolta", 10],
      ["marchew", 10],
      ["jablka-ligol", 20],
      ["banany", 15],
    ]),
    mk(
      "1005",
      "warzywniak",
      d1,
      "nowe",
      at(d0, "09:05"),
      [
        ["pomidor-malinowy", 15],
        ["papryka-czerwona", 6],
        ["jablka-ligol", 15],
        ["gruszki", 8],
        ["koperek", 10],
      ],
      { notes: "Proszę o dojrzałe pomidory, na sprzedaż od razu." },
    ),
    mk("1006", "bistro", d1, "nowe", at(d0, "10:31"), [
      ["pomidor-malinowy", 12],
      ["ogorek-szklarniowy", 6],
      ["salata-maslowa", 10],
      ["koperek", 8],
      ["pieczarki", 5],
      ["cebula-czerwona", 3],
    ]),
    mk(
      "1007",
      "catering",
      d1,
      "nowe",
      at(d0, "11:12"),
      [
        ["ziemniaki", 8],
        ["marchew", 15],
        ["kapusta-biala", 10],
        ["brokul", 12],
        ["pieczarki", 6],
      ],
      { notes: "Dostawa przed 7:00, wjazd od tyłu budynku." },
    ),
    mk(
      "1008",
      "kosz",
      d1,
      "odrzucone",
      at(d0, "08:47"),
      [
        ["truskawki", 10],
        ["winogrona", 5],
      ],
      { rejectionReason: "Truskawki niedostępne – koniec sezonu. Winogrona proszę zamówić osobno." },
    ),
  ];

  const now = new Date();
  const bistro = clients.find((c) => c.id === "bistro")!;

  const invoices: AppState["invoices"] = [
    {
      id: "inv-1001",
      orderId: "1001",
      clientId: "bistro",
      status: "wysłana (demo)",
      number: makeInvoiceNumber(1, now),
      ksefDemoId: makeKsefDemoId(bistro.nip, now),
      sentAt: at(d0, "06:30"),
      lines: buildInvoiceLines(orders[0], products),
    },
    {
      id: "inv-1002",
      orderId: "1002",
      clientId: "catering",
      status: "gotowa",
      lines: buildInvoiceLines(orders[1], products),
    },
    ...orders
      .filter((o) => o.status === "zaakceptowane")
      .map((o) => ({
        id: `inv-${o.id}`,
        orderId: o.id,
        clientId: o.clientId,
        status: "szkic" as const,
        lines: buildInvoiceLines(o, products),
      })),
  ];

  return {
    version: STATE_VERSION,
    products,
    clients,
    orders,
    invoices,
    carts: {},
    session: null,
    counters: { order: 1009, invoice: 2 },
  };
}
