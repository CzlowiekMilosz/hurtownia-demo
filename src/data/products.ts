import { brand } from "../config/brand";
import type { Product } from "../types";

const vat = brand.defaultVatRate; // DO POTWIERDZENIA z księgową

// Ceny przykładowe (netto, PLN) – nie odzwierciedlają rzeczywistych cen giełdowych.
export const initialProducts: Product[] = [
  // Warzywa
  { id: "pomidor-malinowy", name: "Pomidor malinowy", category: "Warzywa", unit: "kg", basePrice: 9.5, vatRate: vat, available: true },
  { id: "pomidor-koktajlowy", name: "Pomidor koktajlowy", category: "Warzywa", unit: "kg", basePrice: 14, vatRate: vat, available: true },
  { id: "ogorek-szklarniowy", name: "Ogórek szklarniowy", category: "Warzywa", unit: "kg", basePrice: 5.8, vatRate: vat, available: true },
  { id: "ogorek-gruntowy", name: "Ogórek gruntowy", category: "Warzywa", unit: "kg", basePrice: 4.2, vatRate: vat, available: true },
  { id: "ziemniaki", name: "Ziemniaki (skrzynka 15 kg)", category: "Warzywa", unit: "skrzynka", basePrice: 32, vatRate: vat, available: true },
  { id: "cebula-zolta", name: "Cebula żółta", category: "Warzywa", unit: "kg", basePrice: 2.4, vatRate: vat, available: true },
  { id: "cebula-czerwona", name: "Cebula czerwona", category: "Warzywa", unit: "kg", basePrice: 3.9, vatRate: vat, available: true },
  { id: "czosnek", name: "Czosnek", category: "Warzywa", unit: "kg", basePrice: 18, vatRate: vat, available: true },
  { id: "marchew", name: "Marchew", category: "Warzywa", unit: "kg", basePrice: 2.6, vatRate: vat, available: true },
  { id: "pietruszka-korzen", name: "Pietruszka korzeń", category: "Warzywa", unit: "kg", basePrice: 7.5, vatRate: vat, available: true },
  { id: "burak", name: "Burak ćwikłowy", category: "Warzywa", unit: "kg", basePrice: 2.8, vatRate: vat, available: true },
  { id: "papryka-czerwona", name: "Papryka czerwona", category: "Warzywa", unit: "kg", basePrice: 11.5, vatRate: vat, available: true },
  { id: "papryka-zolta", name: "Papryka żółta", category: "Warzywa", unit: "kg", basePrice: 12, vatRate: vat, available: true },
  { id: "salata-maslowa", name: "Sałata masłowa", category: "Warzywa", unit: "szt", basePrice: 2.9, vatRate: vat, available: true },
  { id: "salata-lodowa", name: "Sałata lodowa", category: "Warzywa", unit: "szt", basePrice: 3.5, vatRate: vat, available: true },
  { id: "rukola", name: "Rukola", category: "Warzywa", unit: "kg", basePrice: 28, vatRate: vat, available: true },
  { id: "kapusta-biala", name: "Kapusta biała", category: "Warzywa", unit: "szt", basePrice: 4.5, vatRate: vat, available: true },
  { id: "brokul", name: "Brokuł", category: "Warzywa", unit: "szt", basePrice: 4.8, vatRate: vat, available: true },
  { id: "cukinia", name: "Cukinia", category: "Warzywa", unit: "kg", basePrice: 6.5, vatRate: vat, available: false },
  // Zioła
  { id: "natka-pietruszki", name: "Natka pietruszki", category: "Zioła", unit: "pęczek", basePrice: 2.2, vatRate: vat, available: true },
  { id: "koperek", name: "Koperek", category: "Zioła", unit: "pęczek", basePrice: 2, vatRate: vat, available: true },
  { id: "szczypiorek", name: "Szczypiorek", category: "Zioła", unit: "pęczek", basePrice: 2.2, vatRate: vat, available: true },
  { id: "bazylia", name: "Bazylia (doniczka)", category: "Zioła", unit: "szt", basePrice: 5.5, vatRate: vat, available: true },
  // Grzyby
  { id: "pieczarki", name: "Pieczarki", category: "Grzyby", unit: "kg", basePrice: 9, vatRate: vat, available: true },
  { id: "boczniak", name: "Boczniak", category: "Grzyby", unit: "kg", basePrice: 14, vatRate: vat, available: true },
  // Owoce
  { id: "jablka-ligol", name: "Jabłka Ligol", category: "Owoce", unit: "kg", basePrice: 3.8, vatRate: vat, available: true },
  { id: "gruszki", name: "Gruszki Konferencja", category: "Owoce", unit: "kg", basePrice: 6.5, vatRate: vat, available: true },
  { id: "cytryny", name: "Cytryny", category: "Owoce", unit: "kg", basePrice: 8.5, vatRate: vat, available: true },
  { id: "banany", name: "Banany", category: "Owoce", unit: "kg", basePrice: 6.9, vatRate: vat, available: true },
  { id: "pomarancze", name: "Pomarańcze", category: "Owoce", unit: "kg", basePrice: 6.2, vatRate: vat, available: true },
  { id: "winogrona", name: "Winogrona białe", category: "Owoce", unit: "kg", basePrice: 13, vatRate: vat, available: true },
  { id: "truskawki", name: "Truskawki", category: "Owoce", unit: "kg", basePrice: 22, vatRate: vat, available: false },
];
