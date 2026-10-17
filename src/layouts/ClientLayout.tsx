import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "../components/ui";
import { brand } from "../config/brand";
import { useAppState } from "../lib/StoreContext";
import { logout } from "../lib/store";

export default function ClientLayout() {
  const { session, clients } = useAppState();
  const navigate = useNavigate();
  const client = session?.role === "client" ? clients.find((c) => c.id === session.clientId) : undefined;

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
      isActive ? "bg-white text-brand-dark shadow-sm" : "text-stone-600 hover:text-stone-900"
    }`;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo size={34} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold text-stone-900">{brand.companyName}</p>
                <p className="truncate text-xs text-stone-500">{client?.name}</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Wyloguj
            </button>
          </div>
          <nav className="mt-3 flex gap-1 rounded-xl bg-stone-100 p-1">
            <NavLink to="/klient" end className={tab}>
              Katalog
            </NavLink>
            <NavLink to="/klient/zamowienia" className={tab}>
              Moje zamówienia
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-32">
        <Outlet />
      </main>
    </div>
  );
}
