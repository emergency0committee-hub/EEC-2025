// vite.config.js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactPath = path.resolve(__dirname, "node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/react-dom");
const reactJsxRuntimePath = path.resolve(__dirname, "node_modules/react/jsx-runtime.js");
const reactJsxDevRuntimePath = path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js");
const reactDomClientPath = path.resolve(__dirname, "node_modules/react-dom/client.js");

export default defineConfig({
  plugins: [react()],
  base: "/", // custom domain uses root path
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: reactPath,
      "react/jsx-runtime": reactJsxRuntimePath,
      "react/jsx-dev-runtime": reactJsxDevRuntimePath,
      "react-dom": reactDomPath,
      "react-dom/client": reactDomClientPath,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
  server: {               // (optional) local dev settings
    port: 5173,
    open: true,
  },
});
