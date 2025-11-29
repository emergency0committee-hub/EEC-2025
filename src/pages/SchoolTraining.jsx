import React, { useMemo, useState } from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

const overviewStats = [
  { label: "Active Schools", value: 7 },
  { label: "Live Cohorts", value: 18 },
  { label: "Students Enrolled", value: 524 },
  { label: "Sessions This Week", value: 42 },
];

const sampleSessions = [
  {
    school: "Canada Educational Center",
    title: "Career Awareness Workshop",
    facilitator: "Ms. Rania Itani",
    nextDate: "Dec 03, 2025",
    focus: "Interest exploration & aptitude warm-ups",
    roster: 38,
  },
  {
    school: "Dar En Nour – Btouratige",
    title: "Leadership & SDG Sprint",
    facilitator: "Mr. Khaled Osman",
    nextDate: "Dec 05, 2025",
    focus: "DISC + UN SDG challenge briefing",
    roster: 27,
  },
  {
    school: "Al-Jinan International School",
    title: "Portfolio Coaching Lab",
    facilitator: "Ms. Farah Mikati",
    nextDate: "Dec 09, 2025",
    focus: "Bloom levels in reflective essays",
    roster: 44,
  },
];

const resourceLibrary = [
  {
    title: "Career Launch Deck",
    type: "Slides",
    duration: "20 min briefing",
    description: "RIASEC primer, warm-up prompts, and mini-debrief checklist.",
  },
  {
    title: "SDG Ideation Sprint",
    type: "Facilitator Guide",
    duration: "45 min workshop",
    description: "Step-by-step flow to connect DISC teams with SDG challenges.",
  },
  {
    title: "Reflection Journal Pack",
    type: "PDF",
    duration: "Self-paced",
    description: "Bloom-aligned prompts plus rubric for evidence collection.",
  },
];

const schoolFilters = ["All Schools", ...new Set(sampleSessions.map((s) => s.school))];

export default function SchoolTraining() {
  const [selectedSchool, setSelectedSchool] = useState("All Schools");

  const visibleSessions = useMemo(() => {
    if (selectedSchool === "All Schools") return sampleSessions;
    return sampleSessions.filter((session) => session.school === selectedSchool);
  }, [selectedSchool]);

  return (
    <PageWrap>
      <HeaderBar
        title="School Training"
        subtitle="Coordinate on-campus programs, sessions, and facilitator resources."
        actions={
          <Btn
            variant="secondary"
            to="/"
            style={{ minWidth: 120 }}
          >
            Back Home
          </Btn>
        }
      />

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {overviewStats.map((stat) => (
          <Card key={stat.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "#64748b" }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{stat.value}</div>
          </Card>
        ))}
      </section>

      <Card style={{ marginTop: 24, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Upcoming Sessions</h2>
            <p style={{ margin: "4px 0 0", color: "#475569" }}>Filter by school and review the next coaching touchpoints.</p>
          </div>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5f5",
              minWidth: 220,
            }}
          >
            {schoolFilters.map((school) => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          {visibleSessions.map((session) => (
            <Card key={`${session.school}-${session.title}`} style={{ padding: 16, border: "1px solid #dbeafe" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5 }}>{session.school}</div>
                  <h3 style={{ margin: "4px 0" }}>{session.title}</h3>
                  <p style={{ margin: 0, color: "#475569" }}>{session.focus}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>{session.nextDate}</div>
                  <div style={{ fontSize: 14, color: "#475569" }}>Facilitator: {session.facilitator}</div>
                  <div style={{ fontSize: 14, color: "#475569" }}>Roster: {session.roster} students</div>
                </div>
              </div>
            </Card>
          ))}
          {!visibleSessions.length && (
            <Card style={{ padding: 16 }}>
              <p style={{ margin: 0, color: "#475569" }}>No sessions scheduled for this school yet.</p>
            </Card>
          )}
        </div>
      </Card>

      <Card style={{ marginTop: 24, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Resource Library</h2>
        <p style={{ margin: "4px 0 16px", color: "#475569" }}>Use the templates below to spin up quick workshops.</p>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {resourceLibrary.map((resource) => (
            <Card key={resource.title} style={{ padding: 16, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#0f172a" }}>{resource.type}</div>
              <h3 style={{ margin: "4px 0" }}>{resource.title}</h3>
              <div style={{ fontSize: 13, color: "#475569" }}>{resource.duration}</div>
              <p style={{ marginTop: 8, color: "#475569" }}>{resource.description}</p>
              <Btn variant="ghost" style={{ padding: "6px 0" }}>
                Preview
              </Btn>
            </Card>
          ))}
        </div>
      </Card>
    </PageWrap>
  );
}
