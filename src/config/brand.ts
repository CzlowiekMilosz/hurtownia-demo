export const brand = {
  companyName: "NAZWA HURTOWNI", // TODO: uzupełnić
  logoUrl: "", // TODO: wrzucić logo do /public i wpisać np. "logo.png" (ścieżka względna – działa na GitHub Pages)
  primaryColor: "#2f7d32", // TODO: kolor z obecnej strony firmy
  accentColor: "#f59e0b",
  phone: "TODO",
  email: "TODO",
  orderCutoff: "20:00", // godzina graniczna zamówień na następny dzień
  // Dane sprzedawcy na fakturze – TODO: uzupełnić prawdziwymi danymi
  seller: {
    nip: "000-000-00-00 (przykładowy)",
    address: "ul. Przykładowa 1, 00-000 Miasto",
    bankAccount: "00 0000 0000 0000 0000 0000 0000 (przykładowy)",
  },
  // Domyślna stawka VAT dla produktów – DO POTWIERDZENIA z księgową
  defaultVatRate: 5,
};

/** Ustawia zmienne CSS z kolorami marki – Tailwind korzysta z nich jako `brand` i `accent`. */
export function applyBrandColors() {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", brand.primaryColor);
  root.style.setProperty("--brand-accent", brand.accentColor);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", brand.primaryColor);
}
