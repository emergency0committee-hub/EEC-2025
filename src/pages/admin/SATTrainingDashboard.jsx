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
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "ts", direction: "desc" });
  const [filterKind, setFilterKind] = useState("all");
  const rowsPerPage = 5;

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
  const changeSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
    setPage(1);
  };

  const kindOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      if (!row?.kind) return;
      set.add(String(row.kind).toLowerCase());
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filterKind === "all") return rows;
    const value = String(filterKind).toLowerCase();
    return rows.filter((row) => String(row.kind || "").toLowerCase() === value);
  }, [rows, filterKind]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    setPage((prev) => Math.min(prev, totalPages));
  }, [filteredRows, rowsPerPage]);

  const sortedRows = useMemo(() => {
    const data = [...filteredRows];
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;
    const getValue = (row) => {
      switch (key) {
        case "ts":
          return new Date(row.ts || row.created_at || 0).getTime();
        case "user":
          return (row.user_email || "").toLowerCase();
        case "kind":
          return (row.kind || "").toLowerCase();
        case "section":
          return (row.section || "").toLowerCase();
        case "unit":
          return ((row.unit || "") + (row.lesson || "")).toLowerCase();
        case "score":
          return getScoreInfo(row).ratio ?? -1;
        case "duration":
          return Number(row.elapsed_sec || 0);
        default:
          return 0;
      }
    };
    data.sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -dir;
      if (bVal == null) return dir;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal === bVal ? 0 : (aVal > bVal ? dir : -dir);
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      if (aStr === bStr) return 0;
      return aStr > bStr ? dir : -dir;
    });
    return data;
  }, [filteredRows, sortConfig]);


  const fmt = (iso, time = false) => {
    if (!iso) return "--";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "--";
    return time
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString();
  };
  const fmtDur = (sec) => {
    const value = Number(sec);
    if (!Number.isFinite(value) || value < 0) return "--";
    const mm = Math.floor(value / 60).toString().padStart(2, "0");
    const ss = Math.floor(value % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };
  const renderSortButton = (label, key) => {
    const active = sortConfig.key === key;
    const arrow = active ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕";
    return (
      <button
        type="button"
        onClick={() => changeSort(key)}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          fontWeight: 600,
          color: "#111827",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        <span style={{ fontSize: 10, color: active ? "#2563eb" : "#9ca3af" }}>{arrow}</span>
      </button>
    );
  };
  const getScoreInfo = (row) => {
    const rw = row.summary?.rw;
    const math = row.summary?.math;
    let label = "--";
    let ratio = null;
    if (rw?.total || rw?.correct) {
      label = `${rw.correct || 0}/${rw.total || 0}`;
      ratio = rw.total ? (rw.correct || 0) / (rw.total || 1) : null;
    }
    if (math?.total || math?.correct) {
      label = `${math.correct || 0}/${math.total || 0}`;
      ratio = math.total ? (math.correct || 0) / (math.total || 1) : null;
    }
    return { label, ratio };
  };
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const pagedRows = sortedRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const startIndex = sortedRows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(page * rowsPerPage, sortedRows.length);

  return (
    <PageWrap>
      <HeaderBar title="SAT Training Analytics" />

      <Card>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No training activity found.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                Filter by kind:
                <select
                  value={filterKind}
                  onChange={(e) => {
                    setFilterKind(e.target.value);
                    setPage(1);
                  }}
                  style={{ marginLeft: 6, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px' }}
                >
                  <option value="all">All</option>
                  {kindOptions.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.charAt(0).toUpperCase() + kind.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Date", "ts")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Time</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("User", "user")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Kind", "kind")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Section", "section")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Unit/Lesson", "unit")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Score", "score")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{renderSortButton("Duration", "duration")}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(r => {
                    const scoreInfo = getScoreInfo(r);
                    return (
                      <tr key={`${r.id || ''}_${r.ts}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 10 }}>{fmt(r.ts)}</td>
                        <td style={{ padding: 10 }}>{fmt(r.ts, true)}</td>
                        <td style={{ padding: 10 }}>{r.user_email || '--'}</td>
                        <td style={{ padding: 10 }}>{r.kind || '--'}</td>
                        <td style={{ padding: 10 }}>{r.section || '--'}</td>
                        <td style={{ padding: 10 }}>{r.unit || r.lesson || '--'}</td>
                        <td style={{ padding: 10 }}>{scoreInfo.label}</td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                Showing {rows.length === 0 ? 0 : startIndex}-
                {endIndex} of {rows.length}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
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
