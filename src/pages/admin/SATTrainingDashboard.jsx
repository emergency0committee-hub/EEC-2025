// src/pages/admin/SATTrainingDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import { supabase } from "../../lib/supabase.js";
import Btn from "../../components/Btn.jsx";

export default function SATTrainingDashboard({ onNavigate }) {
  SATTrainingDashboard.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const liveHomework = useMemo(() => {
    const activeStatuses = new Set(['active', 'in_progress']);
    const list = rows.filter((row) => {
      const kind = String(row?.kind || '').toLowerCase();
      if (kind !== 'homework') return false;
      const status = String(row?.status || '').toLowerCase();
      return activeStatuses.has(status);
    });
    list.sort((a, b) => {
      const hbA = new Date((a?.meta?.session?.lastHeartbeat) || a?.ts || 0).getTime();
      const hbB = new Date((b?.meta?.session?.lastHeartbeat) || b?.ts || 0).getTime();
      return hbB - hbA;
    });
    return list;
  }, [rows]);

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

  useEffect(() => {
    let cancelled = false;
    const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('ts', { ascending: false })
          .limit(500);
        if (!cancelled && !error && Array.isArray(data)) {
          setRows(data);
        }
      } catch (err) {
        console.warn('sat training poll', err);
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);


  const deleteTrainingRow = async (row) => {
    if (!row) return;
    const ok = window.confirm(`Delete this training submission by ${row.user_email || 'student'}?`);
    if (!ok) return;
    setDeletingRowId(row.id || null);
    try {
      const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
      const { error } = await supabase.from(table).delete().eq('id', row.id);
      if (error) throw error;
      setRows((list) => list.filter((x) => x.id !== row.id));
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to delete');
    } finally {
      setDeletingRowId(null);
    }
  };

  const openView = (row) => setViewRow(row || null);
  const closeView = () => setViewRow(null);


  const fmt = (iso, time = false) => {
    if (!iso) return "--";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "--";
    return time
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString();
  };
  const fmtRelative = (iso) => {
    if (!iso) return "--";
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "--";
    const diffSec = Math.max(0, (Date.now() - value.getTime()) / 1000);
    if (diffSec < 45) return "Just now";
    if (diffSec < 90) return "1 min ago";
    if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
    if (diffSec < 7200) return "1 hr ago";
    if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr ago`;
    const days = Math.round(diffSec / 86400);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };
  const fmtDur = (sec) => {
    const value = Number(sec);
    if (!Number.isFinite(value) || value < 0) return "--";
    const mm = Math.floor(value / 60).toString().padStart(2, "0");
    const ss = Math.floor(value % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <PageWrap>
      <HeaderBar title="SAT Training Analytics" />

      {/* Class assignment tool */}
      <Card>
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #c7d2fe',
            background: '#eef2ff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#4338ca' }}>Live Homework Monitor</h3>
            <span style={{ fontWeight: 600, color: '#4338ca' }}>{liveHomework.length ? `${liveHomework.length} active` : 'No active sessions'}</span>
          </div>
          {liveHomework.length === 0 ? (
            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>No students are working on homework right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {liveHomework.map((row) => {
                const session = row?.meta && typeof row.meta === 'object' && row.meta.session && typeof row.meta.session === 'object' ? row.meta.session : {};
                const lastHeartbeat = session.lastHeartbeat || row.ts;
                const elapsedSec = Number.isFinite(Number(session.lastElapsed)) ? Number(session.lastElapsed) : Number(row?.elapsed_sec || 0);
                const remainingSec = Number.isFinite(Number(session.estimatedRemaining)) ? Math.max(0, Math.round(Number(session.estimatedRemaining))) : null;
                return (
                  <div
                    key={row.id || `${row.user_email || 'anon'}_${row.ts || Math.random()}`}
                    style={{
                      background: '#fff',
                      border: '1px solid #dbeafe',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'grid',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{row.user_email || 'Unknown student'}</span>
                      <span style={{ color: '#4338ca', fontSize: 12 }}>{fmtRelative(lastHeartbeat)} - {fmt(lastHeartbeat, true)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#4f46e5', fontSize: 13 }}>
                      {row.class_name ? <span>Class: <strong>{row.class_name}</strong></span> : null}
                      {row.unit ? <span>Unit: <strong>{row.unit}</strong></span> : null}
                      {row.lesson ? <span>Lesson: <strong>{row.lesson}</strong></span> : null}
                      <span>Elapsed: <strong>{fmtDur(elapsedSec)}</strong></span>
                      {Number.isFinite(remainingSec) && remainingSec != null ? (<span>Remaining: <strong>{fmtDur(remainingSec)}</strong></span>) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                  <th style={{ padding: 10, textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rw = r.summary?.rw; const m = r.summary?.math; let score = '--';
                  if (rw?.total || rw?.correct) score = `${rw.correct||0}/${rw.total||0}`;
                  if (m?.total || m?.correct) score = `${m.correct||0}/${m.total||0}`;
                  return (
                    <tr key={`${r.id || ''}_${r.ts}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 10 }}>{fmt(r.ts)}</td>
                      <td style={{ padding: 10 }}>{fmt(r.ts, true)}</td>
                      <td style={{ padding: 10 }}>{r.user_email || '--'}</td>
                      <td style={{ padding: 10 }}>{r.kind || '--'}</td>
                      <td style={{ padding: 10 }}>{r.section || '--'}</td>
                      <td style={{ padding: 10 }}>{r.unit || r.lesson || '--'}</td>
                      <td style={{ padding: 10 }}>{score}</td>
                      <td style={{ padding: 10 }}>{fmtDur(Number(r.elapsed_sec || 0))}</td>
                      <td style={{ padding: 10 }}>
                        <button type="button" onClick={() => openView(r)} title="View answers" style={{ border:'1px solid #d1d5db', background:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer', marginRight:6 }}>View</button>
                        <button type="button" onClick={() => deleteTrainingRow(r)} title="Delete submission" style={{ border:'none', background:'transparent', cursor:'pointer', padding:6, borderRadius:6 }} onMouseEnter={(e)=> e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'} disabled={deletingRowId === r.id}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                            <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </td>
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
    
      {viewRow && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={closeView}>
          <div onClick={(e)=>e.stopPropagation()} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, width:'min(720px,92vw)', maxHeight:'80vh', overflowY:'auto', padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ marginTop:0 }}>Submission Details</h3>
              <button onClick={closeView} style={{ border:'1px solid #d1d5db', background:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>Close</button>
            </div>
            <div style={{ color:'#6b7280', marginBottom:8 }}>User: {viewRow.user_email || '--'} �- Date: {fmt(viewRow.ts)} {fmt(viewRow.ts,true)}</div>
            <div style={{ color:'#6b7280', marginBottom:8 }}>Duration: {fmtDur(Number(viewRow.elapsed_sec || 0))}</div>
            <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:10 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    <th style={{ padding:8, textAlign:'left' }}>Question</th>
                    <th style={{ padding:8, textAlign:'left' }}>Selected</th>
                    <th style={{ padding:8, textAlign:'left' }}>Correct</th>
                    <th style={{ padding:8, textAlign:'left' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const a = viewRow.answers || {};
                    const choices = a.choices || a.custom || a[viewRow.unit] || a[Object.keys(a)[0]] || {};
                    const times = a.times || {};
                    const correct = a.correct || {};
                    const keys = Object.keys(choices || {});
                    keys.sort((x,y)=>{
                      const nx = parseInt(String(x).replace(/\D+/g,''),10); const ny = parseInt(String(y).replace(/\D+/g,''),10);
                      if (Number.isFinite(nx) && Number.isFinite(ny)) return nx - ny;
                      return String(x).localeCompare(String(y));
                    });
                    return keys.map(k => (
                      <tr key={k} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:8 }}>{k}</td>
                        <td style={{ padding:8 }}>{choices[k] ?? '--'}</td>
                        <td style={{ padding:8, color: (correct[k] && choices[k]) ? (String(choices[k])===String(correct[k]) ? '#16a34a' : '#ef4444') : '#6b7280' }}>{(correct[k] && choices[k]) ? (String(choices[k])===String(correct[k]) ? 'OK' : ('Wrong (ans: ' + correct[k] + ')')) : '--'}</td>
                        <td style={{ padding:8 }}>{fmtDur(Number(times[k] || 0))}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
