// src/sat/questions.js
// CSV-backed SAT RW module loader + minimal Math fallback. Replace/expand as needed.

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

// Load RW Module 1 from csv in this folder
export async function loadRWModules() {
  try {
    // Vite will turn ?url into an asset URL we can fetch
    const csvUrl = (await import('./english_section_module1.csv?url')).default;
    const res = await fetch(csvUrl);
    const txt = await res.text();
    const rows = parseCSV(txt);
    // Expect header like: #,Question,Answer A,Answer B,Answer C,Answer D,Correct Answer,Skill
    const header = rows[0] || [];
    const col = (name) => header.findIndex(h => String(h).trim().toLowerCase() === name);
    const idx = {
      num: col('#'),
      question: col('question'),
      a: col('answer a'),
      b: col('answer b'),
      c: col('answer c'),
      d: col('answer d'),
      correct: col('correct answer'),
      skill: col('skill'),
    };
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 2) continue;
      const num = (idx.num >= 0 ? r[idx.num] : String(i)).trim();
      const qtext = (idx.question >= 0 ? r[idx.question] : '').trim();
      const A = (idx.a >= 0 ? r[idx.a] : '').trim();
      const B = (idx.b >= 0 ? r[idx.b] : '').trim();
      const C = (idx.c >= 0 ? r[idx.c] : '').trim();
      const D = (idx.d >= 0 ? r[idx.d] : '').trim();
      const correct = (idx.correct >= 0 ? r[idx.correct] : '').trim().replace(/[^A-D]/ig, '').toUpperCase();
      if (!qtext) continue;
      const id = `rw1_q${num || i}`;
      const choices = [
        { value: 'A', label: A },
        { value: 'B', label: B },
        { value: 'C', label: C },
        { value: 'D', label: D },
      ];
      items.push({ id, text: qtext, passage: null, choices, correct: correct || null });
    }
    // Return two modules; csv as first, empty second (to be filled later)
    return [items, []];
  } catch (e) {
    console.warn('Failed to load RW csv; using fallback.', e);
    return [
      [
        { id: 'rw1_q1', text: 'Choose the best revision.', passage: 'The committee have decided.', choices: [
          { value: 'A', label: 'have decided' }, { value: 'B', label: 'has decided' }, { value: 'C', label: 'having decided' }, { value: 'D', label: 'decide' },
        ], correct: 'B' },
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
