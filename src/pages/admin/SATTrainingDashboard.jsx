// src/pages/admin/SATTrainingDashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import { supabase } from "../../lib/supabase.js";
import Btn from "../../components/Btn.jsx";

export default function SATTrainingDashboard({ onNavigate }) {
  SATTrainingDashboard.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        let resp = await supabase.from(table).select("*").order("ts", { ascending: false });
        if (resp.error) { try { resp = await supabase.from(table).select("*").order("id", { ascending: false }); } catch {}
        }
        setRows(resp.error ? [] : (resp.data || []));
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, []);

  const fmt = (iso, time=false) => !iso ? "—" : (time ? new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date(iso).toLocaleDateString());
  const fmtDur = (sec) => {
    if (!Number.isFinite(sec)) return "—";
    const mm = Math.floor(sec/60).toString().padStart(2,'0');
    const ss = Math.floor(sec%60).toString().padStart(2,'0');
    return `${mm}:${ss}`;
  };

  return (
    <PageWrap>
      <HeaderBar title="SAT Training Analytics" />
      <Card>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No training activity found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Time</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>User</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Kind</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Section</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Unit/Lesson</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Score</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rw = r.summary?.rw; const m = r.summary?.math; let score = '—';
                  if (rw?.total || rw?.correct) score = `${rw.correct||0}/${rw.total||0}`;
                  if (m?.total || m?.correct) score = `${m.correct||0}/${m.total||0}`;
                  return (
                    <tr key={`${r.id || ''}_${r.ts}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 10 }}>{fmt(r.ts)}</td>
                      <td style={{ padding: 10 }}>{fmt(r.ts, true)}</td>
                      <td style={{ padding: 10 }}>{r.user_email || '—'}</td>
                      <td style={{ padding: 10 }}>{r.kind || '—'}</td>
                      <td style={{ padding: 10 }}>{r.section || '—'}</td>
                      <td style={{ padding: 10 }}>{r.unit || r.lesson || '—'}</td>
                      <td style={{ padding: 10 }}>{score}</td>
                      <td style={{ padding: 10 }}>{fmtDur(Number(r.elapsed_sec || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Btn variant="back" onClick={() => onNavigate('home')}>Back Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}

