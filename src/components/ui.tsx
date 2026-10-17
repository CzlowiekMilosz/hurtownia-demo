import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { brand } from "../config/brand";
import type { InvoiceStatus, OrderStatus } from "../types";

/** Logo z brand.ts; jeśli pliku nie ma – zastępczy znak z liściem. */
export function Logo({ size = 40 }: { size?: number }) {
  const [failed, setFailed] = useState(!brand.logoUrl);
  if (!failed) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.companyName}
        style={{ height: size }}
        className="w-auto object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-xl bg-brand text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <circle cx="12" cy="14" r="7" fill="currentColor" opacity="0.95" />
        <path d="M12 7c1.2-3 4-4 6-3.4-.7 2.4-3 4-6 3.4z" fill="var(--brand-accent)" />
        <path d="M12 7.5V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const orderStatusStyle: Record<OrderStatus, string> = {
  nowe: "bg-sky-100 text-sky-800 ring-sky-200",
  zaakceptowane: "bg-brand-100 text-brand-dark ring-brand-200",
  odrzucone: "bg-red-100 text-red-800 ring-red-200",
  skompletowane: "bg-violet-100 text-violet-800 ring-violet-200",
};

const orderStatusLabel: Record<OrderStatus, string> = {
  nowe: "Nowe",
  zaakceptowane: "Zaakceptowane",
  odrzucone: "Odrzucone",
  skompletowane: "Skompletowane",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${orderStatusStyle[status]}`}>
      {orderStatusLabel[status]}
    </span>
  );
}

const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  szkic: "bg-stone-100 text-stone-700 ring-stone-200",
  gotowa: "bg-amber-100 text-amber-800 ring-amber-200",
  "wysłana (demo)": "bg-brand-100 text-brand-dark ring-brand-200",
};

const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  szkic: "Szkic",
  gotowa: "Gotowa",
  "wysłana (demo)": "Wysłana (demo)",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${invoiceStatusStyle[status]}`}>
      {invoiceStatusLabel[status]}
    </span>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-stone-300",
  accent: "bg-accent text-stone-900 hover:bg-accent-dark hover:text-white disabled:bg-stone-300",
  secondary: "bg-white text-stone-800 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 disabled:text-stone-400",
  danger: "bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:text-stone-400",
  ghost: "text-stone-700 hover:bg-stone-100 disabled:text-stone-400",
};

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-3.5 text-base" };

/** Klasy przycisku – także dla linków wyglądających jak przycisk. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</div>;
}

export function EmptyState({ title, children, icon = "🥕" }: { title: string; children?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="font-semibold text-stone-800">{title}</p>
      {children && <div className="max-w-sm text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function DemoNote({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-dark ${className}`}>
      Wersja demonstracyjna
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Pole liczby z przyciskami +/− (duże pola dotykowe na telefonie). */
export function QtyStepper({
  value,
  step,
  onChange,
  disabled,
  label,
}: {
  value: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? String(value).replace(".", ",") : "");
  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    onChange(Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
    setDraft(null);
  };
  return (
    <div className={`flex items-center rounded-xl ring-1 ring-stone-300 ${disabled ? "opacity-50" : "bg-white"}`}>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-l-xl text-xl font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed"
        onClick={() => onChange(Math.max(0, Math.round((value - step) * 100) / 100))}
        disabled={disabled || value <= 0}
        aria-label={`Zmniejsz: ${label}`}
      >
        −
      </button>
      <input
        inputMode="decimal"
        className="h-11 w-14 bg-transparent text-center text-base font-semibold tabular-nums outline-none"
        value={shown}
        placeholder="0"
        disabled={disabled}
        aria-label={`Ilość: ${label}`}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-r-xl text-xl font-bold text-brand hover:bg-brand-50 disabled:cursor-not-allowed"
        onClick={() => onChange(Math.round((value + step) * 100) / 100)}
        disabled={disabled}
        aria-label={`Zwiększ: ${label}`}
      >
        +
      </button>
    </div>
  );
}
