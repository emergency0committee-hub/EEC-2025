// src/components/Btn.jsx
import React, { useState } from "react";

const basePrimary = {
  margin: "10px",
  padding: "12px 24px",
  borderRadius: "8px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  fontSize: "16px",
  cursor: "pointer",
  transition: "box-shadow 120ms ease, background 120ms ease",
};

const baseSecondary = {
  margin: "10px",
  padding: "12px 24px",
  borderRadius: "8px",
  border: "1px solid #374151",
  background: "#fff",
  color: "#374151",
  fontSize: "16px",
  cursor: "pointer",
  transition: "box-shadow 120ms ease, background 120ms ease, border-color 120ms ease",
};

export default function Btn({
  variant = "primary",
  selected = false,
  style,
  children,
  ...props
}) {
  const [hover, setHover] = useState(false);
  const base = variant === "primary" ? basePrimary : baseSecondary;

  const activeStyle = selected
    ? { background: "#2563eb", color: "#fff" }
    : {};

  const hoverStyle =
    hover && !selected
      ? { background: "#2563eb", color: "#fff", boxShadow: "0 0 0 3px rgba(37,99,235,0.4)" }
      : {};

  return (
    <button
      {...props}
      style={{ ...base, ...activeStyle, ...hoverStyle, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}
