import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, DemoNote, Logo } from "../components/ui";
import { brand } from "../config/brand";
import { useAppState } from "../lib/StoreContext";
import { login } from "../lib/store";
import type { ClientType } from "../types";

const typeLabel: Record<ClientType, string> = {
  restauracja: "Restauracja",
  sklep: "Sklep",
  catering: "Catering",
  inne: "Inne",
};

export default function Login() {
  const { session, clients } = useAppState();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);

  if (session?.role === "client") return <Navigate to="/klient" replace />;
  if (session?.role === "admin") return <Navigate to="/hurtownia" replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-[#f6f7f4] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">{brand.companyName}</h1>
          <p className="mt-1 text-stone-500">Hurtownia warzyw i owoców – zamówienia online</p>
        </div>

        {!picking ? (
          <Button size="lg" className="w-full" onClick={() => setPicking(true)}>
            Zaloguj się
          </Button>
        ) : (
          <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Wybierz konto demo
            </p>
            <ul>
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-brand-50"
                    onClick={() => {
                      login({ role: "client", clientId: c.id });
                      navigate("/klient");
                    }}
                  >
                    <span>
                      <span className="block font-semibold text-stone-900">{c.name}</span>
                      <span className="text-xs text-stone-500">
                        {typeLabel[c.type]} · login: {c.login}
                      </span>
                    </span>
                    <span className="text-stone-400" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              ))}
              <li className="mt-1 border-t border-stone-100 pt-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent-50"
                  onClick={() => {
                    login({ role: "admin" });
                    navigate("/hurtownia");
                  }}
                >
                  <span>
                    <span className="block font-semibold text-stone-900">Hurtownia (administrator)</span>
                    <span className="text-xs text-stone-500">Panel zamówień, giełdy, kompletacji i faktur</span>
                  </span>
                  <span className="text-stone-400" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-stone-500">
          <DemoNote />
          <p>Przykładowe dane – bez prawdziwych klientów, NIP-ów i połączenia z KSeF.</p>
        </div>
      </div>
    </div>
  );
}
