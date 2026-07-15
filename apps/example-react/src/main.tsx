import { TruapiProvider } from "@use-truapi/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { config } from "./config";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <TruapiProvider config={config}>
      <App />
    </TruapiProvider>
  </StrictMode>,
);
