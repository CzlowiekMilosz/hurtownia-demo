import type { Client } from "../types";

// Wszyscy klienci, adresy i NIP-y są FIKCYJNE (przykładowe dane demo).
export const initialClients: Client[] = [
  {
    id: "bistro",
    name: "Bistro Pod Lipą",
    type: "restauracja",
    nip: "000-000-00-01",
    address: "ul. Lipowa 12, 00-001 Przykładowo",
    login: "bistro",
    pricing: { discountPercent: 5, overrides: { "pomidor-malinowy": 8.6 } },
    favorites: ["pomidor-malinowy", "ogorek-szklarniowy", "salata-maslowa", "natka-pietruszki", "pieczarki"],
  },
  {
    id: "trattoria",
    name: "Trattoria Zielony Ogród",
    type: "restauracja",
    nip: "000-000-00-02",
    address: "ul. Ogrodowa 5, 00-002 Przykładowo",
    login: "trattoria",
    pricing: { overrides: { rukola: 24, bazylia: 4.5, "pomidor-koktajlowy": 12.5 } },
    favorites: ["pomidor-koktajlowy", "rukola", "bazylia", "czosnek", "cytryny"],
  },
  {
    id: "kosz",
    name: "Sklep Osiedlowy „Kosz”",
    type: "sklep",
    nip: "000-000-00-03",
    address: "os. Słoneczne 3/1, 00-003 Przykładowo",
    login: "kosz",
    pricing: { discountPercent: 8 },
    favorites: ["ziemniaki", "cebula-zolta", "marchew", "jablka-ligol", "banany"],
  },
  {
    id: "warzywniak",
    name: "Warzywniak Pod Zegarem",
    type: "sklep",
    nip: "", // celowo brak NIP – pokazuje walidację przed wysłaniem faktury
    address: "ul. Rynkowa 8, 00-004 Przykładowo",
    login: "warzywniak",
    pricing: { discountPercent: 3 },
    favorites: ["pomidor-malinowy", "papryka-czerwona", "jablka-ligol", "gruszki", "koperek"],
  },
  {
    id: "catering",
    name: "Catering Smaczna Przerwa",
    type: "catering",
    nip: "000-000-00-05",
    address: "ul. Przemysłowa 21, 00-005 Przykładowo",
    login: "catering",
    pricing: { discountPercent: 10, overrides: { ziemniaki: 28 } },
    favorites: ["ziemniaki", "marchew", "cebula-zolta", "kapusta-biala", "brokul", "pieczarki"],
  },
];
