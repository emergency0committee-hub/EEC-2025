import React from "react";
import { Card } from "../../../components/Layout.jsx";

const ReadingCard = () => (
  <Card style={{ marginBottom: 12, padding: 16 }}>
    <h3 style={{ marginTop: 0, marginBottom: 6, color: "#111827" }}>Your Results Roadmap</h3>

    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block", marginTop: 5 }} />
        <div style={{ marginTop: 0 }}>
          <strong>RIASEC</strong> - Read your top letters; higher bars mean stronger fit. Aim clubs, courses, and projects at these.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block", marginTop: 5 }} />
        <div style={{ marginTop: 0 }}>
          <strong>Occupations</strong> - Each bar is a fit score (0-100%). Start with the highest roles; sample or shadow one soon.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block", marginTop: 5 }} />
        <div style={{ marginTop: 0 }}>
          <strong>Pillars</strong> - DISC, Bloom, and SDG cards show how you work, think, and which causes resonate. Use them to choose teams, tasks, and impact areas.
        </div>
      </div>
    </div>
  </Card>
);

export default ReadingCard;
