import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { AppState, Client } from "../types";
import { getState, subscribe } from "./store";

const StoreContext = createContext<AppState | null>(null);

/** Udostępnia aktualny stan aplikacji; zmiany robimy funkcjami z `lib/store.ts`. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getState);
  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>;
}

export function useAppState(): AppState {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useAppState musi być użyte wewnątrz <StoreProvider>");
  return s;
}

/** Zalogowany klient – używać tylko na ekranach klienta (chronionych przez RequireClient). */
export function useCurrentClient(): Client {
  const { session, clients } = useAppState();
  const client = session?.role === "client" ? clients.find((c) => c.id === session.clientId) : undefined;
  if (!client) throw new Error("Brak zalogowanego klienta");
  return client;
}
