import React from "react";
import PropTypes from "prop-types";

export default function BarRow({
  label,
  percent,
  color = "#2563eb",
  subtitle,
  chipColor,
}) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="avoid-break" style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#374151",
          marginBottom: 4,
          gap: 16,
          alignItems: "flex-start",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
          colorAdjust: "exact",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {chipColor ? (
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                marginTop: 3,
                borderRadius: 3,
                background: chipColor,
                display: "inline-block",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
                colorAdjust: "exact",
              }}
            />
          ) : null}
          <div>
            <div style={{ fontWeight: 600, color: "#111827" }}>{label}</div>
            {subtitle ? (
              <div style={{ fontSize: 11, color: "#6b7280" }}>{subtitle}</div>
            ) : null}
          </div>
        </div>
        <span>{Math.round(safePercent)}%</span>
      </div>
      <div
        style={{
          height: 10,
          background: "#f3f4f6",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
          colorAdjust: "exact",
        }}
      >
        <div
          style={{
            width: `${safePercent}%`,
            height: "100%",
            background: color,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
            colorAdjust: "exact",
          }}
        />
      </div>
    </div>
  );
}

BarRow.propTypes = {
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  percent: PropTypes.number.isRequired,
  color: PropTypes.string,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  chipColor: PropTypes.string,
};
