// vite.config.js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvePkg = (target) => path.resolve(__dirname, "node_modules", target);

export default defineConfig({
  plugins: [react()],
  base: "/", // custom domain uses root path
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    alias: {
      react: resolvePkg("react"),
      "react-dom": resolvePkg("react-dom"),
      "react-dom/client": resolvePkg("react-dom/client.js"),
      "react/jsx-runtime": resolvePkg("react/jsx-runtime.js"),
      "react/jsx-dev-runtime": resolvePkg("react/jsx-dev-runtime.js"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: {
    port: 5173,
    open: true,
  },
});
