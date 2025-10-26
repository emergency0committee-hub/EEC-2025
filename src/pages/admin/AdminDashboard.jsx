// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable2.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const envTable = import.meta.env.VITE_SUBMISSIONS_TABLE;
        // Prefer new table, then env override, then old table as fallback to show historic rows
        const candidates = Array.from(new Set([
          "cg_results",
          envTable,
          "cg_submissions",
        ].filter(Boolean)));
        try { console.info("Admin fetch candidates:", candidates); } catch {}
        let rows = [];
        let lastErr = null;
        for (const table of candidates) {
          try {
            let resp = await supabase.from(table).select("*").order("ts", { ascending: false });
            if (resp.error) {
              // Retry ordering by id if ts is missing
              try {
                resp = await supabase.from(table).select("*").order("id", { ascending: false });
              } catch (_) {}
            }
            if (resp.error) { lastErr = resp.error; continue; }
            rows = Array.isArray(resp.data) ? resp.data : [];
            if (rows.length) {
              break;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        if (!rows.length && lastErr) {
          console.warn("No submissions found in configured or legacy tables.", lastErr);
        }

        // Inject a non-deletable demo submission for preview
        const demoTs = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
        const demo = {
          id: "demo-career",
          ts: demoTs,
          riasec_code: "RIA",
          participant: {
            name: "Demo Student",
            email: "demo@example.com",
            school: "Preview Academy",
            started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            finished_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          },
          radar_data: [
            { code: "R", score: 68 }, { code: "I", score: 72 }, { code: "A", score: 55 },
            { code: "S", score: 61 }, { code: "E", score: 49 }, { code: "C", score: 58 },
          ],
          area_percents: [
            { area: "Science & Tech", code: "I", percent: 72 },
            { area: "Hands-on", code: "R", percent: 68 },
            { area: "Arts", code: "A", percent: 55 },
          ],
          pillar_agg: { disc: {}, bloom: {}, sdg: {} },
          pillar_counts: { discCount: {}, bloomCount: {}, sdgCount: {} },
          _demo: true,
        };
        const finalRows = [demo, ...(rows || [])];
        setSubmissions(finalRows);
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const handleViewSubmission = (submission) => {
    // Navigate to results with submission data
    onNavigate("results", { submission });
  };

  const handleDeleteSubmission = async (submission) => {
    try {
      const ok = window.confirm("Delete this submission? This cannot be undone.");
      if (!ok) return;
      if (submission && (submission._demo || String(submission.id).startsWith("demo-"))) {
        alert("This preview submission cannot be deleted.");
        return;
      }
      const envTable = import.meta.env.VITE_SUBMISSIONS_TABLE;
      const candidates = Array.from(new Set([
        "cg_results",
        envTable,
        "cg_submissions",
      ].filter(Boolean)));
      let deleted = false;
      let lastErr = null;
      for (const table of candidates) {
        try {
          const { error } = await supabase.from(table).delete().eq("id", submission.id);
          if (!error) { deleted = true; break; }
          lastErr = error;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!deleted) throw lastErr || new Error("Delete failed");
      setSubmissions((rows) => rows.filter((r) => r.id !== submission.id));
    } catch (e) {
      console.error("Failed to delete submission:", e);
      const msg = e?.message || String(e);
      alert(`Failed to delete submission. ${msg}`);
    }
  };


  return (
    <PageWrap>
      <HeaderBar title="Test Submissions" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Recent Test Submissions</h3>
        <AdminLegend />
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading test submissions...</p>
        ) : (
          <AdminTable submissions={submissions} onViewSubmission={handleViewSubmission} onDeleteSubmission={handleDeleteSubmission} />
        )}
        <div style={{ marginTop: 16 }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back to Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}


