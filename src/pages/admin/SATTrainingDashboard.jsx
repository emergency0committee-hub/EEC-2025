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
  const [assignments, setAssignments] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ email: "", className: "" });
  const [knownEmails, setKnownEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        let resp = await supabase.from(table).select("*").order("ts", { ascending: false });
        if (resp.error) { try { resp = await supabase.from(table).select("*").order("id", { ascending: false }); } catch {}
        }
        setRows(resp.error ? [] : (resp.data || []));

        // Load recent class assignments
        try {
          const aTable = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
          let ar = await supabase.from(aTable).select("*").order("ts", { ascending: false }).limit(20);
          if (ar.error) { try { ar = await supabase.from(aTable).select("*").order("id", { ascending: false }).limit(20); } catch {}
          }
          setAssignments(ar.error ? [] : (ar.data || []));
        } catch (e) {
          console.warn(e);
          setAssignments([]);
        }

        // Load known emails from multiple sources (best-effort)
        try {
          const emails = new Set();
          // 0) Preferred: from Supabase Auth via an admin-only RPC (list_user_emails)
          try {
            const rpc = await supabase.rpc('list_user_emails');
            if (!rpc.error && rpc.data) rpc.data.forEach(r => { if (r?.email) emails.add(r.email); });
          } catch (e) { /* fallback below */ }
          // 1) profiles.email (if policies allow)
          try {
            const pr = await supabase.from('profiles').select('email').limit(5000);
            if (!pr.error && pr.data) pr.data.forEach(r => { if (r?.email) emails.add(r.email); });
          } catch {}
          // 2) existing class assignments
          try {
            const aTable = import.meta.env.VITE_CLASS_ASSIGN_TABLE || 'cg_class_assignments';
            const ar = await supabase.from(aTable).select('student_email').limit(5000);
            if (!ar.error && ar.data) ar.data.forEach(r => { if (r?.student_email) emails.add(r.student_email); });
          } catch {}
          // 3) SAT training logs
          try {
            const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || 'cg_sat_training';
            const tr = await supabase.from(tTable).select('user_email').limit(5000);
            if (!tr.error && tr.data) tr.data.forEach(r => { if (r?.user_email) emails.add(r.user_email); });
          } catch {}
          // 4) Career submissions (if accessible)
          try {
            const sTable = import.meta.env.VITE_SUBMISSIONS_TABLE || 'cg_submissions';
            const sr = await supabase.from(sTable).select('user_email').limit(5000);
            if (!sr.error && sr.data) sr.data.forEach(r => { if (r?.user_email) emails.add(r.user_email); });
          } catch {}
          setKnownEmails(Array.from(emails).filter(Boolean).sort((a,b)=>a.localeCompare(b)));
        } catch (e) {
          console.warn('load known emails', e);
          setKnownEmails([]);
        } finally {
          setLoadingEmails(false);
        }
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, []);

  const saveAssignment = async () => {
    const email = (assignForm.email || "").trim();
    const className = (assignForm.className || "").trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) { alert("Enter a valid student email"); return; }
    if (!className) { alert("Enter a class"); return; }
    setSavingAssign(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const adminEmail = me?.user?.email || null;
      const aTable = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      // Delete previous assignment for this email to keep a single active row
      try { await supabase.from(aTable).delete().eq("student_email", email); } catch {}
      const { error } = await supabase.from(aTable).insert({ student_email: email, class_name: className, assigned_by: adminEmail });
      if (error) throw error;
      // refresh
      const ar = await supabase.from(aTable).select("*").order("ts", { ascending: false }).limit(20);
      setAssignments(ar.error ? [] : (ar.data || []));
      setAssignForm({ email: "", className: "" });
      alert("Assigned class saved");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save assignment");
    } finally {
      setSavingAssign(false);
    }
  };

  const deleteAssignment = async (row) => {
    if (!row) return;
    const ok = window.confirm(`Delete class assignment for ${row.student_email || 'this student'}?`);
    if (!ok) return;
    setDeletingId(row.id || null);
    try {
      const aTable = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      const { error } = await supabase.from(aTable).delete().eq('id', row.id);
      if (error) throw error;
      setAssignments((list) => list.filter((x) => x.id !== row.id));
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to delete assignment');
    } finally {
      setDeletingId(null);
    }
  };

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

      {/* Class assignment tool */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Assign Class to Student</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
          {(() => {
            const q = String(assignForm.email || '').toLowerCase();
            const filtered = knownEmails.filter(em => em.toLowerCase().includes(q)).slice(0, 8);
            const dropdownOpen = !!assignForm._focusEmail && q.length > 0 && filtered.length > 0;
            return (
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 280px',
                  minWidth: 260,
                  // Add bottom space when dropdown is open so next input doesn't get overlapped
                  marginBottom: dropdownOpen ? 240 : 0,
                }}
              >
            <input
              type="email"
              placeholder="Student email"
              value={assignForm.email}
              onChange={(e) => setAssignForm((f) => ({ ...f, email: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              list="known-student-emails"
              onFocus={(e) => setAssignForm((f)=>({ ...f, _focusEmail: true }))}
              onBlur={(e) => setTimeout(() => setAssignForm((f)=>({ ...f, _focusEmail: false })), 120)}
            />
            {/* Custom suggestion list (works even if datalist is hidden by browser) */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 40,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
              }}>
                {filtered.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setAssignForm((f)=>({ ...f, email: em, _focusEmail: false })); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer'
                    }}
                    onMouseEnter={(e)=> e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
                  >{em}</button>
                ))}
              </div>
            )}
            </div>
            );
          })()}
          <datalist id="known-student-emails">
            {knownEmails.map((em) => (
              <option key={em} value={em} />
            ))}
          </datalist>
          <div style={{ flex: '1 1 220px', minWidth: 220 }}>
            <input
              type="text"
              placeholder="Class (e.g., Grade 11 A)"
              value={assignForm.className}
              onChange={(e) => setAssignForm((f) => ({ ...f, className: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
            />
          </div>
          <Btn variant="primary" onClick={saveAssignment} disabled={savingAssign} style={{ flex: '0 0 auto' }}>
            {savingAssign ? 'Saving...' : 'Save'}
          </Btn>
        </div>
        <div style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
          Students will see SAT Training only after an assignment exists for their email.
          {loadingEmails ? ' Loading emails…' : (knownEmails.length ? ` ${knownEmails.length} known email${knownEmails.length>1?'s':''} loaded.` : ' No known emails found.')}
        </div>
        {assignments && assignments.length > 0 && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Student</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Class</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Assigned By</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={`${a.id || ''}_${a.student_email}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 10 }}>{a.ts ? new Date(a.ts).toLocaleString() : '—'}</td>
                    <td style={{ padding: 10 }}>{a.student_email || '—'}</td>
                    <td style={{ padding: 10 }}>{a.class_name || '—'}</td>
                    <td style={{ padding: 10 }}>{a.assigned_by || '—'}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        type="button"
                        onClick={() => deleteAssignment(a)}
                        title="Delete assignment"
                        style={{
                          border: 'none', background: 'transparent', cursor: 'pointer', padding: 6,
                          borderRadius: 6
                        }}
                        onMouseEnter={(e)=> e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
                        disabled={deletingId === a.id}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                          <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
