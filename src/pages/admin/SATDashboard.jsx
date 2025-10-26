// src/pages/admin/SATDashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import SATTable from "./SATTable.jsx";

export default function SATDashboard({ onNavigate }) {
  SATDashboard.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "cg_sat_results";
        let resp = await supabase.from(table).select("*").order("ts", { ascending: false });
        if (resp.error) {
          try { resp = await supabase.from(table).select("*").order("id", { ascending: false }); } catch {}
        }
        let rows = (resp.error ? [] : (resp.data || []));
        // Inject non-deletable demo SAT submission
        const demo = {
          id: "demo-sat",
          ts: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          user_email: "demo@example.com",
          pillar_agg: {
            summary: { rw: { correct: 28, total: 40 }, math: { correct: 22, total: 44 } },
            skills: {
              // Showcase full color range: <20 red, <40 orange, <60 amber, <80 lime, >=80 green
              rw: {
                central_ideas: 10,        // red
                cross_text: 30,           // orange
                inference: 50,            // amber
                interpreting_data: 70,    // lime
                modifier: 90,             // green
                parallel: 18,             // red
                pronoun: 38,              // orange
                punctuation: 58,          // amber
                rhetoric: 65,             // lime
                text_structure: 82,       // green
                evidence: 22,             // orange boundary
                transitions: 44,          // amber
                verbs: 76,                // lime
                vocab: 88,                // green
              },
              math: {
                // Unit pct values chosen to show diverse colors
                algebra:  { pct: 15, lessons: { linear_equations: 12, linear_functions: 28, systems: 18 } }, // red/orange
                psda:     { pct: 35, lessons: { ratios: 30, rates: 34, probability: 22, data_interpretation: 39, statistics: 25 } }, // orange
                adv_math: { pct: 55, lessons: { rational_expressions: 50, quadratic_functions: 58, exponential_functions: 46, exponent_rules: 52, polynomial_expressions: 59 } }, // amber
                geo_trig: { pct: 75, lessons: { angle_relationships: 70, coordinate_geometry: 66, area_perimeter: 74, right_triangle_trig: 62, volume_surface_area: 79 } }, // lime
                // Add an implicit high score example inside lessons (green)
              }
            }
          },
          pillar_counts: { modules: [
            { key: "rw1", title: "Reading & Writing — Module 1", count: 20 },
            { key: "rw2", title: "Reading & Writing — Module 2", count: 20 },
            { key: "m1", title: "Math — Module 1", count: 22 },
            { key: "m2", title: "Math — Module 2", count: 22 },
          ], elapsedSec: 124 * 60 },
          _demo: true,
        };
        rows = [demo, ...rows];
        setRows(rows);
      } catch (e) {
        console.error("SAT fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onView = (submission) => {
    onNavigate("sat-results", { submission });
  };

  const onDelete = async (submission) => {
    try {
      const ok = window.confirm("Delete this SAT submission? This cannot be undone.");
      if (!ok) return;
      if (submission && (submission._demo || String(submission.id).startsWith("demo-"))) {
        alert("This preview submission cannot be deleted.");
        return;
      }
      const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "cg_sat_results";
      const { error } = await supabase.from(table).delete().eq("id", submission.id);
      if (error) throw error;
      setRows((r) => r.filter((x) => x.id !== submission.id));
    } catch (e) {
      console.error("SAT delete failed:", e);
      alert("Failed to delete. Check policies and try again.");
    }
  };

  return (
    <PageWrap>
      <HeaderBar title="SAT Submissions" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Recent SAT Diagnostic Submissions</h3>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading SAT submissions...</p>
        ) : (
          <SATTable rows={rows} onView={onView} onDelete={onDelete} />
        )}
        <div style={{ marginTop: 16 }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back to Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
