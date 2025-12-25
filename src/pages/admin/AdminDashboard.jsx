// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";
import Results from "../Results.jsx";
import { renderSubmissionToPdfA3 } from "../../lib/exportResults.jsx";

const PROFILE_FIELDS =
  "id,email,name,full_name,username,school,class_name,phone,role";
const PROFILE_CHUNK_SIZE = 99;

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeSchool = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeRiasec = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^RIASEC]/g, "");

const parseTopCodes = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.top_codes)) return value.top_codes;
    if (Array.isArray(value.topCodes)) return value.topCodes;
    if (Array.isArray(value.codes)) return value.codes;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseTopCodes(parsed);
      } catch {
        return [];
      }
    }
    if (trimmed.includes(",")) return trimmed.split(",").map((part) => part.trim());
    return trimmed.split("");
  }
  return [];
};

const extractTop3FromRadar = (radarData) => {
  if (!Array.isArray(radarData)) return "";
  const list = radarData
    .map((entry) => ({
      code: normalizeRiasec(entry?.code || "").charAt(0),
      score: Number(entry?.score ?? entry?.percent ?? entry?.value ?? 0),
    }))
    .filter((entry) => entry.code);
  list.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  return list
    .slice(0, 3)
    .map((entry) => entry.code)
    .join("");
};

const extractTop3Code = (submission) => {
  if (!submission) return "";
  const fromRadar = extractTop3FromRadar(submission.radar_data || submission.radarData || submission.radar || []);
  if (fromRadar) return fromRadar;
  const rawTop =
    submission.top_codes ??
    submission.topCodes ??
    submission.top_codes_json ??
    submission.topCodesJson ??
    submission.top_codes_list ??
    submission.topCodesList;
  const fromTop = parseTopCodes(rawTop)
    .flatMap((item) => normalizeRiasec(item).split(""))
    .filter(Boolean)
    .join("")
    .slice(0, 3);
  if (fromTop) return fromTop;
  const fromCode = normalizeRiasec(submission.riasec_code || submission.riasecCode || "").slice(0, 3);
  if (fromCode) return fromCode;
  return "";
};

const deriveRowEmail = (row) => {
  if (!row) return "";
  const candidates = [
    row.user_email,
    row.participant?.email,
    row.participant?.user_email,
    row.email,
    row.profile?.email,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const hydrateRowsWithProfiles = async (rows) => {
  if (!Array.isArray(rows) || !rows.length) {
    return rows || [];
  }
  const requestedEmails = new Map();
  rows.forEach((row) => {
    const raw = deriveRowEmail(row);
    const normalized = normalizeEmail(raw);
    if (normalized && !requestedEmails.has(normalized)) {
      requestedEmails.set(normalized, raw);
    }
  });
  if (!requestedEmails.size) {
    return rows;
  }
  const emailList = Array.from(requestedEmails.values());
  const profileMap = new Map();
  for (const chunk of chunkArray(emailList, PROFILE_CHUNK_SIZE)) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .in("email", chunk);
      if (error) {
        console.error("Failed to fetch profile chunk", error);
        continue;
      }
      (data || []).forEach((profile) => {
        const key = normalizeEmail(profile?.email);
        if (key && !profileMap.has(key)) {
          profileMap.set(key, profile);
        }
      });
    } catch (err) {
      console.error("Profile chunk error", err);
    }
  }
  if (!profileMap.size) {
    return rows;
  }
  return rows.map((row) => {
    const normalized = normalizeEmail(deriveRowEmail(row));
    const profile = normalized ? profileMap.get(normalized) : null;
    if (!profile) return row;
    const participant = {
      ...(row.participant || {}),
      email: profile.email || row.participant?.email || row.user_email,
      name:
        profile.name ||
        profile.full_name ||
        row.participant?.name ||
        profile.username ||
        profile.email,
      school: row.participant?.school || profile.school || row.school,
      class_name: row.participant?.class_name || profile.class_name,
      phone: row.participant?.phone || profile.phone,
    };
    return {
      ...row,
      participant,
      profile_match: profile,
    };
  });
};

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const MIN_COMPLETION_PCT = 0.8;
  const MIN_DURATION_MINUTES_NEW = 20;
  const MIN_DURATION_MINUTES_OLD = 30;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentCountsBySchool, setStudentCountsBySchool] = useState({});
  const [studentCountsLoading, setStudentCountsLoading] = useState(false);
  const [studentCountsLoaded, setStudentCountsLoaded] = useState(false);
  const [studentCountsError, setStudentCountsError] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [bulkSet, setBulkSet] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkSort, setBulkSort] = useState("name");
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewList, setBulkPreviewList] = useState([]);
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
  const [tableSort, setTableSort] = useState("ts_desc");
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const viewerSchool = (currentUser?.school || "").trim();
  const viewerSchoolKey = viewerSchool.toLowerCase();
  const viewerRole = (currentUser?.role || "").toLowerCase();
  const lockSchoolToUser = Boolean(viewerSchool) && viewerRole === "school";
  const activeSchoolFilter = lockSchoolToUser ? viewerSchool : selectedSchool;
  const canManageSubmissions = viewerRole === "admin";
  const downloadCsv = (filename, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const escapeCell = (value) => {
      const text = String(value ?? "");
      if (/["\n,]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
      return text;
    };
    const csv = safeRows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const loadStudentCounts = useCallback(async () => {
    if (!canManageSubmissions) return;
    setStudentCountsLoading(true);
    setStudentCountsError("");
    try {
      const table = import.meta.env.VITE_USERS_TABLE || "profiles";
      const pageSize = 1000;
      let from = 0;
      const rows = [];
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("school, role")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const chunk = Array.isArray(data) ? data : [];
        rows.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
        if (from > 100000) break;
      }
      const counts = {};
      rows.forEach((profile) => {
        const schoolKey = normalizeSchool(profile?.school);
        if (!schoolKey) return;
        const role = String(profile?.role || "").trim().toLowerCase();
        const isStudent = !role || role === "student" || role === "user";
        if (!isStudent) return;
        counts[schoolKey] = (counts[schoolKey] || 0) + 1;
      });
      setStudentCountsBySchool(counts);
      setStudentCountsLoaded(true);
    } catch (err) {
      console.error("Failed to load student counts:", err);
      setStudentCountsBySchool({});
      setStudentCountsLoaded(false);
      setStudentCountsError(err?.message || "Failed to load student counts.");
    } finally {
      setStudentCountsLoading(false);
    }
  }, [canManageSubmissions]);

  useEffect(() => {
    if (lockSchoolToUser && selectedSchool !== viewerSchool) {
      setSelectedSchool(viewerSchool);
    }
  }, [lockSchoolToUser, viewerSchool, selectedSchool]);
  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 60);
    return Number.isFinite(saved) && saved > 0 ? saved : 60;
  });


  useEffect(() => {
    try {
      localStorage.setItem("cg_timer_min", String(timerMin));
    } catch (err) {
      console.warn("Failed to persist timer minutes", err);
    }
  }, [timerMin]);

  useEffect(() => {
    if (!canManageSubmissions) {
      setStudentCountsBySchool({});
      setStudentCountsLoaded(false);
      setStudentCountsError("");
      setStudentCountsLoading(false);
      return;
    }
    loadStudentCounts();
  }, [canManageSubmissions, loadStudentCounts]);

  const realSubmissions = useMemo(
    () => submissions.filter((s) => !s?._demo),
    [submissions]
  );

  const schoolOptions = useMemo(() => {
    const unique = new Set();
    realSubmissions.forEach((sub) => {
      const p = sub?.participant || sub?.profile || {};
      const school = (p.school || "").trim();
      if (school) {
        unique.add(school);
      }
    });
    return Array.from(unique).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [realSubmissions]);

  const getSchool = (submission) => {
    if (!submission) return "";
    const p = submission.participant || submission.profile || {};
    return (p.school || "").trim();
  };

  const getSchoolLabel = (submission) => {
    const school =
      (submission?.participant?.school || "").trim() ||
      (submission?.profile_match?.school || "").trim() ||
      (submission?.profile?.school || "").trim() ||
      (submission?.school || "").trim();
    return school || "Unknown";
  };

  const getParticipantLabel = (submission) => {
    const participant =
      submission?.participant ||
      submission?.profile_match ||
      submission?.profile ||
      {};
    const label = (
      participant?.name ||
      participant?.full_name ||
      participant?.username ||
      participant?.email ||
      submission?.user_email ||
      ""
    ).trim();
    return label || "Unknown";
  };

  const getTotalQuestions = (submission) => {
    const counts =
      submission?.pillar_counts ||
      submission?.pillarCounts ||
      submission?.pillar_count ||
      submission?.pillarCount ||
      {};
    const raw = counts?.totalQuestions ?? counts?.total_questions ?? counts?.total_questions_count ?? null;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 300;
  };

  const getAnsweredCount = (submission) => {
    const profileSource = submission?.profile_match || submission?.profile || {};
    const participant = submission?.participant || {};
    const numericCandidates = [
      profileSource.answered_count,
      participant.answered_count,
      participant.answered,
      submission?.answered_count,
      submission?.answer_count,
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const containers = [submission?.answers, submission?.answers_json, participant?.answers, profileSource?.answers];
    for (const container of containers) {
      if (Array.isArray(container)) return container.length;
      if (container && typeof container === "object") return Object.keys(container).length;
      if (typeof container === "string") {
        const trimmed = container.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.length;
          if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
        } catch {
          continue;
        }
      }
    }
    return 0;
  };

  const getDurationSeconds = (submission) => {
    const participant = submission?.participant || submission?.profile || {};
    const directSecondsCandidates = [
      submission?.duration_sec,
      submission?.durationSeconds,
      participant?.duration_sec,
      participant?.durationSeconds,
    ];
    for (const candidate of directSecondsCandidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const directMinutesCandidates = [submission?.duration_minutes, submission?.durationMinutes, participant?.duration_minutes, participant?.durationMinutes];
    for (const candidate of directMinutesCandidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed * 60;
    }
    try {
      const start = participant?.started_at ? new Date(participant.started_at).getTime() : NaN;
      const end = participant?.finished_at ? new Date(participant.finished_at).getTime() : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return Math.round((end - start) / 1000);
    } catch {
      return null;
    }
  };

  const isSubmissionIncomplete = (submission) => {
    const answeredCount = getAnsweredCount(submission);
    const totalQuestions = getTotalQuestions(submission);
    const answeredPct = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
    const durationSeconds = getDurationSeconds(submission);
    const durationMinutes =
      typeof durationSeconds === "number" && Number.isFinite(durationSeconds) ? durationSeconds / 60 : null;
    const minDurationMinutes = totalQuestions > 200 ? MIN_DURATION_MINUTES_OLD : MIN_DURATION_MINUTES_NEW;
    return (durationMinutes != null && durationMinutes < minDurationMinutes) || answeredPct < MIN_COMPLETION_PCT;
  };

  const bulkEntries = bulkSet?.entries || [];
  const bulkActive = bulkEntries.length > 0;
  const canViewSubmission = (submission) => {
    if (!lockSchoolToUser || canManageSubmissions) return true;
    if (!viewerSchoolKey) return false;
    const submissionSchool = getSchool(submission).toLowerCase();
    return submissionSchool && submissionSchool === viewerSchoolKey;
  };

  const visibleSubmissions = useMemo(() => {
    if (!activeSchoolFilter) return submissions;
    const target = activeSchoolFilter.trim().toLowerCase();
    return submissions.filter(
      (sub) => getSchool(sub).trim().toLowerCase() === target
    );
  }, [submissions, activeSchoolFilter]);

  const incompleteBySchoolRows = useMemo(() => {
    const map = new Map();
    let totalAll = 0;
    let totalIncomplete = 0;
    (visibleSubmissions || [])
      .filter((sub) => sub && !sub._demo)
      .forEach((sub) => {
        const school = getSchoolLabel(sub);
        const key = school.toLowerCase();
        const cur = map.get(key) || { school, total: 0, incomplete: 0 };
        cur.total += 1;
        totalAll += 1;
        if (isSubmissionIncomplete(sub)) {
          cur.incomplete += 1;
          totalIncomplete += 1;
        }
        map.set(key, cur);
      });
    const rows = Array.from(map.values()).sort((a, b) =>
      a.school.localeCompare(b.school, undefined, { sensitivity: "base" })
    );
    return { rows, totalAll, totalIncomplete };
  }, [visibleSubmissions]);

  const top3HierarchyRows = useMemo(() => {
    const firstMap = new Map();
    let totalCount = 0;
    (visibleSubmissions || [])
      .filter((sub) => sub && !sub._demo)
      .forEach((sub) => {
        if (isSubmissionIncomplete(sub)) return;
        const codeRaw = extractTop3Code(sub);
        const letters = normalizeRiasec(codeRaw).split("");
        const first = letters[0] || "Unknown";
        const second = letters[1] || "-";
        const third = letters[2] || "-";
        totalCount += 1;
        if (!firstMap.has(first)) firstMap.set(first, new Map());
        const secondMap = firstMap.get(first);
        if (!secondMap.has(second)) secondMap.set(second, new Map());
        const thirdMap = secondMap.get(second);
        const entry = thirdMap.get(third) || {
          first,
          second,
          third,
          count: 0,
          students: [],
          rowSpanFirst: 0,
          rowSpanSecond: 0,
        };
        entry.count += 1;
        entry.students.push({
          name: getParticipantLabel(sub),
          school: getSchoolLabel(sub),
        });
        thirdMap.set(third, entry);
      });

    const order = { R: 0, I: 1, A: 2, S: 3, E: 4, C: 5 };
    const sortKey = (value) => {
      const v = String(value || "").toUpperCase();
      if (v === "Unknown") return { rank: 2, val: "" };
      if (v === "-") return { rank: 1, val: "" };
      const pos = order[v];
      return { rank: 0, val: Number.isFinite(pos) ? pos : 99 };
    };
    const sortValues = (a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      if (ka.rank !== kb.rank) return ka.rank - kb.rank;
      return ka.val - kb.val;
    };

    const rows = [];
    const firstKeys = Array.from(firstMap.keys()).sort(sortValues);
    firstKeys.forEach((first) => {
      const secondMap = firstMap.get(first);
      const secondKeys = Array.from(secondMap.keys()).sort(sortValues);
      secondKeys.forEach((second) => {
        const thirdMap = secondMap.get(second);
        const thirdKeys = Array.from(thirdMap.keys()).sort(sortValues);
        thirdKeys.forEach((third) => {
          rows.push(thirdMap.get(third));
        });
      });
    });

    let i = 0;
    while (i < rows.length) {
      const first = rows[i].first;
      let j = i;
      while (j < rows.length && rows[j].first === first) j += 1;
      rows[i].rowSpanFirst = j - i;
      for (let k = i + 1; k < j; k += 1) rows[k].rowSpanFirst = 0;

      let m = i;
      while (m < j) {
        const second = rows[m].second;
        let n = m;
        while (n < j && rows[n].second === second) n += 1;
        rows[m].rowSpanSecond = n - m;
        for (let k = m + 1; k < n; k += 1) rows[k].rowSpanSecond = 0;
        m = n;
      }
      i = j;
    }
    return { rows, totalCount };
  }, [visibleSubmissions]);

  const top3CsvRows = useMemo(() => {
    const header = ["First Letter", "Second Letter", "Third Letter", "Count", "Students"];
    const rows = top3HierarchyRows.rows.map((group) => {
      const studentList = group.students
        .map((student) => {
          const showSchool = !lockSchoolToUser && student.school && student.school !== "Unknown";
          return showSchool ? `${student.name} (${student.school})` : student.name;
        })
        .join("; ");
      return [group.first, group.second, group.third, group.count, studentList];
    });
    rows.push(["Total", "", "", top3HierarchyRows.totalCount, ""]);
    return [header, ...rows];
  }, [top3HierarchyRows, lockSchoolToUser]);

  const sortedSubmissions = useMemo(() => {
    const list = [...visibleSubmissions];
    list.sort((a, b) => {
      const pa = a.participant || a.profile || {};
      const pb = b.participant || b.profile || {};
      const nameA = (pa.name || pa.email || "").toLowerCase();
      const nameB = (pb.name || pb.email || "").toLowerCase();
      const schoolA = (pa.school || "").toLowerCase();
      const schoolB = (pb.school || "").toLowerCase();
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
  }, [visibleSubmissions, tableSort]);
  const pagedSubmissions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedSubmissions.slice(start, start + PAGE_SIZE);
  }, [sortedSubmissions, page]);
  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [activeSchoolFilter, submissions.length, tableSort]);
  const sortedModalSubmissions = useMemo(() => {
    const list = [...visibleSubmissions];
    list.sort((a, b) => {
      const pa = a.participant || a.profile || {};
      const pb = b.participant || b.profile || {};
      const nameA = (pa.name || pa.email || "").toLowerCase();
      const nameB = (pb.name || pb.email || "").toLowerCase();
      const schoolA = (pa.school || "").toLowerCase();
      const schoolB = (pb.school || "").toLowerCase();
      const tsA = new Date(a.ts || a.created_at || pa.finished_at || pa.started_at || 0).getTime();
      const tsB = new Date(b.ts || b.created_at || pb.finished_at || pb.started_at || 0).getTime();
      if (bulkSort === "school" || bulkSort === "school_desc") {
        const cmp = schoolA.localeCompare(schoolB) || nameA.localeCompare(nameB);
        return bulkSort === "school_desc" ? -cmp : cmp;
      }
      if (bulkSort === "ts" || bulkSort === "ts_desc") {
        const cmp = (Number.isFinite(tsA) ? tsA : 0) - (Number.isFinite(tsB) ? tsB : 0);
        return bulkSort === "ts_desc" ? -cmp : cmp;
      }
      const cmp = nameA.localeCompare(nameB) || schoolA.localeCompare(schoolB);
      return bulkSort === "name_desc" ? -cmp : cmp;
    });
    return list;
  }, [visibleSubmissions, bulkSort]);
  useEffect(() => {
    setPage(1);
  }, [activeSchoolFilter, submissions.length]);

  // Render full Results layout to canvas, then into PDF
  // Render full Results layout to PDF (multi-page, matches single export)
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();
  const crc32 = (buf) => {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  const buildZip = (files) => {
    const encoder = new TextEncoder();
    let offset = 0;
    const parts = [];
    const central = [];
    files.forEach(({ name, data }) => {
      const nameBuf = encoder.encode(name);
      const crc = crc32(data);
      const size = data.length;
      const localHeader = new Uint8Array(30 + nameBuf.length);
      const view = new DataView(localHeader.buffer);
      view.setUint32(0, 0x04034b50, true); // local file header signature
      view.setUint16(4, 20, true); // version needed
      view.setUint16(6, 0, true); // flags
      view.setUint16(8, 0, true); // method store
      view.setUint16(10, 0, true); // time
      view.setUint16(12, 0, true); // date
      view.setUint32(14, crc, true);
      view.setUint32(18, size, true);
      view.setUint32(22, size, true);
      view.setUint16(26, nameBuf.length, true);
      view.setUint16(28, 0, true); // extra length
      localHeader.set(nameBuf, 30);
      const fileRecord = new Uint8Array(localHeader.length + data.length);
      fileRecord.set(localHeader, 0);
      fileRecord.set(data, localHeader.length);
      parts.push(fileRecord);

      const centralHeader = new Uint8Array(46 + nameBuf.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // central file header signature
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0, true); // flags
      cv.setUint16(10, 0, true); // method
      cv.setUint16(12, 0, true); // time
      cv.setUint16(14, 0, true); // date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBuf.length, true);
      cv.setUint16(30, 0, true); // extra
      cv.setUint16(32, 0, true); // comment
      cv.setUint16(34, 0, true); // disk number
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, offset, true); // local header offset
      centralHeader.set(nameBuf, 46);
      central.push(centralHeader);
      offset += fileRecord.length;
    });
    const centralSize = central.reduce((sum, c) => sum + c.length, 0);
    const centralOffset = offset;
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); // end of central dir
    ev.setUint16(4, 0, true); // disk number
    ev.setUint16(6, 0, true); // central dir start disk
    ev.setUint16(8, files.length, true); // entries this disk
    ev.setUint16(10, files.length, true); // total entries
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralOffset, true);
    ev.setUint16(20, 0, true); // comment length

    const totalSize = offset + centralSize + end.length;
    const zip = new Uint8Array(totalSize);
    let cursor = 0;
    parts.forEach((p) => { zip.set(p, cursor); cursor += p.length; });
    central.forEach((c) => { zip.set(c, cursor); cursor += c.length; });
    zip.set(end, cursor);
    return new Blob([zip], { type: "application/zip" });
  };

  const handleBulkExport = async (entries) => {
    if (!entries || !entries.length) {
      alert("Please select at least one submission.");
      return;
    }
    setBulkStatus("Preparing PDFs...");
    setBulkProgress(0);
    try {
      const files = [];
      for (let i = 0; i < entries.length; i++) {
        const sub = entries[i];
        const pdfData = await renderSubmissionToPdfA3(sub, { fromAdmin: true });
        const nameSafe =
          (sub.participant?.name || sub.profile?.name || `student-${i + 1}`)
            .replace(/[^a-z0-9-_]+/gi, "_")
            .replace(/^_+|_+$/g, "") || `student-${i + 1}`;
        const fileName = `${nameSafe || "submission"}-${sub.id || i + 1}.pdf`;
        files.push({ name: fileName, data: pdfData });
        setBulkStatus(`Rendering ${i + 1} of ${entries.length}`);
        setBulkProgress(Math.round(((i + 1) / entries.length) * 85)); // up to 85% during render
      }
      setBulkStatus("Zipping files...");
      setBulkProgress(95);
      const zipBlob = buildZip(files);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        const safeSchoolName = (activeSchoolFilter || "school").replace(/\s+/g, "_");
        a.download = `${safeSchoolName || "school"}_submissions.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBulkProgress(100);
      setTimeout(() => {
        setBulkStatus("");
        setBulkProgress(0);
      }, 1500);
    } catch (err) {
      console.error("Bulk export failed", err);
      alert(err?.message || "Failed to generate bulk export.");
    } finally {
      if (bulkProgress === 0) {
        setBulkStatus("");
      }
    }
  };

  useEffect(() => {
    if (!bulkActive) {
      return;
    }

    const fireResize = () => {
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (err) {
        console.warn("Bulk export resize dispatch failed", err);
      }
    };

    fireResize();
    const resizeTimer = setTimeout(fireResize, 150);
    const printTimer = setTimeout(() => {
      fireResize();
      try {
        window.print();
      } catch (err) {
        console.error("Failed to start bulk print", err);
      }
    }, 700);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(printTimer);
    };
  }, [bulkActive]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setBulkSet(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const openPreviewPdf = async (submission) => {
    try {
      const pdfData = await renderSubmissionToPdfA3(submission, { fromAdmin: true });
      const blob = new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        // Fallback: trigger a download if the popup was blocked
        const a = document.createElement("a");
        a.href = url;
        a.download = "preview.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return win;
    } catch (err) {
      console.error("Preview PDF failed", err);
      alert("Failed to open preview PDF.");
    }
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
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
      const hydratedRows = await hydrateRowsWithProfiles(rows);
      const demoTs = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const demoProfile = {
        email: "demo@example.com",
        name: "Demo Student",
        school: "Preview Academy",
        class_name: "Grade 11",
        phone: "+961 70 123 456",
      };
      const demo = {
        id: "demo-career",
        ts: demoTs,
        riasec_code: "RIA",
        participant: {
          ...demoProfile,
          started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          finished_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        },
        profile_match: demoProfile,
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
      const finalRows = [demo, ...(hydratedRows || [])];
      setSubmissions(finalRows);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleViewSubmission = async (submission, event) => {
    if (!canViewSubmission(submission)) {
      alert("You can only view results for students in your school.");
      return;
    }
    const isNewTab = event && (event.ctrlKey || event.metaKey || event.button === 1 || event.type === "auxclick");
    if (isNewTab) {
      event.preventDefault();
      await openPreviewPdf(submission);
      return;
    }
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


  const printContainerStyle = bulkActive
    ? {
        position: "fixed",
        inset: 0,
        width: "100vw",
        minHeight: "100vh",
        padding: "20px 0",
        background: "#ffffff",
        overflowY: "auto",
        visibility: "hidden",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }
    : { display: "none" };

  return (
    <PageWrap>
      <style>
        {`
          @media print {
            .bulk-hide-print { display: none !important; }
            .bulk-print-wrap {
              visibility: visible !important;
              opacity: 1 !important;
              pointer-events: auto !important;
              position: static !important;
              inset: auto !important;
              width: 100% !important;
              min-height: auto !important;
              overflow: visible !important;
              z-index: auto !important;
            }
          }
        `}
      </style>

      <div className={`admin-bulk-screen${bulkActive ? " bulk-hide-print" : ""}`}>
        <HeaderBar
          title="Test Submissions"
          right={null}
        />

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent Test Submissions</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn
                variant="secondary"
                onClick={async () => {
                  await Promise.all([fetchSubmissions(), canManageSubmissions ? loadStudentCounts() : Promise.resolve()]);
                }}
                disabled={loading || studentCountsLoading}
              >
                {loading || studentCountsLoading ? "Refreshing..." : "Refresh"}
              </Btn>
              {canManageSubmissions && (
                <Btn
                  variant="primary"
                  onClick={() =>
                    onNavigate("test", {
                      preview: true,
                      previewTitle: "Career Test Preview",
                    })
                  }
                >
                  Preview Career Test
                </Btn>
              )}
            </div>
          </div>
          {canManageSubmissions && (
            <p style={{ color: "#6b7280", marginTop: 8 }}>
              Open the full Career Guidance test in preview mode to review the experience. No data is saved while in preview.
            </p>
          )}

          {canManageSubmissions && bulkSet?.school && bulkEntries.length > 0 && (
            <div
              className="no-print"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                color: "#065f46",
                fontSize: 13,
              }}
            >
              Preparing PDF for {bulkEntries.length}{" "}
              {bulkEntries.length === 1 ? "submission" : "submissions"} from{" "}
              <strong>{bulkSet.school}</strong>. The print dialog will open shortly.
            </div>
          )}

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading test submissions...</p>
          ) : visibleSubmissions.length > 0 ? (
            <>
              <AdminTable
                submissions={pagedSubmissions}
                onViewSubmission={handleViewSubmission}
                onDeleteSubmission={canManageSubmissions ? handleDeleteSubmission : null}
                allowDelete={canManageSubmissions}
                allowEdit={canManageSubmissions}
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
            <p style={{ color: "#6b7280" }}>
              {activeSchoolFilter
                ? `No submissions found for ${activeSchoolFilter} yet.`
                : "No submissions available."}
            </p>
          )}

          {canManageSubmissions && !loading && (
            <div
              className="no-print"
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, color: "#111827" }}>Incomplete by School</h4>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Rules: {">="} {Math.round(MIN_COMPLETION_PCT * 100)}% answered and {">="} {MIN_DURATION_MINUTES_NEW} min (150Q) / {">="} {MIN_DURATION_MINUTES_OLD} min (300Q)
                </div>
              </div>
              {incompleteBySchoolRows.rows.length ? (
                <div style={{ overflowX: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>School</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Students</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Participants</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Incomplete</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incompleteBySchoolRows.rows.map((row) => {
                        const pct = row.total > 0 ? row.incomplete / row.total : 0;
                        const schoolKey = normalizeSchool(row.school);
                        const studentCount =
                          studentCountsLoaded ? (studentCountsBySchool[schoolKey] || 0) : null;
                        return (
                          <tr key={row.school} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: 12 }}>{row.school}</td>
                            <td style={{ padding: 12 }}>
                              {studentCountsLoading ? "..." : studentCountsLoaded ? studentCount : "-"}
                            </td>
                            <td style={{ padding: 12 }}>{row.total}</td>
                            <td style={{ padding: 12, fontWeight: 700, color: row.incomplete ? "#b91c1c" : "#111827" }}>
                              {row.incomplete}
                            </td>
                            <td style={{ padding: 12 }}>{Math.round(pct * 100)}%</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #e5e7eb" }}>
                        <td style={{ padding: 12, fontWeight: 800 }}>Total</td>
                        <td style={{ padding: 12 }} />
                        <td style={{ padding: 12, fontWeight: 800 }}>{incompleteBySchoolRows.totalAll}</td>
                        <td style={{ padding: 12, fontWeight: 800 }}>{incompleteBySchoolRows.totalIncomplete}</td>
                        <td style={{ padding: 12, fontWeight: 800 }}>
                          {incompleteBySchoolRows.totalAll > 0
                            ? `${Math.round((incompleteBySchoolRows.totalIncomplete / incompleteBySchoolRows.totalAll) * 100)}%`
                            : "0%"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ marginTop: 8, color: "#6b7280" }}>No submissions available.</div>
              )}
              {studentCountsError && (
                <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
                  Student account counts unavailable: {studentCountsError}
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div
              className="no-print"
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, color: "#111827" }}>Top 3 Letter Groups</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    Grouped by first, then second, then third letter. Matching letters are merged.
                  </div>
                  <Btn
                    variant="secondary"
                    onClick={() => downloadCsv("top3_letter_groups.csv", top3CsvRows)}
                    disabled={!top3HierarchyRows.rows.length}
                  >
                    Export CSV
                  </Btn>
                </div>
              </div>
              {top3HierarchyRows.rows.length ? (
                <div style={{ overflowX: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>1st Letter</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>2nd Letter</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>3rd Letter</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Students</th>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top3HierarchyRows.rows.map((group, index) => {
                        const visible = group.students.slice(0, 8);
                        const remaining = group.students.length - visible.length;
                        return (
                          <tr key={`${group.first}-${group.second}-${group.third}-${index}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            {group.rowSpanFirst > 0 && (
                              <td style={{ padding: 12, fontWeight: 700 }} rowSpan={group.rowSpanFirst}>
                                {group.first}
                              </td>
                            )}
                            {group.rowSpanSecond > 0 && (
                              <td style={{ padding: 12, fontWeight: 700 }} rowSpan={group.rowSpanSecond}>
                                {group.second}
                              </td>
                            )}
                            <td style={{ padding: 12, fontWeight: 700 }}>{group.third}</td>
                            <td style={{ padding: 12 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {visible.map((student, idx) => {
                                  const showSchool = !lockSchoolToUser && student.school && student.school !== "Unknown";
                                  const label = showSchool ? `${student.name} (${student.school})` : student.name;
                                  return (
                                    <span
                                      key={`${group.first}-${group.second}-${group.third}-${idx}`}
                                      style={{
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        background: "#f1f5f9",
                                        border: "1px solid #e2e8f0",
                                        fontSize: 12,
                                        color: "#0f172a",
                                      }}
                                      title={label}
                                    >
                                      {label}
                                    </span>
                                  );
                                })}
                                {remaining > 0 && (
                                  <span style={{ fontSize: 12, color: "#64748b" }}>+{remaining} more</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: 12 }}>{group.count}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #e5e7eb" }}>
                        <td style={{ padding: 12, fontWeight: 800 }} colSpan={4}>
                          Total
                        </td>
                        <td style={{ padding: 12, fontWeight: 800 }}>{top3HierarchyRows.totalCount}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ marginTop: 8, color: "#6b7280" }}>No grouped results yet.</div>
              )}
            </div>
          )}

          <div
            className="no-print"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
            {canManageSubmissions &&
              (bulkStatus ? (
                <div
                  style={{
                    minWidth: 140,
                    maxWidth: 200,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#0f172a",
                    color: "#e2e8f0",
                    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.22)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 999,
                      background: "#1e293b",
                      overflow: "hidden",
                      boxShadow: "inset 0 0 0 1px #0b1220",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, bulkProgress || 5))}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #38bdf8, #6366f1)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#cbd5e1", minWidth: 32, textAlign: "right" }}>
                    {bulkProgress || 5}%
                  </span>
                </div>
              ) : (
                <Btn
                  variant="primary"
                  onClick={() => {
                    setBulkSelectedIds(visibleSubmissions.map((s) => s.id));
                    setBulkModalOpen(true);
                  }}
                  disabled={bulkActive || visibleSubmissions.length === 0}
                  style={
                    bulkActive || !visibleSubmissions.length
                      ? { opacity: 0.6, cursor: "not-allowed" }
                      : undefined
                  }
                >
                  Export ZIP
                </Btn>
              ))}
          </div>
        </Card>
      </div>

      {canManageSubmissions && bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            padding: 12,
          }}
          onClick={() => setBulkModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              width: "min(720px, 95vw)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Select submissions</h3>
              <Btn variant="back" onClick={() => setBulkModalOpen(false)}>Close</Btn>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <Btn
                variant="secondary"
                onClick={() => setBulkSelectedIds(sortedModalSubmissions.map((s) => s.id))}
              >
                Select all
              </Btn>
              <Btn variant="back" onClick={() => setBulkSelectedIds([])}>Clear</Btn>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#4b5563" }}>
                Selected {bulkSelectedIds.length} of {sortedModalSubmissions.length}
              </div>
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 8, textAlign: "left" }}></th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "name" ? "name_desc" : "name"))}
                    >
                      Name {bulkSort.startsWith("name") ? (bulkSort === "name" ? "▲" : "▼") : ""}
                    </th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "school" ? "school_desc" : "school"))}
                    >
                      School {bulkSort.startsWith("school") ? (bulkSort === "school" ? "▲" : "▼") : ""}
                    </th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "ts" ? "ts_desc" : "ts"))}
                    >
                      Submitted {bulkSort.startsWith("ts") ? (bulkSort === "ts" ? "▲" : "▼") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModalSubmissions.map((sub) => {
                    const p = sub.participant || sub.profile || {};
                    const checked = bulkSelectedIds.includes(sub.id);
                    const ts = sub.ts || sub.created_at || p.finished_at || null;
                    const dateStr = ts ? new Date(ts).toLocaleString() : "-";
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(bulkSelectedIds);
                              if (e.target.checked) next.add(sub.id);
                              else next.delete(sub.id);
                              setBulkSelectedIds(Array.from(next));
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>{p.name || p.email || "-"}</td>
                        <td style={{ padding: 8 }}>{p.school || "-"}</td>
                        <td style={{ padding: 8 }}>{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setBulkModalOpen(false)}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={bulkSelectedIds.length === 0 || bulkActive}
                onClick={() => {
                  const selected = visibleSubmissions.filter((s) => bulkSelectedIds.includes(s.id));
                  if (!selected.length) return;
                  setBulkModalOpen(false);
                  setBulkPreviewList(selected);
                  setBulkPreviewIndex(0);
                  setBulkPreviewOpen(true);
                }}
              >
                {bulkActive ? "Working..." : "Export"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      <div
        className="bulk-print-wrap"
        aria-hidden="true"
        style={printContainerStyle}
      >
        {bulkEntries.map((submission, index) => {
          const isLast = index === bulkEntries.length - 1;
          return (
            <div
              key={submission.id || index}
              style={{
                marginBottom: isLast ? 0 : 32,
                pageBreakAfter: isLast ? "auto" : "always",
                breakAfter: isLast ? "auto" : "page",
              }}
            >
              <Results
                submission={submission}
                fromAdmin
                onNavigate={() => {}}
              />
            </div>
          );
        })}
      </div>

      {canManageSubmissions && bulkPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1500,
            padding: 12,
          }}
          onClick={() => {
            setBulkPreviewOpen(false);
            setBulkPreviewList([]);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              width: "min(900px, 95vw)",
              height: "min(90vh, 820px)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  Preview {bulkPreviewIndex + 1} of {bulkPreviewList.length}
                </h3>
                <div style={{ fontSize: 12, color: "#4b5563" }}>
                  {bulkPreviewList[bulkPreviewIndex]?.participant?.name ||
                    bulkPreviewList[bulkPreviewIndex]?.profile?.name ||
                    "Submission"}
                </div>
              </div>
              <Btn variant="back" onClick={() => { setBulkPreviewOpen(false); setBulkPreviewList([]); }}>
                Close
              </Btn>
            </div>
            <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#f9fafb" }}>
              {bulkPreviewList[bulkPreviewIndex] ? (
                <Results submission={bulkPreviewList[bulkPreviewIndex]} fromAdmin onNavigate={() => {}} />
              ) : (
                <p style={{ color: "#6b7280" }}>No submission selected.</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="secondary"
                  onClick={() => openPreviewPdf(bulkPreviewList[bulkPreviewIndex])}
                  disabled={!bulkPreviewList[bulkPreviewIndex]}
                >
                  Open PDF preview / print
                </Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="secondary"
                  onClick={() => setBulkPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={bulkPreviewIndex === 0}
                >
                  Previous
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => setBulkPreviewIndex((i) => Math.min(bulkPreviewList.length - 1, i + 1))}
                  disabled={bulkPreviewIndex >= bulkPreviewList.length - 1}
                >
                  Next
                </Btn>
                <Btn
                variant="primary"
                onClick={() => {
                  setBulkPreviewOpen(false);
                  handleBulkExport(bulkPreviewList);
                }}
                  disabled={!bulkPreviewList.length || bulkActive}
                >
                  Start ZIP export
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageWrap>
  );
}
