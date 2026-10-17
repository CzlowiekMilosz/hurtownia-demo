import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import AdminLayout from "./layouts/AdminLayout";
import ClientLayout from "./layouts/ClientLayout";
import { StoreProvider, useAppState } from "./lib/StoreContext";
import Login from "./pages/Login";
import AdminClients from "./pages/admin/Clients";
import AdminFulfillment from "./pages/admin/Fulfillment";
import AdminInvoices from "./pages/admin/Invoices";
import AdminMarketList from "./pages/admin/MarketList";
import AdminOrders from "./pages/admin/Orders";
import AdminProducts from "./pages/admin/Products";
import Catalog from "./pages/client/Catalog";
import Confirmation from "./pages/client/Confirmation";
import MyOrders from "./pages/client/MyOrders";
import Summary from "./pages/client/Summary";

function RequireClient({ children }: { children: ReactNode }) {
  const { session } = useAppState();
  return session?.role === "client" ? children : <Navigate to="/" replace />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAppState();
  return session?.role === "admin" ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/klient"
              element={
                <RequireClient>
                  <ClientLayout />
                </RequireClient>
              }
            >
              <Route index element={<Catalog />} />
              <Route path="podsumowanie" element={<Summary />} />
              <Route path="potwierdzenie/:orderId" element={<Confirmation />} />
              <Route path="zamowienia" element={<MyOrders />} />
            </Route>
            <Route
              path="/hurtownia"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="zamowienia" replace />} />
              <Route path="zamowienia" element={<AdminOrders />} />
              <Route path="zamowienia/:orderId" element={<AdminOrders />} />
              <Route path="gielda" element={<AdminMarketList />} />
              <Route path="kompletacja" element={<AdminFulfillment />} />
              <Route path="faktury" element={<AdminInvoices />} />
              <Route path="faktury/:invoiceId" element={<AdminInvoices />} />
              <Route path="klienci" element={<AdminClients />} />
              <Route path="klienci/:clientId" element={<AdminClients />} />
              <Route path="produkty" element={<AdminProducts />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
