// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // custom domain uses root path
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    open: true,
  },
});
