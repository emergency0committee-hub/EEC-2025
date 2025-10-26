// src/pages/sat/SATTraining.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";

export default function SATTraining({ onNavigate }) {
  SATTraining.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [tab, setTab] = useState("classwork"); // stream | classwork | people

  // Classroom-like seed data
  const streamPosts = useMemo(() => ([
    { id: "p1", title: "Welcome to SAT Training", body: "Use Classwork to pick a topic. Practice sets are untimed.", ts: new Date().toLocaleString() },
    { id: "p2", title: "Tip", body: "Focus on 2–3 skills per session for best results.", ts: new Date().toLocaleString() },
  ]), []);

  const classwork = useMemo(() => ([
    {
      topic: "Reading & Writing",
      items: [
        { id: "rw_central", title: "Central Ideas & Details", desc: "Identify main ideas and key details.", action: () => onNavigate("sat-exam", { practice: { section: "RW", skill: "central_ideas" } }) },
        { id: "rw_transitions", title: "Transitions", desc: "Choose words/phrases to improve logical flow.", action: () => onNavigate("sat-exam", { practice: { section: "RW", skill: "transitions" } }) },
        { id: "rw_punct", title: "Punctuation", desc: "Commas, semicolons, dashes, and colons.", action: () => onNavigate("sat-exam", { practice: { section: "RW", skill: "punctuation" } }) },
      ],
    },
    {
      topic: "Math",
      items: [
        { id: "m_algebra", title: "Algebra", desc: "Linear equations, functions, and systems.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "algebra" } }) },
        { id: "m_psda", title: "Problem Solving & Data Analysis", desc: "Ratios, percentages, probability, and data.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "psda" } }) },
        { id: "m_adv", title: "Advanced Math", desc: "Quadratics, exponentials, and polynomials.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "adv_math" } }) },
        { id: "m_geo", title: "Geometry & Trig", desc: "Angles, coordinate geometry, triangles, volume.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "geo_trig" } }) },
      ],
    },
  ]), [onNavigate]);

  const people = useMemo(() => ([
    { role: "Teacher", name: "Practice Bot" },
    { role: "Student", name: "You" },
  ]), []);

  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        border: "none",
        background: tab === id ? "#111827" : "#fff",
        color: tab === id ? "#fff" : "#374151",
        borderRadius: 999,
        padding: "8px 14px",
        cursor: "pointer",
      }}
    >{children}</button>
  );

  return (
    <PageWrap>
      {/* Google Classroom-like banner */}
      <div style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
        color: "#fff",
        padding: 20,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>SAT Training</div>
        <div style={{ opacity: 0.9 }}>Practice by section and skill</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <TabButton id="stream">Stream</TabButton>
          <TabButton id="classwork">Classwork</TabButton>
          <TabButton id="people">People</TabButton>
        </div>
      </div>

      {/* STREAM */}
      {tab === "stream" && (
        <div style={{ display: "grid", gap: 12 }}>
          {streamPosts.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ marginTop: 0 }}>{p.title}</h3>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{p.ts}</div>
              </div>
              <p style={{ color: "#374151" }}>{p.body}</p>
            </Card>
          ))}
          <div>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </div>
      )}

      {/* CLASSWORK */}
      {tab === "classwork" && (
        <div style={{ display: "grid", gap: 16 }}>
          {classwork.map((section) => (
            <Card key={section.topic}>
              <h3 style={{ marginTop: 0 }}>{section.topic}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {section.items.map((it) => (
                  <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{it.title}</div>
                    <div style={{ color: "#6b7280", fontSize: 13, margin: "6px 0 10px" }}>{it.desc}</div>
                    <Btn variant="secondary" onClick={it.action}>Open Practice</Btn>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <div>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </div>
      )}

      {/* PEOPLE */}
      {tab === "people" && (
        <Card>
          <h3 style={{ marginTop: 0 }}>People</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {people.map((p, i) => (
              <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#6b7280" }}>{p.role}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      )}
    </PageWrap>
  );
}

