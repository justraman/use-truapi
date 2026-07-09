import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  // The product sandbox has no `process`; some product-sdk packages still
  // read process.env, so collapse it at build time.
  define: { "process.env": "{}" },
  build: { target: "es2022" },
});
