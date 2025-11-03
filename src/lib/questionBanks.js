// Shared configuration for question banks
export const SUBJECT_OPTIONS = [
  { value: "english", label: { EN: "English", AR: "اللغة الإنجليزية", FR: "Anglais" } },
  { value: "math", label: { EN: "Math", AR: "الرياضيات", FR: "Mathématiques" } },
];

export const HARDNESS_OPTIONS = [
  { value: "easy", label: { EN: "Easy", AR: "سهل", FR: "Facile" } },
  { value: "medium", label: { EN: "Medium", AR: "متوسط", FR: "Moyen" } },
  { value: "hard", label: { EN: "Hard", AR: "صعب", FR: "Difficile" } },
];

export const MATH_UNIT_OPTIONS = [
  { value: "algebra", label: { EN: "Algebra", AR: "الجبر", FR: "Algèbre" } },
  { value: "arithmetic", label: { EN: "Arithmetic", AR: "الحساب", FR: "Arithmétique" } },
  { value: "geometry", label: { EN: "Geometry", AR: "الهندسة", FR: "Géométrie" } },
];

export const MATH_LESSON_OPTIONS = {
  algebra: [
    { value: "fractions-and-decimals", label: { EN: "Fractions and Decimals", AR: "الكسور والأعداد العشرية", FR: "Fractions et décimales" } },
    { value: "polynomials", label: { EN: "Polynomials", AR: "المتعددات الحدودية", FR: "Polynômes" } },
    { value: "solving-equations", label: { EN: "Solving Equations", AR: "حل المعادلات", FR: "Résolution d'équations" } },
    { value: "word-problems", label: { EN: "Word Problems", AR: "مسائل لفظية", FR: "Problèmes rédactionnels" } },
  ],
  arithmetic: [
    { value: "percentage", label: { EN: "Percentage", AR: "النسب المئوية", FR: "Pourcentage" } },
    { value: "average", label: { EN: "Average", AR: "المتوسط", FR: "Moyenne" } },
    { value: "ratio", label: { EN: "Ratio", AR: "النسبة", FR: "Ratio" } },
    { value: "proportion-rate", label: { EN: "Proportions and Rate", AR: "التناسب والمعدلات", FR: "Proportions et taux" } },
    { value: "counting-probability", label: { EN: "Counting and Probability", AR: "الإحصاء والاحتمالات", FR: "Combinatoire et probabilités" } },
    { value: "data-interpretation", label: { EN: "Interpretation of Data", AR: "تحليل البيانات", FR: "Interprétation des données" } },
  ],
  geometry: [
    { value: "lines-angles", label: { EN: "Lines and Angles", AR: "الخطوط والزوايا", FR: "Lignes et angles" } },
    { value: "triangles", label: { EN: "Triangles", AR: "المثلثات", FR: "Triangles" } },
    { value: "quadrilaterals", label: { EN: "Quadrilaterals", AR: "الأشكال الرباعية", FR: "Quadrilatères" } },
    { value: "circles", label: { EN: "Circles", AR: "الدوائر", FR: "Cercles" } },
    { value: "solid-geometry", label: { EN: "Solid Geometry", AR: "الهندسة الفضائية", FR: "Géométrie dans l'espace" } },
    { value: "coordinate-geometry", label: { EN: "Coordinate Geometry", AR: "الهندسة الإحداثية", FR: "Géométrie analytique" } },
    { value: "trigonometry", label: { EN: "Trigonometry", AR: "علم المثلثات", FR: "Trigonométrie" } },
  ],
};

const DEFAULT_ASSIGNMENT_TABLE = import.meta.env.VITE_ASSIGNMENT_QUESTIONS_TABLE || "assignment_questions";
const ENGLISH_TABLE = import.meta.env.VITE_ENGLISH_BANK_TABLE || "english_questions";
const TEST_TABLE = import.meta.env.VITE_TEST_BANK_TABLE || "test_questions";

export const BANKS = {
  math: {
    id: "math",
    labelKey: "tabMath",
    table: DEFAULT_ASSIGNMENT_TABLE,
    supportsUnitLesson: true,
    subjectLocked: true,
    defaultSubject: "math",
  },
  english: {
    id: "english",
    labelKey: "tabEnglish",
    table: ENGLISH_TABLE,
    supportsUnitLesson: false,
    subjectLocked: true,
    defaultSubject: "english",
  },
  tests: {
    id: "tests",
    labelKey: "tabTests",
    table: TEST_TABLE,
    supportsUnitLesson: true,
    subjectLocked: false,
    defaultSubject: "math",
  },
};

export const getBankConfig = (id) => BANKS[id] || BANKS.math;

export const createDefaultForm = (bank = BANKS.math) => ({
  questionType: "mcq",
  question: "",
  answerA: "",
  answerB: "",
  answerC: "",
  answerD: "",
  fillAnswer: "",
  correctAnswer: "A",
  subject: bank.subjectLocked ? bank.defaultSubject : bank.defaultSubject || SUBJECT_OPTIONS[0].value,
  unit: bank.supportsUnitLesson ? "" : "",
  lesson: bank.supportsUnitLesson ? "" : "",
  hardness: "",
  skill: "",
  imageUrl: "",
});

export const normalizeSubjectValue = (value) => {
  if (!value) return SUBJECT_OPTIONS[0].value;
  const normalized = value.trim().toLowerCase();
  const match = SUBJECT_OPTIONS.find((opt) => {
    const optValue = opt.value.toLowerCase();
    const optLabels = Object.values(opt.label || {}).map((label) => String(label || "").toLowerCase());
    return optValue === normalized || optLabels.includes(normalized);
  });
  return match ? match.value : SUBJECT_OPTIONS[0].value;
};

export const mapBankQuestionToResource = (row = {}) => {
  const question = String(row.question || row.prompt || "").trim();
  if (!question) return null;
  const type = String(row.question_type || row.type || "mcq").toLowerCase();
  const isFill = type === "fill" || type === "text" || type === "free";
  const choiceEntries = [
    { value: "A", label: row.answer_a || row.answerA || "" },
    { value: "B", label: row.answer_b || row.answerB || "" },
    { value: "C", label: row.answer_c || row.answerC || "" },
    { value: "D", label: row.answer_d || row.answerD || "" },
  ].filter((choice) => String(choice.label || "").trim().length > 0);
  const hasChoices = choiceEntries.length > 0;
  const fallbackId = row.id || row.uuid || row.question_id || `bank_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item = {
    id: fallbackId,
    text: question,
    choices: hasChoices ? choiceEntries : [],
    correct: null,
    skill: row.skill || row.topic || row.category || null,
    answerType: hasChoices ? "choice" : isFill ? "text" : "numeric",
    imageUrl: row.image_url || row.imageUrl || null,
  };
  if (hasChoices) {
    const raw = String(row.correct_answer || row.correct || "").trim().toUpperCase();
    item.correct = ["A", "B", "C", "D"].includes(raw) ? raw : null;
  } else {
    const raw = String(row.correct_answer || row.correct || row.fill_answer || "").trim();
    item.correct = raw || null;
    item.answerType = isFill ? "text" : "numeric";
  }
  return item;
};
