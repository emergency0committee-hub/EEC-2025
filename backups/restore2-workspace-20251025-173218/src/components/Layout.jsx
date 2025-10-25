import React from "react";
import PropTypes from "prop-types";

export function PageWrap({ children }) {
  PageWrap.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {children}
    </div>
  );
}

export function HeaderBar({ title, right }) {
  HeaderBar.propTypes = {
    title: PropTypes.string.isRequired,
    right: PropTypes.node,
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {right}
    </div>
  );
}

export function Card({ children, style = {} }) {
  Card.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
  };

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
      background: "#ffffff",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      ...style
    }}>
      {children}
    </div>
  );
}

export function Field({ label, value, onChange, placeholder }) {
  Field.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    children: PropTypes.node,
  };

  if (value !== undefined && onChange) {
    return (
      <div style={{ marginBottom: 16 }}>
        {label && <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>{label}</label>}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            background: "#ffffff",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#d1d5db";
            e.target.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

export function ProgressBar({ value, max }) {
  ProgressBar.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
  };

  return (
    <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 4 }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 4 }} />
    </div>
  );
}
