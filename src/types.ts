export type Unit = "kg" | "skrzynka" | "szt" | "pęczek";

export type Category = "Warzywa" | "Owoce" | "Zioła" | "Grzyby";

export const CATEGORIES: Category[] = ["Warzywa", "Owoce", "Zioła", "Grzyby"];

export interface Product {
  id: string;
  name: string;
  category: Category;
  unit: Unit;
  basePrice: number; // cena bazowa dnia (netto)
  vatRate: number; // DO POTWIERDZENIA z księgową
  available: boolean;
}

export type ClientType = "restauracja" | "sklep" | "catering" | "inne";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  nip: string; // fikcyjny
  address: string;
  login: string; // konto demo
  pricing: {
    discountPercent?: number;
    overrides?: Record<string, number>;
  };
  favorites: string[]; // productId
}

export type OrderStatus = "nowe" | "zaakceptowane" | "odrzucone" | "skompletowane";

export interface OrderItem {
  productId: string;
  orderedQty: number;
  actualQty?: number; // faktyczna ilość po kompletacji / ważeniu
  substituteProductId?: string; // zamiennik
  substitutePrice?: number; // cena klienta za zamiennik (z jego cennika)
  unitPrice: number; // cena klienta w momencie zamówienia
}

export interface Order {
  id: string;
  clientId: string;
  createdAt: string;
  deliveryDate: string; // RRRR-MM-DD
  notes?: string;
  status: OrderStatus;
  items: OrderItem[];
  rejectionReason?: string;
}

export type InvoiceStatus = "szkic" | "gotowa" | "wysłana (demo)";

export interface InvoiceLine {
  name: string;
  qty: number;
  unit: Unit;
  netPrice: number;
  vatRate: number;
}

export interface InvoiceDraft {
  id: string;
  orderId: string;
  clientId: string;
  status: InvoiceStatus;
  number?: string; // nadawany przy „wysłaniu”
  ksefDemoId?: string; // fikcyjny, z prefiksem DEMO-
  sentAt?: string;
  lines: InvoiceLine[];
}

export type Session = { role: "client"; clientId: string } | { role: "admin" } | null;

/** Koszyk klienta: productId → ilość */
export type Cart = Record<string, number>;

export interface AppState {
  version: number;
  products: Product[];
  clients: Client[];
  orders: Order[];
  invoices: InvoiceDraft[];
  carts: Record<string, Cart>; // clientId → koszyk
  session: Session;
  counters: { order: number; invoice: number };
}
