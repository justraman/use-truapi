import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  // The product sandbox has no `process`; some product-sdk packages still
  // read process.env, so collapse it at build time.
  define: { "process.env": "{}" },
  build: { target: "es2022" },
});
