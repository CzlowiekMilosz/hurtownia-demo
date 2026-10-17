import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { Button, Card, EmptyState, InvoiceStatusBadge, PageHeader } from "../../components/ui";
import { brand } from "../../config/brand";
import { formatDate, formatDateTime, formatDeliveryDate, toISODate } from "../../lib/dates";
import { formatPLN, formatQty, formatUnit } from "../../lib/format";
import { validateInvoice } from "../../lib/invoices";
import { computeTotals, round2 } from "../../lib/pricing";
import { useAppState } from "../../lib/StoreContext";
import { markInvoiceReady, sendInvoicesToKsefDemo, updateInvoiceLines, type KsefSendResult } from "../../lib/store";
import type { InvoiceDraft, InvoiceLine, InvoiceStatus, Unit } from "../../types";

const STATUSES: InvoiceStatus[] = ["szkic", "gotowa", "wysłana (demo)"];

export default function Invoices() {
  const { invoiceId } = useParams();
  const { invoices } = useAppState();
  const invoice = invoices.find((i) => i.id === invoiceId);
  return invoice ? <InvoiceDetail key={invoice.id} invoice={invoice} /> : <InvoiceList />;
}

function KsefDemoBanner() {
  return (
    <p className="mb-4 rounded-xl bg-accent-50 px-4 py-2.5 text-sm text-stone-800 ring-1 ring-accent/30">
      ⚠️ <strong>Symulacja.</strong> Wysyłka do KSeF w tym demo nie łączy się z żadnym systemem – nadaje tylko numer
      faktury i fikcyjny identyfikator z prefiksem <code className="font-semibold">DEMO-</code>.
    </p>
  );
}

function InvoiceList() {
  const { invoices, clients, orders } = useAppState();
  const toast = useToast();
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<KsefSendResult[] | null>(null);

  const clientOf = (inv: InvoiceDraft) => clients.find((c) => c.id === inv.clientId);
  const orderOf = (inv: InvoiceDraft) => orders.find((o) => o.id === inv.orderId);
  const list = invoices
    .filter((i) => !status || i.status === status)
    .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.orderId.localeCompare(a.orderId));
  const sendable = list.filter((i) => i.status !== "wysłana (demo)");
  const allSelected = sendable.length > 0 && sendable.every((i) => selected.has(i.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onSend = () => {
    const r = sendInvoicesToKsefDemo([...selected]);
    setResults(r);
    setSelected(new Set());
    const ok = r.filter((x) => x.ok).length;
    toast(`Wysłano (demo): ${ok} z ${r.length}.`, ok === r.length ? "success" : "info");
  };

  return (
    <>
      <PageHeader
        title="Faktury"
        subtitle="Szkice tworzą się automatycznie po akceptacji zamówienia i aktualizują po kompletacji."
        actions={
          <Button onClick={onSend} disabled={!selected.size}>
            📤 Wyślij do KSeF (demo){selected.size ? ` · ${selected.size}` : ""}
          </Button>
        }
      />
      <KsefDemoBanner />

      {results && (
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Wynik wysyłki (symulacja)</h2>
            <Button size="sm" variant="ghost" onClick={() => setResults(null)}>
              Zamknij
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {results.map((r) => {
              const inv = invoices.find((i) => i.id === r.invoiceId);
              return (
                <li key={r.invoiceId} className={`rounded-lg px-3 py-2 ${r.ok ? "bg-brand-50" : "bg-red-50"}`}>
                  <strong>Zam. nr {inv?.orderId}</strong> · {inv && clientOf(inv)?.name}:{" "}
                  {r.ok ? (
                    <span>
                      ✓ nadano numer <strong>{r.number}</strong>, identyfikator <code className="text-xs">{r.ksefDemoId}</code>
                    </span>
                  ) : (
                    <span className="text-red-800">✕ zablokowano – {r.problems.join(" ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-1">
        {(["", ...STATUSES] as const).map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === s ? "bg-stone-800 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50"}`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : "Wszystkie"} ({s ? invoices.filter((i) => i.status === s).length : invoices.length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Brak faktur" icon="🧾">
          Szkic faktury powstaje automatycznie po zaakceptowaniu zamówienia.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-stone-100 text-left text-xs text-stone-500 uppercase">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand-primary)]"
                    checked={allSelected}
                    disabled={!sendable.length}
                    onChange={(e) => setSelected(new Set(e.target.checked ? sendable.map((i) => i.id) : []))}
                    aria-label="Zaznacz wszystkie do wysłania"
                  />
                </th>
                <th className="px-2 py-2.5 font-semibold">Faktura</th>
                <th className="px-2 py-2.5 font-semibold">Nabywca</th>
                <th className="px-2 py-2.5 font-semibold">Dostawa</th>
                <th className="px-2 py-2.5 text-right font-semibold">Brutto</th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Uwagi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {list.map((inv) => {
                const client = clientOf(inv);
                const order = orderOf(inv);
                const sent = inv.status === "wysłana (demo)";
                const problems = sent ? [] : validateInvoice(inv.lines, client, order);
                return (
                  <tr key={inv.id} className={selected.has(inv.id) ? "bg-brand-50" : "hover:bg-stone-50"}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--brand-primary)]"
                        checked={selected.has(inv.id)}
                        disabled={sent}
                        onChange={() => toggle(inv.id)}
                        aria-label={`Zaznacz fakturę do zamówienia ${inv.orderId}`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Link to={`/hurtownia/faktury/${inv.id}`} className="font-semibold text-brand hover:underline">
                        {inv.number ?? `Szkic – zam. ${inv.orderId}`}
                      </Link>
                      {inv.ksefDemoId && <p className="font-mono text-[11px] text-stone-500">{inv.ksefDemoId}</p>}
                    </td>
                    <td className="px-2 py-2.5">{client?.name}</td>
                    <td className="px-2 py-2.5 text-stone-600">{order && formatDeliveryDate(order.deliveryDate)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{formatPLN(computeTotals(inv.lines).gross)}</td>
                    <td className="px-2 py-2.5">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {sent ? (
                        <span className="text-stone-500">Wysłano {inv.sentAt && formatDateTime(inv.sentAt)}</span>
                      ) : problems.length ? (
                        <span className="text-red-700" title={problems.join("\n")}>
                          ⚠ {problems[0]}
                          {problems.length > 1 && ` (+${problems.length - 1})`}
                        </span>
                      ) : (
                        <span className="text-brand-dark">✓ gotowa do wysłania</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

const UNITS: Unit[] = ["kg", "skrzynka", "szt", "pęczek"];

function InvoiceDetail({ invoice }: { invoice: InvoiceDraft }) {
  const { clients, orders } = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const client = clients.find((c) => c.id === invoice.clientId);
  const order = orders.find((o) => o.id === invoice.orderId);
  const sent = invoice.status === "wysłana (demo)";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<(Omit<InvoiceLine, "qty" | "netPrice"> & { qty: string; netPrice: string })[]>([]);
  const [problems, setProblems] = useState<string[]>([]);

  const totals = computeTotals(invoice.lines);
  const liveProblems = sent ? [] : validateInvoice(invoice.lines, client, order);
  const issueDate = invoice.sentAt ? toISODate(new Date(invoice.sentAt)) : toISODate(new Date());

  const startEdit = () => {
    setDraft(invoice.lines.map((l) => ({ ...l, qty: String(l.qty).replace(".", ","), netPrice: l.netPrice.toFixed(2).replace(".", ",") })));
    setEditing(true);
  };
  const num = (v: string) => Number(v.replace(",", ".").replace(/\s/g, ""));
  const saveEdit = () => {
    const lines = draft.map((l) => ({ ...l, name: l.name.trim(), qty: num(l.qty), netPrice: num(l.netPrice) }));
    if (lines.some((l) => !l.name || !Number.isFinite(l.qty) || !Number.isFinite(l.netPrice))) {
      toast("Uzupełnij nazwy i wpisz poprawne liczby.", "error");
      return;
    }
    updateInvoiceLines(invoice.id, lines);
    setEditing(false);
    setProblems([]);
    toast("Zapisano szkic faktury.");
  };
  const onReady = () => {
    const p = markInvoiceReady(invoice.id);
    setProblems(p);
    if (!p.length) toast("Faktura oznaczona jako gotowa.");
  };
  const onSend = () => {
    const [r] = sendInvoicesToKsefDemo([invoice.id]);
    setProblems(r.problems);
    if (r.ok) toast(`Wysłano (demo): ${r.number}`);
  };

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/hurtownia/faktury")} className="text-sm text-stone-500 hover:text-stone-800">
          ← Wszystkie faktury
        </button>
        <div className="flex flex-wrap gap-2">
          {!sent && !editing && (
            <Button variant="secondary" onClick={startEdit}>
              ✎ Edytuj pozycje
            </Button>
          )}
          {invoice.status === "szkic" && !editing && (
            <Button variant="secondary" onClick={onReady}>
              ✓ Oznacz jako gotową
            </Button>
          )}
          {!sent && !editing && <Button onClick={onSend}>📤 Wyślij do KSeF (demo)</Button>}
          <Button variant="ghost" onClick={() => window.print()}>
            🖨 Drukuj
          </Button>
        </div>
      </div>

      <div className="no-print">
        <KsefDemoBanner />
        {(problems.length > 0 || liveProblems.length > 0) && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
            <p className="font-semibold">Nie można wysłać faktury:</p>
            <ul className="mt-1 list-disc pl-5">
              {(problems.length ? problems : liveProblems).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {!client?.nip && client && (
              <Link to={`/hurtownia/klienci/${client.id}`} className="mt-2 inline-block font-semibold underline">
                Uzupełnij NIP klienta →
              </Link>
            )}
          </div>
        )}
      </div>

      <Card className="mx-auto max-w-4xl p-6 sm:p-8 print:shadow-none print:ring-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Faktura VAT</p>
            <h1 className="text-2xl font-bold">{invoice.number ?? "SZKIC – numer nadawany przy wysyłce"}</h1>
            <div className="mt-1 flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-xs text-stone-500">do zamówienia nr {invoice.orderId}</span>
            </div>
          </div>
          <dl className="text-right text-sm">
            <dt className="text-stone-500">Data wystawienia</dt>
            <dd className="font-semibold">{formatDate(issueDate)}</dd>
            {order && (
              <>
                <dt className="mt-1 text-stone-500">Data dostawy</dt>
                <dd className="font-semibold">{formatDate(order.deliveryDate)}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-stone-50 p-4 text-sm">
            <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">Sprzedawca</p>
            <p className="font-semibold">{brand.companyName}</p>
            <p>{brand.seller.address}</p>
            <p>NIP: {brand.seller.nip}</p>
            <p className="mt-1 text-xs text-stone-500">Konto: {brand.seller.bankAccount}</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-4 text-sm">
            <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">Nabywca</p>
            <p className="font-semibold">{client?.name}</p>
            <p>{client?.address}</p>
            <p>
              NIP: {client?.nip ? `${client.nip} (przykładowy)` : <span className="font-semibold text-red-700">BRAK</span>}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-stone-500 uppercase">
                <tr>
                  <th className="py-2 font-semibold">Nazwa</th>
                  <th className="py-2 font-semibold">Ilość</th>
                  <th className="py-2 font-semibold">J.m.</th>
                  <th className="py-2 font-semibold">Cena netto</th>
                  <th className="py-2 font-semibold">VAT %</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.map((l, i) => {
                  const upd = (patch: Partial<(typeof draft)[number]>) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  const cls = "h-9 rounded-lg bg-white px-2 ring-1 ring-stone-300 focus:ring-2 focus:ring-brand focus:outline-none";
                  return (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input value={l.name} onChange={(e) => upd({ name: e.target.value })} className={`${cls} w-full`} aria-label="Nazwa" />
                      </td>
                      <td className="py-1 pr-2">
                        <input value={l.qty} inputMode="decimal" onChange={(e) => upd({ qty: e.target.value })} className={`${cls} w-20 text-right`} aria-label={`Ilość: ${l.name}`} />
                      </td>
                      <td className="py-1 pr-2">
                        <select value={l.unit} onChange={(e) => upd({ unit: e.target.value as Unit })} className={cls} aria-label="Jednostka">
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 pr-2">
                        <input value={l.netPrice} inputMode="decimal" onChange={(e) => upd({ netPrice: e.target.value })} className={`${cls} w-24 text-right`} aria-label={`Cena: ${l.name}`} />
                      </td>
                      <td className="py-1 pr-2">
                        <select value={l.vatRate} onChange={(e) => upd({ vatRate: Number(e.target.value) })} className={cls} aria-label="Stawka VAT">
                          {[0, 5, 8, 23].map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1">
                        <button type="button" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label={`Usuń pozycję ${l.name}`}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDraft((d) => [...d, { name: "", qty: "1", unit: "szt", netPrice: "0,00", vatRate: brand.defaultVatRate }])}>
                + Dodaj pozycję
              </Button>
              <span className="flex-1" />
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Anuluj
              </Button>
              <Button onClick={saveEdit}>Zapisz szkic</Button>
            </div>
          </div>
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-stone-200 text-left text-xs text-stone-500 uppercase">
                <tr>
                  <th className="py-2 pr-2 font-semibold">Lp.</th>
                  <th className="py-2 pr-2 font-semibold">Nazwa</th>
                  <th className="py-2 pr-2 text-right font-semibold">Ilość</th>
                  <th className="py-2 pr-2 text-right font-semibold">Cena netto</th>
                  <th className="py-2 pr-2 text-right font-semibold">Wartość netto</th>
                  <th className="py-2 text-right font-semibold">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 tabular-nums">
                {invoice.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 text-stone-500">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium">{l.name}</td>
                    <td className={`py-2 pr-2 text-right ${l.qty > 0 ? "" : "font-semibold text-red-700"}`}>
                      {formatQty(l.qty)} {formatUnit(l.unit)}
                    </td>
                    <td className="py-2 pr-2 text-right">{formatPLN(l.netPrice)}</td>
                    <td className="py-2 pr-2 text-right">{formatPLN(round2(l.qty * l.netPrice))}</td>
                    <td className="py-2 text-right">{l.vatRate}%</td>
                  </tr>
                ))}
                {invoice.lines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-red-700">
                      Faktura nie ma pozycji.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="ml-auto max-w-xs text-sm tabular-nums">
          {totals.byRate.map((r) => (
            <div key={r.rate} className="flex justify-between text-stone-600">
              <span>
                Netto {formatPLN(r.net)} · VAT {r.rate}%
              </span>
              <span>{formatPLN(r.vat)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-stone-200 pt-1">
            <span>Razem netto</span>
            <span>{formatPLN(totals.net)}</span>
          </div>
          <div className="flex justify-between">
            <span>Razem VAT</span>
            <span>{formatPLN(totals.vat)}</span>
          </div>
          <div className="mt-1 flex justify-between text-lg font-bold">
            <span>Do zapłaty</span>
            <span>{formatPLN(totals.gross)}</span>
          </div>
        </div>

        {invoice.ksefDemoId && (
          <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm">
            Numer KSeF (DEMO – fikcyjny): <code className="font-semibold break-all">{invoice.ksefDemoId}</code>
            {invoice.sentAt && <span className="block text-xs text-stone-500">Wysłano {formatDateTime(invoice.sentAt)} – symulacja</span>}
          </p>
        )}
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Dokument wygenerowany w wersji demonstracyjnej – wzór faktury i stawki VAT do potwierdzenia z księgową.
        </p>
      </Card>
    </>
  );
}
