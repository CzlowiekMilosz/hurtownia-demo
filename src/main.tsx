import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyBrandColors } from "./config/brand";
import "./index.css";

applyBrandColors();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
