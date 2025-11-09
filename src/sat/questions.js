// src/sat/questions.js
// CSV-backed or Supabase-backed SAT RW module loader + minimal Math fallback.

import { supabase } from "../lib/supabase.js";

// --- Minimal CSV parser that supports quoted fields and newlines inside quotes ---
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
        // handle CRLF / LF
        if (c === '\r' && next === '\n') { i++; }
        row.push(field); field = '';
        if (row.length && !(row.length === 1 && row[0] === '')) rows.push(row);
        row = [];
      } else { field += c; }
    }
  }
  // flush trailing
  row.push(field);
  if (row.length && !(row.length === 1 && row[0] === '')) rows.push(row);
  return rows;
}

const normalizeHeaderName = (value) => String(value || "").trim().toLowerCase();

const ENGLISH_SKILL_KEY_MAP = {
  "central ideas and details": "central_ideas",
  "cross-text connections": "cross_text",
  "cross text connections": "cross_text",
  "inference": "inference",
  "interpreting data": "interpreting_data",
  "modifier placement": "modifier",
  "parallel structure": "parallel",
  "pronoun usage": "pronoun",
  "punctuation rules": "punctuation",
  "rhetorical purpose & point of view": "rhetoric",
  "rhetorical purpose and point of view": "rhetoric",
  "text structure and purpose": "text_structure",
  "textual command of evidence": "evidence",
  "transitions": "transitions",
  "verbs agreement": "verbs",
  "vocabulary in context": "vocab",
};

export function normalizeEnglishSkill(value) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label) return { key: null, label: "" };
  const normalized = label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const key = ENGLISH_SKILL_KEY_MAP[normalized] || (normalized ? normalized.replace(/\s+/g, "_") : null);
  return { key, label };
}

export function normalizeDifficulty(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return null;
  if (raw.startsWith("easy")) return "easy";
  if (raw.startsWith("medium")) return "medium";
  if (raw.startsWith("hard")) return "hard";
  return raw.replace(/\s+/g, "_");
}

const DEFAULT_RW_MODULES = 2;
const DEFAULT_RW_PER_MODULE = 28;
const DEFAULT_RW_TOTAL = DEFAULT_RW_MODULES * DEFAULT_RW_PER_MODULE;

const mapEnglishRow = (row, idx, prefix = "rw_db") => {
  const qtext = String(row.question || row.prompt || "").trim();
  if (!qtext) return null;
  const rawSkill = row.skill || row.skills || "";
  const skillInfo = normalizeEnglishSkill(rawSkill);
  const difficultyRaw = row.difficulty || row.level || "";
  const difficultyKey = normalizeDifficulty(difficultyRaw);
  const choices = [
    { value: "A", label: row.answer_a || row.answerA || "" },
    { value: "B", label: row.answer_b || row.answerB || "" },
    { value: "C", label: row.answer_c || row.answerC || "" },
    { value: "D", label: row.answer_d || row.answerD || "" },
  ].filter((ch) => String(ch.label || "").trim().length > 0);
  const correct = String(row.correct || row.correct_answer || "")
    .trim()
    .replace(/[^A-D]/gi, "")
    .toUpperCase();
  return {
    id: row.id || `${prefix}_${idx}`,
    text: qtext,
    passage: row.passage || null,
    choices,
    correct: correct || null,
    skill: rawSkill || skillInfo.label || null,
    skillKey: skillInfo.key || null,
    difficulty: difficultyRaw || null,
    difficultyKey,
    unit: row.unit || null,
    lesson: row.lesson || null,
  };
};

const shuffle = (array) => {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const splitIntoModules = (items, moduleCount = DEFAULT_RW_MODULES, perModule = DEFAULT_RW_PER_MODULE) => {
  if (!items.length) {
    return Array.from({ length: moduleCount }, () => []);
  }
  const modules = [];
  for (let i = 0; i < moduleCount; i += 1) {
    const start = i * perModule;
    const end = start + perModule;
    modules.push(items.slice(start, end));
  }
  return modules;
};

const missingSourceWarnings = new Set();
const shouldWarnMissing = (key) => {
  if (missingSourceWarnings.has(key)) return false;
  missingSourceWarnings.add(key);
  return true;
};
const isMissingTableError = (error) => {
  if (!error) return false;
  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "");
  if (code === "PGRST205" || code === "42501") return true;
  return /does not exist/i.test(message) || /schema cache/i.test(message) || /not found/i.test(message);
};

async function loadRWFromSupabase() {
  const table = import.meta.env.VITE_SAT_RW_TABLE || "cg_sat_questions";
  const limit = Number(import.meta.env.VITE_SAT_RW_LIMIT || 500);
  const targetCount = Number(import.meta.env.VITE_SAT_RW_TARGET || DEFAULT_RW_TOTAL);
  try {
    const { data, error } = await supabase.from(table).select("*").limit(limit);
    if (error) {
      if (isMissingTableError(error) && shouldWarnMissing(table)) {
        console.warn(`SAT questions: "${table}" not available`, error.message || error);
        return null;
      }
      throw error;
    }
    if (!data || !data.length) return null;
    const mapped = data
      .map((row, idx) => mapEnglishRow(row, idx, "rw_supabase"))
      .filter(Boolean);
    if (!mapped.length) return null;
    const randomized = shuffle(mapped);
    const selected = randomized.slice(0, Math.min(randomized.length, targetCount));
    const modules = splitIntoModules(selected, DEFAULT_RW_MODULES, DEFAULT_RW_PER_MODULE);
    return modules;
  } catch (err) {
    if (isMissingTableError(err) && shouldWarnMissing(table)) {
      console.warn(`SAT questions: "${table}" not available`, err.message || err);
      return null;
    }
    throw err;
  }
}

async function loadRWFromCSV() {
  // Vite will turn ?url into an asset URL we can fetch
  const csvUrl = (await import("./english_section_module1.csv?url")).default;
  const res = await fetch(csvUrl);
  const txt = await res.text();
  const rows = parseCSV(txt);
  // Expect header like: #,Question,Answer A,Answer B,Answer C,Answer D,Correct Answer,Skill,...
  const header = rows[0] || [];
  const col = (...names) => {
    const targets = names.map((name) => normalizeHeaderName(name));
    return header.findIndex((h) => targets.includes(normalizeHeaderName(h)));
  };
  const idx = {
    num: col("#", "question number", "number"),
    question: col("question", "question text", "prompt"),
    a: col("answer a", "a"),
    b: col("answer b", "b"),
    c: col("answer c", "c"),
    d: col("answer d", "d"),
    correct: col("correct answer", "correct"),
    skill: col("skill", "skills"),
    difficulty: col("difficulty", "level"),
    unit: col("unit", "domain"),
    lesson: col("lesson", "strand", "category"),
  };
  const items = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r || r.length < 2) continue;
    const num = (idx.num >= 0 ? r[idx.num] : String(i)).trim();
    const row = {
      question: idx.question >= 0 ? r[idx.question] : "",
      answer_a: idx.a >= 0 ? r[idx.a] : "",
      answer_b: idx.b >= 0 ? r[idx.b] : "",
      answer_c: idx.c >= 0 ? r[idx.c] : "",
      answer_d: idx.d >= 0 ? r[idx.d] : "",
      correct: idx.correct >= 0 ? r[idx.correct] : "",
      skill: idx.skill >= 0 ? r[idx.skill] : "",
      difficulty: idx.difficulty >= 0 ? r[idx.difficulty] : "",
      unit: idx.unit >= 0 ? r[idx.unit] : "",
      lesson: idx.lesson >= 0 ? r[idx.lesson] : "",
      id: `rw_csv_${num || i}`,
    };
    const mapped = mapEnglishRow(row, i, "rw_csv");
    if (mapped) items.push(mapped);
  }
  const selected = items.slice(0, Math.min(items.length, DEFAULT_RW_TOTAL));
  return splitIntoModules(selected, DEFAULT_RW_MODULES, DEFAULT_RW_PER_MODULE);
}

// Load RW Modules from Supabase first, CSV fallback
export async function loadRWModules() {
  try {
    const supabaseModules = await loadRWFromSupabase();
    if (
      supabaseModules &&
      supabaseModules.length &&
      supabaseModules.some((mod) => Array.isArray(mod) && mod.length > 0)
    ) {
      return supabaseModules;
    }
  } catch (err) {
    console.warn("Failed to load RW modules from Supabase", err);
  }
  try {
    return await loadRWFromCSV();
  } catch (e) {
    console.warn("Failed to load RW csv; using fallback.", e);
    return [
      [
        {
          id: "rw1_q1",
          text: "Choose the best revision.",
          passage: "The committee have decided.",
          choices: [
            { value: "A", label: "have decided" },
            { value: "B", label: "has decided" },
            { value: "C", label: "having decided" },
            { value: "D", label: "decide" },
          ],
          correct: "B",
        },
      ],
      [],
    ];
  }
}

export const MATH_MODULES = [
  [
    { id: "m1_q1", text: "Solve for x: 2x + 3 = 11", passage: null, choices: [
      { value: "A", label: "3" },
      { value: "B", label: "4" },
      { value: "C", label: "5" },
      { value: "D", label: "7" },
    ], correct: "B" },
  ],
  [
    { id: "m2_q1", text: "If f(x)=x^2 and g(x)=x+2, what is f(g(2))?", passage: null, choices: [
      { value: "A", label: "4" },
      { value: "B", label: "9" },
      { value: "C", label: "16" },
      { value: "D", label: "25" },
    ], correct: "C" },
  ],
];
