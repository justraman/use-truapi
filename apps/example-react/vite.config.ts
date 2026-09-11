import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

/**
 * Local host bridge: when a `truapi-host` CLI host serves its bootstrap
 * script on loopback (`truapi-host dev …` or `signing-host --serve`), inject
 * it ahead of the app so the product runs as hosted — real product account,
 * signing, statements, entropy — in a plain browser tab. Dev-server only;
 * without a running host the tag is simply not injected.
 */
function truapiHostBridge(
  url = process.env.TRUAPI_HOST_BRIDGE ?? "http://127.0.0.1:9955/bootstrap.js",
): Plugin {
  let reachable = false;
  return {
    name: "truapi-host-bridge",
    apply: "serve",
    async configureServer() {
      try {
        reachable = (await fetch(url, { signal: AbortSignal.timeout(1_000) })).ok;
      } catch {
        reachable = false;
      }
      console.log(
        reachable
          ? `[truapi] host bridge at ${url} — running as a hosted product`
          : "[truapi] no local host bridge — running standalone (start `truapi-host dev` to test hosted paths)",
      );
    },
    transformIndexHtml: () =>
      reachable ? [{ tag: "script", attrs: { src: url }, injectTo: "head" }] : [],
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), truapiHostBridge()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  // The product sandbox has no `process`; some product-sdk packages still
  // read process.env, so collapse it at build time.
  define: { "process.env": "{}" },
  build: { target: "es2022" },
});
