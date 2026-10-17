import { Link, Navigate, useParams } from "react-router-dom";
import { buttonClass, Card } from "../../components/ui";
import { brand } from "../../config/brand";
import { formatDeliveryDate, shiftTime } from "../../lib/dates";
import { formatPLN, plural } from "../../lib/format";
import { orderTotals } from "../../lib/invoices";
import { useAppState, useCurrentClient } from "../../lib/StoreContext";

export default function Confirmation() {
  const { orderId } = useParams();
  const { orders, products } = useAppState();
  const client = useCurrentClient();
  const order = orders.find((o) => o.id === orderId && o.clientId === client.id);
  if (!order) return <Navigate to="/klient/zamowienia" replace />;

  const totals = orderTotals(order, products);
  const confirmBy = shiftTime(brand.orderCutoff, 60);

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-4xl text-brand" aria-hidden>
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold">Dziękujemy!</h1>
      <p className="mt-2 max-w-sm text-stone-600">
        Przyjęliśmy zamówienie <strong className="text-stone-900">nr {order.id}</strong>, potwierdzimy je do godz.{" "}
        <strong className="text-stone-900">{confirmBy}</strong>.
      </p>

      <Card className="mt-6 w-full p-4 text-left">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Dostawa</dt>
            <dd className="font-semibold">{formatDeliveryDate(order.deliveryDate)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Pozycje</dt>
            <dd className="font-semibold">
              {order.items.length} {plural(order.items.length, "pozycja", "pozycje", "pozycji")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Wartość netto (orientacyjnie)</dt>
            <dd className="font-semibold tabular-nums">{formatPLN(totals.net)}</dd>
          </div>
          {order.notes && (
            <div className="border-t border-stone-100 pt-2">
              <dt className="text-stone-500">Uwagi</dt>
              <dd>{order.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="mt-6 flex w-full flex-col gap-2">
        <Link to="/klient/zamowienia" className={buttonClass("primary", "lg", "w-full")}>
          Moje zamówienia
        </Link>
        <Link to="/klient" className={buttonClass("secondary", "lg", "w-full")}>
          Wróć do katalogu
        </Link>
      </div>
      <p className="mt-6 text-xs text-stone-500">
        Pytania? Tel. {brand.phone} · {brand.email}
      </p>
    </div>
  );
}
