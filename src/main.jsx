import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

console.log("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON", import.meta.env.VITE_SUPABASE_ANON?.slice(0, 10) + "…");

const root = createRoot(document.getElementById("root"));
root.render(<App />);
