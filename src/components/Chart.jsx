// src/components/Chart.jsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

/** Theme colors as requested:
 * E blue , A orange , R red, I turquoise, S green, C purple
 */
export const THEME_COLORS = {
  E: "#3b82f6", // blue
  A: "#f59e0b", // orange
  R: "#ef4444", // red
  I: "#14b8a6", // turquoise
  S: "#22c55e", // green
  C: "#8b5cf6", // purple
};

const THEME_LABEL = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

/* ---------------------------------
   RADAR: filled polygon (no dots)
---------------------------------- */
export function RadarBlock({ data = [] }) {
  // Guard + normalize
  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .filter((d) => d && d.code)
        .map((d) => ({
          code: d.code,
          label: d.code,
          score: Math.max(0, Math.min(100, Number(d.score ?? 0))),
        })),
    [data]
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>RIASEC PROFILE</h3>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
        Filled polygon showing your overall balance across themes.
      </p>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="label" />
            <Radar
              dataKey="score"
              stroke="#1f2937"
              fill="#93c5fd"
              fillOpacity={0.35}
              dot={false}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   THEME BARS: horizontal bars, sorted high → low, colors
   (bar thickness matches Basic Interest bars = 10px)
-------------------------------------------------------- */
export function ThemeBarsBlock({ data = [] }) {
  const chartData = useMemo(() => {
    const rows = (Array.isArray(data) ? data : [])
      .filter((d) => d && d.code)
      .map((d) => ({
        code: d.code,
        label: `${THEME_LABEL[d.code] || d.code} (${d.code})`,
        value: Math.round(Math.max(0, Math.min(100, Number(d.score ?? 0)))),
      }));
    // sort high → low
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [data]);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>RIASEC PERCENTAGES</h3>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
        Sorted from your strongest to weakest theme.
      </p>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
            barSize={10}
            barCategoryGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={200}
              tick={{ fontSize: 12, fill: "#374151" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, "Score"]}
              labelStyle={{ color: "#111827" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
              }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
              {chartData.map((row, idx) => (
                <Cell key={idx} fill={THEME_COLORS[row.code] || "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default {};
