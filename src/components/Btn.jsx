import React from "react";

export default function Btn({ children, onClick, variant = "primary", style = {}, ...props }) {
  const baseStyle = {
    padding: "8px 16px",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  };

  const variants = {
    primary: { background: "#3b82f6", color: "white" },
    secondary: { background: "#f3f4f6", color: "#374151" },
    back: { background: "#ef4444", color: "white" },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
