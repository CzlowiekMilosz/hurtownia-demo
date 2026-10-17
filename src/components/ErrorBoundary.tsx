import { Component, type ErrorInfo, type ReactNode } from "react";

/** Zamiast białej strony – komunikat z możliwością przywrócenia danych startowych demo. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Błąd aplikacji:", error, info.componentStack);
  }

  private resetAndReload = () => {
    try {
      localStorage.removeItem("hurtownia-demo-state");
      sessionStorage.removeItem("hurtownia-demo-session");
    } catch {
      // brak dostępu do pamięci przeglądarki – samo przeładowanie
    }
    window.location.hash = "#/";
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200">
          <p className="text-4xl" aria-hidden>
            🥀
          </p>
          <h1 className="mt-2 text-lg font-bold">Coś poszło nie tak</h1>
          <p className="mt-1 text-sm text-stone-600">
            Spróbuj odświeżyć stronę. Jeśli problem wraca, przywróć dane startowe demo.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">
              Odśwież stronę
            </button>
            <button type="button" onClick={this.resetAndReload} className="rounded-xl px-4 py-2.5 font-semibold text-stone-700 ring-1 ring-stone-300">
              Resetuj demo
            </button>
          </div>
        </div>
      </div>
    );
  }
}
