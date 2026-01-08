// src/components/DateTimePicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (value) => String(value).padStart(2, "0");

const formatYmd = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const parseYmd = (value) => {
  if (!value || typeof value !== "string") return null;
  const [y, m, d] = value.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

const normalizeBound = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  if (typeof value === "string") {
    const parsed = parseYmd(value) || new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return null;
};

const parseValue = (value, mode) => {
  if (!value || typeof value !== "string") return { date: null, time: "" };
  if (mode === "date") {
    return { date: parseYmd(value), time: "" };
  }
  const [datePart, timePartRaw] = value.split("T");
  const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
  return { date: parseYmd(datePart), time: timePart };
};

const buildValue = (date, time, mode, defaultTime) => {
  const ymd = formatYmd(date);
  if (!ymd) return "";
  if (mode === "date") return ymd;
  const timePart = time || defaultTime || "09:00";
  return `${ymd}T${timePart}`;
};

export default function DateTimePicker({
  label,
  value,
  onChange,
  mode = "date",
  placeholder,
  disabled = false,
  required = false,
  name,
  inputStyle,
  wrapperStyle,
  maxDate,
  minDate,
  clearable = true,
  defaultTime = "09:00",
}) {
  DateTimePicker.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(["date", "datetime"]),
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    required: PropTypes.bool,
    name: PropTypes.string,
    inputStyle: PropTypes.object,
    wrapperStyle: PropTypes.object,
    maxDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    minDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    clearable: PropTypes.bool,
    defaultTime: PropTypes.string,
  };

  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseValue(value, mode), [value, mode]);
  const [view, setView] = useState(() => {
    const base = parsed.date || new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const minBound = useMemo(() => normalizeBound(minDate), [minDate]);
  const maxBound = useMemo(() => normalizeBound(maxDate), [maxDate]);
  const selectedDate = parsed.date;
  const selectedTime = parsed.time || defaultTime;

  useEffect(() => {
    if (!open) return undefined;
    const base = selectedDate || new Date();
    setView({ year: base.getFullYear(), month: base.getMonth() });
    const onClick = (event) => {
      if (
        popoverRef.current &&
        popoverRef.current.contains(event.target)
      ) {
        return;
      }
      if (anchorRef.current && anchorRef.current.contains(event.target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, selectedDate]);

  const isDisabledDate = (date) => {
    if (!date) return true;
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    if (minBound && check < minBound) return true;
    if (maxBound && check > maxBound) return true;
    return false;
  };

  const handleSelectDate = (date) => {
    if (!date || isDisabledDate(date)) return;
    onChange(buildValue(date, selectedTime, mode, defaultTime));
    if (mode === "date") {
      setOpen(false);
    }
  };

  const handleTimeChange = (nextTime) => {
    const baseDate = selectedDate || new Date();
    onChange(buildValue(baseDate, nextTime, mode, defaultTime));
  };

  const defaultInputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
    background: disabled ? "#f9fafb" : "#ffffff",
    color: disabled ? "#9ca3af" : "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  };

  const inputBoxStyle = { ...defaultInputStyle, ...(inputStyle || {}) };

  return (
    <div style={{ display: "grid", gap: 6, ...wrapperStyle }}>
      {label && <span style={{ fontWeight: 600 }}>{label}</span>}
      <div ref={anchorRef} style={{ position: "relative" }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          style={inputBoxStyle}
          aria-label={label || "Choose date"}
          name={name}
        >
          <span style={{ color: value ? "#111827" : "#9ca3af" }}>
            {value || placeholder || (mode === "datetime" ? "YYYY-MM-DD HH:MM" : "YYYY-MM-DD")}
          </span>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div
            ref={popoverRef}
            style={{
              position: "absolute",
              top: "100%",
              marginTop: 8,
              zIndex: 9999,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 12,
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
              minWidth: mode === "datetime" ? 420 : 280,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
              <div style={{ flex: "1 1 auto", minWidth: 240 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setView((prev) => {
                        const nextMonth = prev.month - 1;
                        if (nextMonth < 0) return { month: 11, year: prev.year - 1 };
                        return { month: nextMonth, year: prev.year };
                      })
                    }
                    style={navButtonStyle}
                  >
                    {"<"}
                  </button>
                  <div style={{ fontWeight: 600, color: "#111827" }}>
                    {new Date(view.year, view.month, 1).toLocaleString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setView((prev) => {
                        const nextMonth = prev.month + 1;
                        if (nextMonth > 11) return { month: 0, year: prev.year + 1 };
                        return { month: nextMonth, year: prev.year };
                      })
                    }
                    style={navButtonStyle}
                  >
                    {">"}
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 6,
                    marginBottom: 8,
                    fontSize: 11,
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  {weekdayLabels.map((labelText) => (
                    <div key={labelText} style={{ textAlign: "center" }}>
                      {labelText}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {(() => {
                    const cells = [];
                    const first = new Date(view.year, view.month, 1);
                    const startDay = first.getDay();
                    const totalCells = 42;
                    const selectedKey = selectedDate ? formatYmd(selectedDate) : "";
                    for (let i = 0; i < totalCells; i += 1) {
                      const dayOffset = i - startDay + 1;
                      const cellDate = new Date(view.year, view.month, dayOffset);
                      const isCurrentMonth = cellDate.getMonth() === view.month;
                      const key = formatYmd(cellDate);
                      const isSelected = key && key === selectedKey;
                      const isDisabled = !isCurrentMonth || isDisabledDate(cellDate);
                      cells.push(
                        <button
                          key={`${view.year}-${view.month}-${i}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleSelectDate(cellDate)}
                          style={{
                            border: isSelected ? "2px solid #2563eb" : "1px solid #e5e7eb",
                            background: isSelected ? "#dbeafe" : "#ffffff",
                            color: isCurrentMonth ? "#111827" : "#9ca3af",
                            borderRadius: 10,
                            padding: "8px 0",
                            fontSize: 12,
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            opacity: isDisabled ? 0.4 : 1,
                          }}
                        >
                          {cellDate.getDate()}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
              {mode === "datetime" && (
                <div style={{ width: 120, display: "grid", gap: 8, alignContent: "start" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Time</span>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 13,
                    }}
                  />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              {clearable && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  style={actionButtonStyle}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const next = buildValue(now, selectedTime, mode, defaultTime);
                  onChange(next);
                }}
                style={actionButtonStyle}
              >
                Today
              </button>
            </div>
            {required && (
              <div style={{ marginTop: 8, color: "#6b7280", fontSize: 11 }}>
                Required field
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const navButtonStyle = {
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 8,
  width: 32,
  height: 32,
  cursor: "pointer",
  fontSize: 16,
  lineHeight: "28px",
};

const actionButtonStyle = {
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};
