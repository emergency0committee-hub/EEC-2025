// src/pages/sat/SATTraining.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import { toOneDriveEmbedUrl } from "../../lib/onedrive.js";

const UNIT_LESSONS = {
  Algebra: ["Fraction and Decimals", "Polynomials", "Solving Equations", "Word Problems"],
  Arithmetic: ["Percentage", "Average", "Ratio and Proportion", "Probability"],
  Geometry: ["Lines and Angles", "Triangles", "Quadrilateral", "Solid Geometry", "Coordinate Geometry", "Trigonometry"],
};
const UNIT_KEYS = Object.keys(UNIT_LESSONS);

export default function SATTraining({ onNavigate }) {
  SATTraining.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  // Admin session flag early so we can use it for initial UI
  const isAdmin = (() => { try { return localStorage.getItem("cg_admin_ok_v1") === "1"; } catch { return false; } })();

  // Declare all hooks unconditionally to keep hook order stable across renders
  const [tab, setTab] = useState(isAdmin ? "admin" : "classwork"); // stream | classwork | people | admin

  // Classroom-like seed data
  const streamPosts = useMemo(() => ([
    { id: "p1", title: "Welcome to SAT Training", body: "Use Classwork to pick a topic. Practice sets are untimed.", ts: new Date().toLocaleString() },
    { id: "p2", title: "Tip", body: "Focus on 2-3 skills per session for best results.", ts: new Date().toLocaleString() },
  ]), []);

  const classwork = useMemo(() => ([
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

  // OneDrive materials (Math): env or local override for embed URL
  const [embedOverride, setEmbedOverride] = useState(() => {
    try { return localStorage.getItem("cg_onedrive_math_embed") || ""; } catch { return ""; }
  });
  const envEmbed = (import.meta.env.VITE_ONEDRIVE_MATH_EMBED || "").trim();
  const rawEmbed = (embedOverride || envEmbed || "").trim();
  const embedUrl = useMemo(() => toOneDriveEmbedUrl(rawEmbed), [rawEmbed]);

  // Admin: classes management
  const [classesLoading, setClassesLoading] = useState(false);
  const [classes, setClasses] = useState([]); // [{ name, count }]
  const [selectedClass, setSelectedClass] = useState("");
  const [classEmails, setClassEmails] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [classLogs, setClassLogs] = useState([]);
  // Class sub-tabs (admin view)
  const [classTab, setClassTab] = useState("classwork"); // classwork | analytics

  // Classwork resources
  const [resLoading, setResLoading] = useState(false);
  // Student class & resources
  const [studentClass, setStudentClass] = useState("");
  const [studentResLoading, setStudentResLoading] = useState(false);
  const [studentResources, setStudentResources] = useState([]);
  const [studentAttempts, setStudentAttempts] = useState({});
  const [csvInfo, setCsvInfo] = useState({ name: "", count: 0, items: null, error: "" });
  const [csvKind, setCsvKind] = useState("quiz");
  const [csvDuration, setCsvDuration] = useState("15");
  const [csvTitle, setCsvTitle] = useState("");
  const [csvUnit, setCsvUnit] = useState(UNIT_KEYS[0]);
  const [csvLesson, setCsvLesson] = useState(UNIT_LESSONS[UNIT_KEYS[0]][0]);
  useEffect(() => {
    const lessons = UNIT_LESSONS[csvUnit] || [];
    setCsvLesson((prev) => (lessons.includes(prev) ? prev : (lessons[0] || "")));
  }, [csvUnit]);

  const DEFAULT_META = {
    classwork: { durationSec: 20 * 60, allowRetake: true, resumeMode: "restart", attemptLimit: null },
    homework: { durationSec: null, allowRetake: true, resumeMode: "resume", attemptLimit: null },
    quiz: { durationSec: 15 * 60, allowRetake: false, resumeMode: "restart", attemptLimit: 1 },
  };

  const baseMeta = (kind) => {
    const k = (kind || "classwork").toLowerCase();
    return { ...(DEFAULT_META[k] || DEFAULT_META.classwork) };
  };

  const buildMeta = (kind, durationInput) => {
    const meta = baseMeta(kind);
    if (meta.resumeMode === "resume") {
      meta.durationSec = null;
    } else {
      const minutes = Number.parseInt(durationInput, 10);
      if (Number.isFinite(minutes) && minutes > 0) {
        meta.durationSec = minutes * 60;
      }
    }
    if (meta.resumeMode === "resume") meta.durationSec = null;
    if (meta.allowRetake === false && meta.attemptLimit == null) meta.attemptLimit = 1;
    if (!(meta.durationSec > 0) && meta.resumeMode !== "resume") {
      meta.durationSec = baseMeta(kind).durationSec;
    }
    return meta;
  };

  const formatDuration = (sec) => {
    const num = Number(sec);
    if (!Number.isFinite(num) || num <= 0) return "Untimed";
    const minutes = Math.round(num / 60);
    if (minutes >= 120) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}m`;
    }
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  };

  const pillStyles = {
    base: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 },
    complete: { background: "#ecfdf5", color: "#047857" },
    info: { background: "#eef2ff", color: "#4338ca" },
    warn: { background: "#fef3c7", color: "#92400e" },
  };

  const extractResourceMeta = (resource) => {
    const meta = baseMeta(resource?.kind);
    const src = (() => {
      if (resource?.payload && typeof resource.payload === "object") {
        if (resource.payload.meta && typeof resource.payload.meta === "object") return resource.payload.meta;
        if (resource.payload.settings && typeof resource.payload.settings === "object") return resource.payload.settings;
      }
      if (resource?.meta && typeof resource.meta === "object") return resource.meta;
      if (resource?.settings && typeof resource.settings === "object") return resource.settings;
      if (resource?.url && String(resource.url).startsWith("data:application/json")) {
        try {
          const base64 = String(resource.url).split(",")[1] || "";
          const json = decodeURIComponent(escape(window.atob(base64)));
          const obj = JSON.parse(json);
          if (obj && typeof obj.meta === "object") return obj.meta;
        } catch {}
      }
      return null;
    })();
    if (src) {
      if (src.durationSec != null && Number.isFinite(Number(src.durationSec))) {
        meta.durationSec = Math.max(0, Number(src.durationSec));
      }
      if (src.allowRetake != null) meta.allowRetake = !!src.allowRetake;
      if (src.resumeMode) meta.resumeMode = String(src.resumeMode);
      if (src.attemptLimit != null) {
        const lim = Number(src.attemptLimit);
        meta.attemptLimit = Number.isFinite(lim) && lim > 0 ? lim : null;
      }
    }
    if (resource?.duration_sec != null && Number.isFinite(Number(resource.duration_sec))) {
      meta.durationSec = Math.max(0, Number(resource.duration_sec));
    }
    if (meta.resumeMode === "resume") meta.durationSec = null;
    if (meta.allowRetake === false && meta.attemptLimit == null) meta.attemptLimit = 1;
    if (!(meta.durationSec > 0) && meta.resumeMode !== "resume") {
      meta.durationSec = baseMeta(resource?.kind).durationSec;
    }
    return meta;
  };

  const normalizeResourceItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((item, idx) => {
      const q = item || {};
      const hasChoices = Array.isArray(q.choices) && q.choices.some((ch) => ch && (ch.label || ch.text || ch.value));
      const choices = hasChoices
        ? q.choices
            .map((ch) => ({
              value: ch?.value ?? ch?.option ?? ch?.id ?? ch?.label ?? ch?.text ?? "",
              label: ch?.label ?? ch?.text ?? ch?.value ?? "",
            }))
            .filter((ch) => ch.label)
        : [];
      return {
        ...q,
        id: q.id || `q_${idx + 1}`,
        choices,
        answerType: q.answerType || (hasChoices ? "choice" : "numeric"),
      };
    });
  };

  const getResourceQuestions = (resource) => {
    try {
      if (Array.isArray(resource?.payload?.items)) return normalizeResourceItems(resource.payload.items);
      if (resource?.url && String(resource.url).startsWith("data:application/json")) {
        const base64 = String(resource.url).split(",")[1] || "";
        const json = decodeURIComponent(escape(window.atob(base64)));
        const obj = JSON.parse(json);
        if (Array.isArray(obj.items)) return normalizeResourceItems(obj.items);
      }
    } catch (e) {
      console.warn("read resource questions", e);
    }
    return [];
  };

  const buildAttemptIndex = (rows = []) => {
    const map = {};
    (rows || []).forEach((row) => {
      const data = row || {};
      const answers = data.answers || {};
      const resourceId = data.resource_id || answers.resourceId || answers.resource_id;
      if (!resourceId) return;
      const status = answers.status || data.status || "completed";
      const entry = {
        id: data.id,
        status,
        ts: data.ts || data.created_at || null,
        elapsedSec: Number(data.elapsed_sec || answers.elapsedSec || 0),
        summary: data.summary || null,
        meta: answers.meta || null,
      };
      if (!map[resourceId]) map[resourceId] = { attempts: [], latest: entry };
      map[resourceId].attempts.push(entry);
      const latest = map[resourceId].latest;
      if (!latest || (entry.ts && (!latest.ts || new Date(entry.ts) > new Date(latest.ts)))) {
        map[resourceId].latest = entry;
      }
      if (entry.status === "completed") map[resourceId].completed = true;
    });
    return map;
  };

  // Minimal CSV parser (quoted fields, CRLF)
  function parseCSV(text) {
    const rows = [];
    let field = '';
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && next === '\n') { i++; }
          row.push(field); field = '';
          if (row.length && !(row.length === 1 && row[0] === '')) rows.push(row);
          row = [];
        } else { field += c; }
      }
    }
    row.push(field);
    if (row.length && !(row.length === 1 && row[0] === '')) rows.push(row);
    return rows;
  }

  function parseQuizCSV(text) {
    const rows = parseCSV(text);
    if (!rows || rows.length < 2) return { items: [], count: 0 };
    let headerRow = rows[0];
    if (headerRow && headerRow.length === 1 && String(headerRow[0]).includes('/')) {
      headerRow = String(headerRow[0]).split('/');
    }
    const header = headerRow.map(h => String(h || '').trim().toLowerCase());
    const col = (name) => header.findIndex(h => h === name);
    const idx = {
      num: col('#'),
      question: col('question'),
      a: col('answer a'),
      b: col('answer b'),
      c: col('answer c'),
      d: col('answer d'),
      correct: col('correct answer'),
      passage: col('passage'),
      skill: col('skill'),
    };
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const qtext = (idx.question >= 0 ? r[idx.question] : '').trim();
      if (!qtext) continue;
      const num = (idx.num >= 0 ? r[idx.num] : String(i)).trim();
      const id = 'q_' + (num || i);
      const rawChoices = [
        { value: 'A', label: (idx.a>=0? r[idx.a]:'').trim() },
        { value: 'B', label: (idx.b>=0? r[idx.b]:'').trim() },
        { value: 'C', label: (idx.c>=0? r[idx.c]:'').trim() },
        { value: 'D', label: (idx.d>=0? r[idx.d]:'').trim() },
      ];
            const hasChoices = rawChoices.some((ch) => ch.label);
      const correctRaw = (idx.correct>=0? r[idx.correct]: '').trim();
      const correct = hasChoices
        ? (correctRaw.replace(/[^A-D]/ig,'').toUpperCase() || null)
        : (correctRaw || null);
      const passage = (idx.passage>=0? r[idx.passage]: '').trim() || null;
      const skill = (idx.skill>=0? r[idx.skill]: '').trim() || null;
        items.push({
        id,
        text: qtext,
        passage,
        choices: hasChoices ? rawChoices : [],
        correct,
        skill,
        answerType: hasChoices ? 'choice' : 'numeric',
      });
    }
    return { items, count: items.length };
  }
  const [resources, setResources] = useState([]);
  const handleCsvKindChange = (value) => {
    const kind = (value || "quiz").toLowerCase();
    setCsvKind(kind);
    if (kind === "homework") {
      setCsvDuration("");
    } else if (kind === "quiz") {
      setCsvDuration("15");
    } else {
      setCsvDuration("20");
    }
  };

  // Per-class OneDrive embed override (admin local)
  const classEmbedKey = selectedClass ? `cg_onedrive_class_${selectedClass}` : "";
  const [classEmbed, setClassEmbed] = useState("");
  const classEmbedUrl = useMemo(() => toOneDriveEmbedUrl(classEmbed), [classEmbed]);


  function handleCSVFile(event) {
    const f = event?.target?.files?.[0];
    if (!f) return;
    setCsvInfo({ name: f.name, count: 0, items: null, error: '' });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || '');
        const { items, count } = parseQuizCSV(txt);
        setCsvInfo({ name: f.name, count, items, error: '' });
      } catch (err) {
        setCsvInfo({ name: f.name, count: 0, items: null, error: err?.message || 'Could not parse CSV' });
      }
      if (event?.target) {
        try { event.target.value = ""; } catch {}
      }
    };
    reader.onerror = () => {
      setCsvInfo({ name: f.name, count: 0, items: null, error: 'Failed to read file' });
      if (event?.target) {
        try { event.target.value = ""; } catch {}
      }
    };
    reader.readAsText(f);
  }

  async function saveCSVAsResource(kind = 'quiz') {
    if (!csvInfo.items || !csvInfo.count) { alert('Pick a CSV file first'); return; }
    if (!selectedClass) { alert('Pick a class first'); return; }
    if (!csvLesson) { alert('Pick a lesson'); return; }
    const title = (csvTitle || '').trim() || (csvInfo.name ? csvInfo.name.replace(/\\.csv$/i,'') : ('Quiz (' + csvInfo.count + ' Qs)'));
    const resolvedKind = (kind || 'quiz').toLowerCase();
    const meta = buildMeta(resolvedKind, csvDuration);
    const payloadMeta = { ...meta, unit: csvUnit, lesson: csvLesson };
    try {
      const rTable = import.meta.env.VITE_CLASS_RES_TABLE || 'cg_class_resources';
      const { data: me } = await supabase.auth.getUser();
      const by = me?.user?.email || userEmail || null;
      // Prefer inserting payload if the column exists
      let inserted = null;
      const baseRow = {
        class_name: selectedClass,
        title,
        unit: csvUnit,
        lesson: csvLesson,
        url: '',
        kind: resolvedKind,
        created_by: by,
        payload: { items: csvInfo.items, meta: payloadMeta },
      };
      try {
        const { data, error } = await supabase.from(rTable).insert(baseRow).select().single();
        if (error) throw error;
        inserted = data;
      } catch (e) {
        const missingColumn = e?.code === '42703' || /column .* does not exist/i.test(e?.message || '');
        if (!missingColumn) throw e;
        const fallbackPayload = { items: csvInfo.items, meta: payloadMeta };
        try {
          const { data, error } = await supabase
            .from(rTable)
            .insert({ class_name: selectedClass, title, url: '', kind: resolvedKind, created_by: by, payload: fallbackPayload })
            .select()
            .single();
          if (error) throw error;
          inserted = data;
        } catch (inner) {
          const json = JSON.stringify(fallbackPayload);
          const dataUrl = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(json)));
          const { data, error } = await supabase
            .from(rTable)
            .insert({ class_name: selectedClass, title, url: dataUrl, kind: resolvedKind, created_by: by })
            .select()
            .single();
          if (error) throw error;
          inserted = data;
        }
      }
      if (inserted && (!inserted.payload || typeof inserted.payload !== 'object')) {
        inserted = { ...inserted, payload: { items: csvInfo.items, meta: payloadMeta } };
      } else if (inserted?.payload?.meta) {
        inserted = {
          ...inserted,
          payload: { ...inserted.payload, meta: { ...payloadMeta, ...inserted.payload.meta } },
        };
      }
      inserted = {
        ...inserted,
        unit: inserted.unit ?? payloadMeta.unit,
        lesson: inserted.lesson ?? payloadMeta.lesson,
      };
      setResources((list) => [inserted, ...list]);
      setCsvInfo({ name: '', count: 0, items: null, error: '' });
      setCsvTitle('');
      handleCsvKindChange('quiz');
      const defaultUnit = UNIT_KEYS[0];
      setCsvUnit(defaultUnit);
      setCsvLesson(UNIT_LESSONS[defaultUnit][0]);
      alert('CSV saved.');
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to save CSV resource. You may need to add a payload jsonb column to cg_class_resources.');
    }
  }
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setClassesLoading(true);
      try {
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase.from(table).select("class_name, student_email").limit(2000);
        if (error) throw error;
        const map = new Map();
        (data || []).forEach(r => {
          const name = r.class_name || "(Unassigned)";
          map.set(name, (map.get(name) || 0) + 1);
        });
        const arr = Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a,b)=>a.name.localeCompare(b.name));
        setClasses(arr);
      } catch (e) {
        console.warn(e);
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    })();
  }, [isAdmin]);


  function handleCSVFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setCsvInfo({ name: file.name, count: 0, items: null, error: "" });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const { items, count } = parseQuizCSV(text);
        setCsvInfo({ name: file.name, count, items, error: "" });
      } catch (err) {
        console.warn("parse CSV", err);
        setCsvInfo({ name: file.name, count: 0, items: null, error: err?.message || "Could not parse CSV" });
      }
      if (event?.target) {
        try { event.target.value = ""; } catch {}
      }
    };
    reader.onerror = () => {
      setCsvInfo({ name: file.name, count: 0, items: null, error: "Failed to read file" });
      if (event?.target) {
        try { event.target.value = ""; } catch {}
      }
    };
    reader.readAsText(file);
  }

  useEffect(() => {
    if (!isAdmin || !selectedClass) return;
    (async () => {
      try {
        // Load class embed from local storage
        try { setClassEmbed(localStorage.getItem(classEmbedKey) || ""); } catch {}
        // Load student emails
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase.from(table).select("student_email").eq("class_name", selectedClass).limit(5000);
        if (error) throw error;
        const emails = Array.from(new Set((data || []).map(r => r.student_email).filter(Boolean)));
        setClassEmails(emails);
        // Load logs
        setLogsLoading(true);
        try {
          if (emails.length > 0) {
            const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
            const { data: logs, error: lerr } = await supabase.from(tTable).select("*").in("user_email", emails).order("ts", { ascending: false }).limit(500);
            if (lerr) throw lerr;
            setClassLogs(logs || []);
          } else {
            setClassLogs([]);
          }
        } finally {
          setLogsLoading(false);
        }

        // Load classwork resources
        try {
          setResLoading(true);
          const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
          const { data: rs, error: rerr } = await supabase
            .from(rTable)
            .select("*")
            .eq("class_name", selectedClass)
            .order("ts", { ascending: false })
            .limit(1000);
          if (rerr) throw rerr;
          setResources(rs || []);
        } catch (e) {
          console.warn(e);
          setResources([]);
        } finally {
          setResLoading(false);
        }
      } catch (e) {
        console.warn(e);
        setClassEmails([]);
        setClassLogs([]);
        setLogsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedClass]);

  const deleteResource = async (row) => {
    if (!row) return;
    const ok = window.confirm(`Delete resource "${row.title || ''}"?`);
    if (!ok) return;
    try {
      const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
      const { error } = await supabase.from(rTable).delete().eq("id", row.id);
      if (error) throw error;
      setResources((list) => list.filter((x) => x.id !== row.id));
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to delete resource");
    }
  };

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


  function decodeResourceQuestions(r) {
    return getResourceQuestions(r);
  }
  function handleCSVFile(e, kindOverride) {
    const f = e?.target?.files?.[0];
    if (!f) return;
    setCsvInfo({ name: f.name, count: 0, items: null, error: '' });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || '');
        const { items, count } = parseQuizCSV(txt);
        setCsvInfo({ name: f.name, count, items, error: '' });
      } catch (err) {
        setCsvInfo({ name: f.name, count: 0, items: null, error: err?.message || 'Could not parse CSV' });
      }
    };
    reader.onerror = () => setCsvInfo({ name: f.name, count: 0, items: null, error: 'Failed to read file' });
    reader.readAsText(f);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const email = auth?.user?.email || "";
        setUserEmail(email);
        if (!email) { setAllowed(false); return; }
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase
          .from(table)
          .select("class_name")
          .eq("student_email", email)
          .limit(1);
        if (error) { console.warn("Class check error", error); setAllowed(false); }
        else {
          const ok = (data && data.length > 0);
          setAllowed(ok);
          if (ok && !isAdmin) {
            const cls = data[0]?.class_name || "";
            setStudentClass(cls);
            try {
              setStudentResLoading(true);
              const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
              const { data: resData, error: resError } = await supabase
                .from(rTable)
                .select("*")
                .eq("class_name", cls)
                .order("ts", { ascending: false })
                .limit(1000);
              if (resError) throw resError;
              const resources = resData || [];
              setStudentResources(resources);
              try {
                const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
                let attemptsData = [];
                if (email) {
                  const baseQuery = supabase
                    .from(tTable)
                    .select("*")
                    .eq("user_email", email)
                    .order("ts", { ascending: false })
                    .limit(500);
                  let resp;
                  if (cls) {
                    resp = await baseQuery.eq("class_name", cls);
                    if (resp.error && (resp.error.code === "42703" || /column .* does not exist/i.test(resp.error.message || ""))) {
                      resp = await supabase
                        .from(tTable)
                        .select("*")
                        .eq("user_email", email)
                        .order("ts", { ascending: false })
                        .limit(500);
                    }
                  } else {
                    resp = await baseQuery;
                  }
                  if (resp.error) throw resp.error;
                  attemptsData = resp.data || [];
                }
                setStudentAttempts(buildAttemptIndex(attemptsData));
              } catch (attemptErr) {
                console.warn(attemptErr);
                setStudentAttempts(buildAttemptIndex([]));
              }
            } catch (e) {
              console.warn(e);
              setStudentResources([]);
              setStudentAttempts(buildAttemptIndex([]));
            } finally {
              setStudentResLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn(e);
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <Card><p style={{ color: "#6b7280" }}>Checking access...</p></Card>
      </PageWrap>
    );
  }

  if (!allowed && !isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <Card>
          {!userEmail ? (
            <>
              <p style={{ color: "#6b7280" }}>
                You need to sign in to access SAT Training.
              </p>
              <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            </>
          ) : (
            <>
              <p style={{ color: "#6b7280" }}>
                Your administrator needs to assign you a class before you can use SAT Training.
              </p>
              <p style={{ color: "#9ca3af", fontSize: 12 }}>
                Ask your admin to assign a class to {userEmail} in the Admin dashboard.
              </p>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <div style={{ display: 'grid', gap: 16 }}>
          {!selectedClass ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ marginTop: 0 }}>Your Classes</h3>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{classesLoading ? 'Loading…' : `${classes.length} class${classes.length === 1 ? '' : 'es'}`}</div>
              </div>
              {classes.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No classes found. Assign students to classes in the Admin dashboard first.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {classes.map((c) => (
                    <div key={c.name} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{c.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{c.count} student{c.count === 1 ? '' : 's'}</div>
                      <div style={{ marginTop: 10 }}>
                        <Btn variant="secondary" onClick={() => setSelectedClass(c.name)}>Open</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ marginTop: 0 }}>Class: {selectedClass}</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="back" onClick={() => { setSelectedClass(""); setClassLogs([]); setClassEmails([]); }}>Back to Classes</Btn>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {['classwork', 'analytics'].map((id) => (
                    <button
                      key={id}
                      onClick={() => setClassTab(id)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        background: classTab === id ? '#111827' : '#fff',
                        color: classTab === id ? '#fff' : '#374151',
                        fontWeight: 600,
                      }}
                    >
                      {id === 'classwork' ? 'Classwork' : 'Analysis'}
                    </button>
                  ))}
                </div>

                {classTab === 'classwork' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Materials (OneDrive)</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="OneDrive share or embed URL"
                          value={classEmbed}
                          onChange={(e) => setClassEmbed(e.target.value)}
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                        />
                        <Btn variant="secondary" onClick={() => { try { localStorage.setItem(classEmbedKey, classEmbed || ''); alert('Saved locally.'); } catch {} }}>Save</Btn>
                        <Btn variant="back" onClick={() => { setClassEmbed(''); try { localStorage.removeItem(classEmbedKey); } catch {} }}>Clear</Btn>
                      </div>
                      {classEmbedUrl && (
                        <div style={{ marginTop: 10, height: 320, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                          <iframe title={`Materials ${selectedClass}`} src={classEmbedUrl} style={{ width: '100%', height: '100%', border: 0 }} allow="fullscreen" />
                        </div>
                      )}
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Upload CSV Assignment</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Title (optional - defaults to file name)"
                          value={csvTitle}
                          onChange={(e) => setCsvTitle(e.target.value)}
                          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <select value={csvKind} onChange={(e) => handleCsvKindChange(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
                            <option value="classwork">Classwork</option>
                            <option value="homework">Homework</option>
                            <option value="quiz">Quiz</option>
                          </select>
                          <select value={csvUnit} onChange={(e) => setCsvUnit(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
                            {UNIT_KEYS.map((unit) => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                          <select value={csvLesson} onChange={(e) => setCsvLesson(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
                            {(UNIT_LESSONS[csvUnit] || []).map((lesson) => (
                              <option key={lesson} value={lesson}>{lesson}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            placeholder={csvKind === "homework" ? "Untimed" : "Duration (min)"}
                            value={csvKind === "homework" ? "" : csvDuration}
                            onChange={(e) => setCsvDuration(e.target.value)}
                            disabled={csvKind === "homework"}
                            style={{
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: 8,
                              background: csvKind === "homework" ? '#f9fafb' : '#ffffff',
                              color: csvKind === "homework" ? '#9ca3af' : '#111827',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {csvKind === "homework"
                            ? "Homework is untimed and lets students resume where they left off."
                            : "Set a time limit in minutes for classwork and quizzes (students restart each attempt)."}
                        </div>
                        <input type="file" accept=".csv" onChange={(e) => handleCSVFile(e)} />
                        {csvInfo.name && (
                          <div style={{ color: csvInfo.error ? '#dc2626' : '#6b7280', fontSize: 13 }}>
                            {csvInfo.error ? csvInfo.error : `Picked ${csvInfo.name} - ${csvInfo.count} questions detected`}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Btn variant="secondary" onClick={() => saveCSVAsResource(csvKind)} disabled={!csvInfo.items || !csvInfo.count}>
                            Save CSV
                          </Btn>
                          <Btn
                            variant="back"
                            onClick={() => {
                              setCsvInfo({ name: '', count: 0, items: null, error: '' });
                              setCsvTitle('');
                              const defaultUnit = UNIT_KEYS[0];
                              setCsvUnit(defaultUnit);
                              setCsvLesson(UNIT_LESSONS[defaultUnit][0]);
                              handleCsvKindChange('quiz');
                            }}
                          >
                            Clear
                          </Btn>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Resources</div>
                      {resLoading ? (
                        <div style={{ color: '#6b7280' }}>Loading…</div>
                      ) : resources.length === 0 ? (
                        <div style={{ color: '#6b7280' }}>No resources yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                          {resources.map((r) => {
                            const key = r.id || `${r.title}_${r.url}`;
                            const meta = extractResourceMeta(r);
                            const questions = decodeResourceQuestions(r) || [];
                            return (
                                <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 700 }}>{r.title || 'Untitled Resource'}</div>
                                    <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{r.kind || 'classwork'}</span>
                                  </div>
                                  {(r.unit || r.lesson) && (
                                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                                      {[r.unit, r.lesson].filter(Boolean).join(' - ')}
                                    </div>
                                  )}
                                  {r.url && (
                                    <div style={{ wordBreak: 'break-word', fontSize: 12 }}>
                                      <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{r.url}</a>
                                    </div>
                                  )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                                  {questions.length > 0 && <span style={{ ...pillStyles.base, ...pillStyles.info }}>Questions: {questions.length}</span>}
                                  <span style={{ ...pillStyles.base, ...pillStyles.info }}>Time: {formatDuration(meta?.durationSec)}</span>
                                  <span style={{ ...pillStyles.base, ...(meta?.allowRetake === false ? pillStyles.warn : pillStyles.info) }}>
                                    {meta?.allowRetake === false ? 'Single attempt' : 'Retakes allowed'}
                                  </span>
                                  <span style={{ ...pillStyles.base, ...(meta?.resumeMode === 'resume' ? pillStyles.complete : pillStyles.info) }}>
                                    {meta?.resumeMode === 'resume' ? 'Resume enabled' : 'Restart each time'}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                                  {r.url && <Btn variant="secondary" onClick={() => window.open(r.url, '_blank')}>Open</Btn>}
                                  {questions.length > 0 && (
                                    <Btn variant="secondary" onClick={() => onNavigate('sat-exam', { practice: { kind: r.kind, resourceId: r.id, className: selectedClass, unit: r.unit || null, lesson: r.lesson || null, meta, custom: { questions, title: r.title, durationSec: meta?.durationSec, meta } } })}>
                                      Preview
                                    </Btn>
                                  )}
                                  <Btn variant="back" onClick={() => deleteResource(r)}>Delete</Btn>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {classTab === 'analytics' && (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 700 }}>Recent Training Results</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{logsLoading ? 'Loading…' : `${classLogs.length} record${classLogs.length === 1 ? '' : 's'}`}</div>
                    </div>
                    {classLogs.length === 0 ? (
                      <div style={{ color: '#6b7280', marginTop: 6 }}>No activity yet.</div>
                    ) : (
                      <div style={{ overflowX: 'auto', marginTop: 6 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Time</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Student</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Section</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Unit/Lesson</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classLogs.map((r) => {
                              const fmtDate = (iso, time = false) =>
                                !iso ? '—' : (time ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(iso).toLocaleDateString());
                              const rw = r.summary?.rw;
                              const m = r.summary?.math;
                              let score = '—';
                              if (rw?.total || rw?.correct) score = `${rw.correct || 0}/${rw.total || 0}`;
                              if (m?.total || m?.correct) score = `${m.correct || 0}/${m.total || 0}`;
                              return (
                                <tr key={`${r.id || ''}_${r.ts}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: 10 }}>{fmtDate(r.ts)}</td>
                                  <td style={{ padding: 10 }}>{fmtDate(r.ts, true)}</td>
                                  <td style={{ padding: 10 }}>{r.user_email || '—'}</td>
                                  <td style={{ padding: 10 }}>{r.section || '—'}</td>
                                  <td style={{ padding: 10 }}>{r.unit || r.lesson || '—'}</td>
                                  <td style={{ padding: 10 }}>{score}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </PageWrap>
    );
  }

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
          {isAdmin && <TabButton id="admin">Admin</TabButton>}
        </div>
      </div>

      {/* Optional: OneDrive materials for Math */}
      {isAdmin && embedUrl && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Math Materials</h3>
          <div style={{ height: 380, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <iframe title="OneDrive Math Materials" src={embedUrl} style={{ width: '100%', height: '100%', border: 0 }} allow="fullscreen"></iframe>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>If content does not load, ensure the OneDrive folder/file share link supports embedding and is accessible.</div>
        </Card>
      )}

      {/* Admin-only: set local embed override */}
      {isAdmin && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Configure OneDrive (local override)</h3>
          <p style={{ color: '#6b7280', marginTop: 0, fontSize: 14 }}>Paste a OneDrive share or embed URL for Math materials. This local override is saved only in your browser. For global config, set VITE_ONEDRIVE_MATH_EMBED and redeploy.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" placeholder="OneDrive share or embed URL"
              value={embedOverride}
              onChange={(e) => setEmbedOverride(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
            <Btn variant="secondary" onClick={() => { try { localStorage.setItem('cg_onedrive_math_embed', embedOverride || ''); } catch {}; alert('Saved locally.'); }}>Save</Btn>
            <Btn variant="back" onClick={() => { setEmbedOverride(''); try { localStorage.removeItem('cg_onedrive_math_embed'); } catch {}; }}>Clear</Btn>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Detected embed URL: {embedUrl ? embedUrl : '—'}</div>
        </Card>
      )}

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
          {isAdmin ? (
            classwork.map((section) => (
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
            ))
          ) : (
            <Card>
              <h3 style={{ marginTop: 0 }}>Class Resources</h3>
              {studentResLoading ? (
                 <p style={{ color: '#6b7280' }}>Loading…</p>
              ) : (studentResources && studentResources.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  {studentResources.map((r) => {
                    const key = r.id || `${r.title || "resource"}_${r.url || "link"}`;
                    const items = decodeResourceQuestions(r) || [];
                    const meta = extractResourceMeta(r);
                    const attemptInfo = r?.id ? (studentAttempts[r.id] || null) : null;
                    const attemptCount = attemptInfo?.attempts?.length || 0;
                    const latestStatus = attemptInfo?.latest?.status || null;
                    const completed = attemptInfo?.completed ?? (latestStatus === "completed");
                    const attemptLimit = meta?.attemptLimit != null ? meta.attemptLimit : null;
                    const allowRetake = meta?.allowRetake !== false;
                    const limitReached = items.length > 0 && completed && ((!allowRetake && attemptLimit == null) || (attemptLimit != null && attemptCount >= attemptLimit));
                    const canStart = items.length > 0 && !limitReached;
                    const kindLabel = (r.kind || "classwork").toLowerCase();
                    const prettyKind = kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1);
                    const durationLabel = items.length > 0 ? formatDuration(meta?.durationSec) : null;
                    const attemptLabel = attemptCount > 0 ? `Attempts: ${attemptCount}${attemptLimit ? `/${attemptLimit}` : ""}` : null;
                    let hasResume = false;
                    if (meta?.resumeMode === "resume" && r?.id) {
                      try { hasResume = Boolean(localStorage.getItem(`cg_sat_resume_${r.id}`)); } catch {}
                    }
                    const startLabel = limitReached
                      ? "Completed"
                      : (meta?.resumeMode === "resume" && hasResume ? "Resume" : `Start ${prettyKind}`);
                    const startAttemptIndex = attemptCount + 1;
                    const launchPractice = () => {
                      if (!canStart) return;
                      const practiceMeta = { ...meta };
                      const durationSec = (typeof practiceMeta.durationSec === "number" && practiceMeta.durationSec > 0) ? practiceMeta.durationSec : null;
                      onNavigate("sat-exam", {
                        practice: {
                          kind: r.kind || "classwork",
                          resourceId: r.id || null,
                          className: studentClass || null,
                          section: r.section || null,
                          unit: r.unit || null,
                          lesson: r.lesson || null,
                          meta: practiceMeta,
                          attemptIndex: startAttemptIndex,
                          custom: {
                            questions: items,
                            durationSec,
                            title: r.title || prettyKind,
                            meta: practiceMeta,
                          },
                        },
                      });
                    };
                    const pill = (variant, text) => (
                      <span key={`${key}_${variant}_${text}`} style={{ ...pillStyles.base, ...(pillStyles[variant] || {}) }}>{text}</span>
                    );
                    return (
                      <div key={key} style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12, display:'grid', gap:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontWeight:700 }}>{r.title || "Untitled Resource"}</div>
                          <span style={{ fontSize:12, color:'#6b7280', textTransform:'capitalize' }}>{prettyKind}</span>
                        </div>
                        {(r.unit || r.lesson) && (
                          <div style={{ color:'#6b7280', fontSize:12 }}>
                            {[r.unit, r.lesson].filter(Boolean).join(' - ')}
                          </div>
                        )}
                        {(r.url && (!r.payload || !items.length)) && (
                          <div style={{ marginTop:4, wordBreak:'break-word' }}>
                            <a href={r.url} target="_blank" rel="noreferrer" style={{ color:'#2563eb' }}>{r.url}</a>
                          </div>
                        )}
                        {items.length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {completed && pill("complete", "Completed")}
                            {!completed && !attemptCount && pill("info", "Not started")}
                            {attemptLabel && pill("info", attemptLabel)}
                            {durationLabel && pill("info", `Time: ${durationLabel}`)}
                            {limitReached && pill("warn", "Retake locked")}
                          </div>
                        )}
                        <div style={{ marginTop:4, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          {r.url && <Btn variant="secondary" onClick={() => window.open(r.url, "_blank")}>Open</Btn>}
                          {items.length > 0 && (
                            <Btn
                              variant="primary"
                              disabled={!canStart}
                              onClick={launchPractice}
                            >
                              {startLabel}
                            </Btn>
                          )}
                        </div>
                        {limitReached && (
                          <div style={{ color:'#ef4444', fontSize:12 }}>
                            You have completed this {prettyKind.toLowerCase()}. Ask your teacher if you need another attempt.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>No resources yet.</p>
              ))}
            </Card>
          )}
          <div>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </div>
      )}{/* PEOPLE */}
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

// Lightweight components for class stream (admin)
function ClassStreamList({ className }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { (async () => {
    try {
      const table = import.meta.env.VITE_CLASS_STREAM_TABLE || 'cg_class_stream';
      const { data, error } = await supabase.from(table).select('*').eq('class_name', className).order('ts', { ascending: false }).limit(200);
      if (error) throw error;
      setItems(data || []);
    } catch (e) { console.warn(e); setItems([]); }
    finally { setLoading(false); }
  })(); }, [className]);
  if (loading) return <div style={{ color: '#6b7280' }}>Loading stream…</div>;
  if (!items.length) return <div style={{ color: '#6b7280' }}>No posts yet.</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map(p => (
        <div key={p.id || p.ts} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700 }}>{p.author_email || 'Teacher'}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{p.ts ? new Date(p.ts).toLocaleString() : ''}</div>
          </div>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.text}</div>
        </div>
      ))}
    </div>
  );
}

function StreamPostComposer({ className, userEmail, onPosted }) {
  const [text, setText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    const t = (text || '').trim();
    if (!t) return;
    setSaving(true);
    try {
      const table = import.meta.env.VITE_CLASS_STREAM_TABLE || 'cg_class_stream';
      const { error } = await supabase.from(table).insert({ class_name: className, text: t, author_email: userEmail });
      if (error) throw error;
      setText('');
      onPosted && onPosted({ text: t });
    } catch (e) { console.error(e); alert(e?.message || 'Failed to post'); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <textarea placeholder="Share an update with the class" value={text} onChange={(e)=>setText(e.target.value)}
        style={{ flex: 1, minHeight: 60, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
      <Btn variant="primary" onClick={submit} disabled={saving}>Post</Btn>
    </div>
  );
}








