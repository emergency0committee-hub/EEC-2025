// src/components/TimerHeader.jsx
import React from "react";

export default function TimerHeader({ label }) {
  return (
    <div style={{
      padding: "6px 12px",
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      fontSize: 14,
    }}>
      {label}
    </div>
  );
}
