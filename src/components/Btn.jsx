import React from "react";
import PropTypes from "prop-types";

export default function Btn({ children, onClick, variant = "primary", style = {}, ...props }) {
  Btn.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(["primary", "secondary", "back"]),
    style: PropTypes.object,
  };

  const baseStyle = {
    padding: "12px 20px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      ":hover": { transform: "translateY(-1px)", boxShadow: "0 4px 8px rgba(102, 126, 234, 0.3)" }
    },
    secondary: {
      background: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      ":hover": { background: "#f9fafb", transform: "translateY(-1px)", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }
    },
    back: {
      background: "transparent",
      color: "#6b7280",
      boxShadow: "none",
      ":hover": { color: "#374151", background: "#f9fafb" }
    },
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
