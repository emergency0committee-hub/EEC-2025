import React from "react";
import logo from "../../../assets/logo.png";

export default function HeaderCard({
  title = "Career Guidance Report",
  logoSrc = logo,
}) {
  return (
    <div
      className="card avoid-break"
      style={{
        padding: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, color: "#111827" }}>{title}</h1>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="Logo"
          style={{ height: 48, width: "auto", objectFit: "contain" }}
        />
      ) : null}
    </div>
  );
}
