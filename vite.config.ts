import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Względna ścieżka bazowa: dzięki HashRouter aplikacja działa na GitHub Pages
// pod dowolną nazwą repozytorium (https://<user>.github.io/<repo>/) bez zmian.
// Można też ustawić VITE_BASE="/<nazwa-repo>/" przy buildzie.
export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  plugins: [react(), tailwindcss()],
});
