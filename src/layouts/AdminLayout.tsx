import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { DemoNote, Logo } from "../components/ui";
import { brand } from "../config/brand";
import { today } from "../lib/dates";
import { useAppState } from "../lib/StoreContext";
import { logout, resetDemo } from "../lib/store";

export default function AdminLayout() {
  const { orders } = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const newCount = orders.filter((o) => o.status === "nowe").length;
  // Dane demo generowane są względem dnia startu – po kilku dniach wszystkie dostawy są „w przeszłości”.
  const stale = orders.length > 0 && !orders.some((o) => o.deliveryDate >= today());

  const links = [
    { to: "/hurtownia/zamowienia", label: "Zamówienia", icon: "📋", badge: newCount },
    { to: "/hurtownia/gielda", label: "Lista na giełdę", icon: "🛒" },
    { to: "/hurtownia/kompletacja", label: "Kompletacja", icon: "⚖️" },
    { to: "/hurtownia/faktury", label: "Faktury", icon: "🧾" },
    { to: "/hurtownia/klienci", label: "Klienci i cenniki", icon: "👥" },
    { to: "/hurtownia/produkty", label: "Produkty", icon: "🥬" },
  ];

  const onReset = () => {
    if (!window.confirm("Przywrócić dane startowe demo? Wszystkie zmiany zostaną utracone.")) return;
    resetDemo();
    toast("Przywrócono dane startowe demo.", "info");
    navigate("/hurtownia/zamowienia");
  };

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? "bg-brand text-white" : "text-stone-700 hover:bg-stone-100"
    }`;

  return (
    <div className="min-h-dvh lg:flex">
      {/* Menu boczne – laptop */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-stone-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <Logo size={38} />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-bold text-stone-900">{brand.companyName}</p>
            <p className="text-xs text-stone-500">Panel hurtowni</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={link}>
              <span aria-hidden>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              {!!l.badge && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-stone-900">{l.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-stone-100 pt-3">
          <button type="button" onClick={onReset} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-red-50 hover:text-red-700">
            <span aria-hidden>↺</span> Resetuj demo
          </button>
          <button type="button" onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-100">
            <span aria-hidden>⎋</span> Wyloguj
          </button>
          <DemoNote className="mt-2 self-start" />
        </div>
      </aside>

      {/* Pasek górny – tablet / telefon */}
      <header className="no-print sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={30} />
            <p className="truncate text-sm font-bold">{brand.companyName} · panel</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={onReset} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100">
              Resetuj demo
            </button>
            <button type="button" onClick={onLogout} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100">
              Wyloguj
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={link}>
              <span aria-hidden>{l.icon}</span>
              {l.label}
              {!!l.badge && (
                <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-stone-900">{l.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {stale && (
            <p className="no-print mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
              ℹ️ Daty w danych demo są nieaktualne.{" "}
              <button type="button" onClick={onReset} className="font-semibold underline">
                Resetuj demo
              </button>
              , aby zamówienia znów były „na jutro”.
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
