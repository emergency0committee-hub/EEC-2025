// src/components/Layout.jsx
import React from "react";

export const PageWrap = ({ children }) => (
  <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>{children}</div>
);

export const HeaderBar = ({ title, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
    <h2 style={{ margin: 0 }}>{title}</h2>
    {right}
  </div>
);

export const Card = ({ children }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
    {children}
  </div>
);

export const Field = ({ label, value, onChange, placeholder, invalid }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={{ marginBottom: 4 }}>{label}</label>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: "8px 12px",
        borderRadius: 6,
        border: `1px solid ${invalid ? "#dc2626" : "#d1d5db"}`,
      }}
    />
  </div>
);

export const ProgressBar = ({ value }) => (
  <div style={{ width: "100%", background: "#e5e7eb", height: 10, borderRadius: 5 }}>
    <div
      style={{
        width: `${value}%`,
        background: "#2563eb",
        height: "100%",
        borderRadius: 5,
        transition: "width 200ms ease",
      }}
    />
  </div>
);
