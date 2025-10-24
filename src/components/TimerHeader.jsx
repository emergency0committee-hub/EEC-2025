import React from "react";

export default function TimerHeader({ label }) {
  return (
    <div style={{ fontSize: 18, fontWeight: "bold", color: "#374151" }}>
      {label}
    </div>
  );
}
