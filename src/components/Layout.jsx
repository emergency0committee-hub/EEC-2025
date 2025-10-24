import React from "react";

export function PageWrap({ children }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {children}
    </div>
  );
}

export function HeaderBar({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {right}
    </div>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

export function ProgressBar({ value, max }) {
  return (
    <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 4 }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 4 }} />
    </div>
  );
}
