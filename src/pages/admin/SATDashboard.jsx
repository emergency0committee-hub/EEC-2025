// src/pages/admin/SATDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import AdminTable from "./AdminTable.jsx";
import LiveTestSessionsPanel from "../../components/LiveTestSessionsPanel.jsx";

export default function SATDashboard({ onNavigate }) {
  SATDashboard.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableSort, setTableSort] = useState("ts_desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const viewerRole = (currentUser?.role || "").toLowerCase();
  const canSeeLive = viewerRole === "admin";

  useEffect(() => {
    (async () => {
      try {
        const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "sat_diagnostic_submissions";
        let resp = await supabase
          .from(table)
          .select("*")
          .order("ts", { ascending: false });
        if (resp.error) {
          try { resp = await supabase.from(table).select("*").order("id", { ascending: false }); } catch {}
        }
        let rows = (resp.error ? [] : (resp.data || []));
        rows = rows.map((r) => ({
          ...r,
          ts: r.ts || r.created_at || null,
        }));
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
        const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "sat_diagnostic_submissions";
      const { error } = await supabase.from(table).delete().eq("id", submission.id);
      if (error) throw error;
      setRows((r) => r.filter((x) => x.id !== submission.id));
    } catch (e) {
      console.error("SAT delete failed:", e);
      alert("Failed to delete. Check policies and try again.");
    }
  };

  // Derived: sorted and paged submissions (name/school/time similar to career table)
  const getSchool = (submission) => {
    const p = submission?.participant || submission?.profile || {};
    return (p.school || "").trim().toLowerCase();
  };
  const sortedSubmissions = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const pa = a.participant || a.profile || {};
      const pb = b.participant || b.profile || {};
      const nameA = (pa.name || pa.email || a.user_email || "").toLowerCase();
      const nameB = (pb.name || pb.email || b.user_email || "").toLowerCase();
      const schoolA = getSchool(a);
      const schoolB = getSchool(b);
      const tsA = new Date(a.ts || a.created_at || pa.finished_at || pa.started_at || 0).getTime();
      const tsB = new Date(b.ts || b.created_at || pb.finished_at || pb.started_at || 0).getTime();
      if (tableSort === "school" || tableSort === "school_desc") {
        const cmp = schoolA.localeCompare(schoolB) || nameA.localeCompare(nameB);
        return tableSort === "school_desc" ? -cmp : cmp;
      }
      if (tableSort === "ts" || tableSort === "ts_desc") {
        const cmp = (Number.isFinite(tsA) ? tsA : 0) - (Number.isFinite(tsB) ? tsB : 0);
        return tableSort === "ts_desc" ? -cmp : cmp;
      }
      const cmp = nameA.localeCompare(nameB) || schoolA.localeCompare(schoolB);
      return tableSort === "name_desc" ? -cmp : cmp;
    });
    return list;
  }, [rows, tableSort]);
  const pagedSubmissions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedSubmissions.slice(start, start + PAGE_SIZE);
  }, [sortedSubmissions, page]);
  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [rows.length, tableSort]);

  return (
    <PageWrap>
      <HeaderBar title="SAT Submissions" right={null} />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent SAT Diagnostic Submissions</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn
              variant="primary"
              onClick={() =>
                onNavigate("sat-exam", {
                  preview: true,
                  practice: {
                    preview: true,
                    kind: "diagnostic",
                    title: "SAT Diagnostic Preview",
                  },
                })
              }
            >
              Preview Diagnostic
            </Btn>
          </div>
        </div>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Use the preview button to open the live SAT diagnostic without saving any results. This is helpful for testing question flow or demonstrating the exam experience.
        </p>
        {canSeeLive && (
          <LiveTestSessionsPanel
            testType="sat_diagnostic"
            title="Live SAT Diagnostic Sessions"
            description="Watch active SAT diagnostic sessions and manage them in real time."
          />
        )}
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading SAT submissions...</p>
        ) : sortedSubmissions.length > 0 ? (
          <>
            <AdminTable
              submissions={pagedSubmissions}
              onViewSubmission={onView}
              onDeleteSubmission={onDelete}
              onSort={setTableSort}
              sortKey={tableSort}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <Btn variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Btn>
              <span style={{ color: "#374151", fontSize: 13 }}>
                Page {page} of {totalPages}
              </span>
              <Btn
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Btn>
            </div>
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>No SAT submissions found.</p>
        )}
        <div style={{ marginTop: 16 }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back to Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
