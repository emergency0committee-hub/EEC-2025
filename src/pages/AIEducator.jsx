// src/pages/AIEducator.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { jsPDF } from "jspdf";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import DateTimePicker from "../components/DateTimePicker.jsx";

const MAIN_TABS = [
  { key: "planning", label: "Planning" },
  { key: "materials", label: "Instructional Materials" },
  { key: "feedback", label: "Feedback & Assessment" },
];

const PLANNING_TABS = [
  { key: "lesson", label: "Lesson Planning" },
  { key: "unit", label: "Unit Planning" },
  { key: "syllabus", label: "Syllabus Planning" },
];

const GRADEBOOK_STORAGE_KEY = "ai_educator_gradebook_v1";

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const normalizeGradebookLabel = (value) => String(value || "").trim();

const buildGradebookDefaults = () => ({
  version: 1,
  students: [],
  skills: [],
  assessments: [],
  scores: {},
});

const UNIT_PLAN_SECTIONS = [
  {
    key: "unitCourseInfo",
    title: "Course Information",
    fields: [
      { name: "unitTitle", label: "Unit Title", placeholder: "e.g., Algebra: Linear Equations", type: "text" },
      { name: "unitGradeLevel", label: "Grade Level", placeholder: "Who is this unit for?", type: "text" },
      { name: "unitSubjectArea", label: "Subject Area", placeholder: "Mathematics, Science, English, etc.", type: "text" },
      { name: "unitDuration", label: "Duration", placeholder: "Number of weeks or lessons", type: "text" },
      {
        name: "unitStandards",
        label: "Standards",
        placeholder: "Curriculum benchmarks or learning standards covered.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitObjectives",
    title: "Unit Objectives",
    fields: [
      {
        name: "unitObjectives",
        label: "Objectives",
        placeholder: "Broad goals students should achieve by the end of the unit.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitVocabulary",
    title: "Key Vocabulary",
    fields: [
      {
        name: "unitVocabulary",
        label: "Vocabulary",
        placeholder: "Important words and concepts for the unit.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitEssentialQuestions",
    title: "Essential Questions",
    fields: [
      {
        name: "unitEssentialQuestions",
        label: "Questions",
        placeholder: "Guiding questions that frame the learning.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitMaterials",
    title: "Materials / Resources",
    fields: [
      {
        name: "unitMaterials",
        label: "Resources",
        placeholder: "Tools, books, and digital resources needed.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitLearningActivities",
    title: "Learning Activities",
    fields: [
      {
        name: "unitLearningActivities",
        label: "Activities",
        placeholder: "Planned tasks and experiences across the unit.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitAssessmentStrategies",
    title: "Assessment Strategies",
    fields: [
      {
        name: "unitAssessmentStrategies",
        label: "Assessments",
        placeholder: "Quizzes, projects, exams, and other evaluation methods.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitDifferentiation",
    title: "Differentiation",
    fields: [
      {
        name: "unitDifferentiation",
        label: "Differentiation",
        placeholder: "Adaptations to meet different learner needs.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitConnections",
    title: "Connections",
    fields: [
      {
        name: "unitCrossConnections",
        label: "Cross-Curricular Connections",
        placeholder: "How this unit links to other subjects.",
        type: "textarea",
      },
      {
        name: "unitRealWorldConnections",
        label: "Real-World Connections",
        placeholder: "How learning applies to real-life contexts.",
        type: "textarea",
      },
    ],
  },
  {
    key: "unitLessonSequence",
    title: "Lesson Sequence",
    fields: [],
  },
  {
    key: "unitNotes",
    title: "Notes",
    fields: [
      {
        name: "unitNotes",
        label: "Notes & Reflections",
        placeholder: "Additional comments or teacher reflections.",
        type: "textarea",
      },
    ],
  },
];

const LESSON_PLAN_SECTIONS = [
  {
    key: "lessonInfo",
    title: "Course Information",
    fields: [
      { name: "lessonTitle", label: "Lesson Title", placeholder: "e.g., Solving Two-Step Equations", type: "text" },
      { name: "lessonGradeLevel", label: "Grade Level", placeholder: "Student grade or level.", type: "text" },
      { name: "lessonSubjectArea", label: "Subject Area", placeholder: "Math, English, etc.", type: "text" },
      { name: "lessonUnitReference", label: "Unit Reference", placeholder: "Unit this lesson belongs to.", type: "text" },
      { name: "lessonDuration", label: "Lesson Duration", placeholder: "Minutes or class periods.", type: "text" },
      {
        name: "lessonStandards",
        label: "Standards Addressed",
        placeholder: "Specific curriculum standards covered.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonObjectives",
    title: "Lesson Objectives",
    fields: [
      {
        name: "lessonObjectives",
        label: "Objectives",
        placeholder: "What students should know or do by the end.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonVocabulary",
    title: "Key Vocabulary",
    fields: [
      {
        name: "lessonVocabulary",
        label: "Vocabulary",
        placeholder: "Terms students need for this lesson.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonMaterials",
    title: "Materials / Resources",
    fields: [
      {
        name: "lessonMaterials",
        label: "Resources",
        placeholder: "Physical and digital resources used.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonIntro",
    title: "Lesson Introduction (Hook / Engage)",
    fields: [
      {
        name: "lessonIntro",
        label: "Hook",
        placeholder: "How will you capture students' interest?",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonInstruction",
    title: "Instructional Activities (Explore / Explain)",
    fields: [
      {
        name: "lessonInstruction",
        label: "Instruction",
        placeholder: "Step-by-step tasks and strategies used during the lesson.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonPractice",
    title: "Practice / Application (Elaborate)",
    fields: [
      {
        name: "lessonPractice",
        label: "Practice",
        placeholder: "Guided and independent practice activities.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonAssessment",
    title: "Assessment / Evidence of Learning",
    fields: [
      {
        name: "lessonAssessment",
        label: "Assessment",
        placeholder: "How you will check understanding (exit ticket, formative check, etc.).",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonDifferentiation",
    title: "Differentiation Strategies",
    fields: [
      {
        name: "lessonDifferentiation",
        label: "Differentiation",
        placeholder: "Adjustments for struggling and advanced learners.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonClosure",
    title: "Closure",
    fields: [
      {
        name: "lessonClosure",
        label: "Closure",
        placeholder: "How you will wrap up the lesson and transition.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonHomework",
    title: "Homework / Extension",
    fields: [
      {
        name: "lessonHomework",
        label: "Homework & Extensions",
        placeholder: "Reinforcement or extension tasks after class.",
        type: "textarea",
      },
    ],
  },
  {
    key: "lessonReflection",
    title: "Teacher Reflection",
    fields: [
      {
        name: "lessonReflection",
        label: "Reflection",
        placeholder: "Notes on what worked well and what to improve.",
        type: "textarea",
      },
    ],
  },
];

const SYLLABUS_SECTIONS = [
  {
    key: "courseInfo",
    title: "Course Information",
    fields: [
      {
        name: "courseTitle",
        label: "Course Title",
        placeholder: "The official name of the course or subject (e.g., Mathematics – Grade 9).",
        type: "text",
      },
      {
        name: "duration",
        label: "Duration",
        placeholder: "The total length of the course, expressed in weeks, terms, or lessons per week.",
        type: "text",
      },
      {
        name: "credits",
        label: "Credits",
        placeholder: "Is the course mandatory, elective, or credit-bearing?",
        type: "text",
      },
    ],
  },
  {
    key: "instructorInfo",
    title: "Instructor Information",
    fields: [
      {
        name: "instructor",
        label: "Instructor",
        placeholder: "Teacher or facilitator responsible for delivering the course.",
        type: "text",
      },
      {
        name: "contact",
        label: "Contact",
        placeholder: "Email, phone, or office hours for the instructor.",
        type: "text",
      },
    ],
  },
  {
    key: "courseDescription",
    title: "Course Description",
    fields: [
      {
        name: "courseDescription",
        label: "Overview",
        placeholder: "Purpose, scope, and focus of the course. Mention relevance to exams or real life.",
        type: "textarea",
      },
    ],
  },
  {
    key: "learningOutcomes",
    title: "Learning Outcomes / Objectives",
    fields: [
      {
        name: "learningOutcomes",
        label: "Outcomes",
        placeholder: "What students should know or do by the end. Use measurable, action verbs.",
        type: "textarea",
      },
    ],
  },
  {
    key: "standards",
    title: "Curriculum Standards Alignment",
    fields: [
      {
        name: "standards",
        label: "Standards",
        placeholder: "Reference national, regional, or international benchmarks followed.",
        type: "textarea",
      },
    ],
  },
  {
    key: "courseContent",
    title: "Course Content / Topics",
    fields: [
      {
        name: "courseContent",
        label: "Units & Themes",
        placeholder: "Break down the course into units or topics with key skills/concepts.",
        type: "textarea",
      },
    ],
  },
  {
    key: "instructionalMethods",
    title: "Instructional Methods",
    fields: [
      {
        name: "instructionalMethods",
        label: "Teaching Strategies",
        placeholder: "Explain instructional approaches (group work, inquiry, technology, etc.).",
        type: "textarea",
      },
    ],
  },
  {
    key: "assessment",
    title: "Assessment & Evaluation",
    fields: [
      {
        name: "formativeAssessment",
        label: "Formative Assessment",
        placeholder: "Ongoing checks: quizzes, classwork, homework, exit tickets.",
        type: "textarea",
      },
      {
        name: "summativeAssessment",
        label: "Summative Assessment",
        placeholder: "Major evaluations: tests, exams, projects, presentations.",
        type: "textarea",
      },
      {
        name: "performanceAssessment",
        label: "Performance-Based Assessment",
        placeholder: "Real tasks requiring application (projects, surveys, labs).",
        type: "textarea",
      },
      {
        name: "gradingPolicy",
        label: "Grading Policy",
        placeholder: "How grades are weighted across assessments and participation.",
        type: "textarea",
      },
    ],
  },
  {
    key: "resources",
    title: "Resources & Materials",
    fields: [
      {
        name: "textbook",
        label: "Textbook",
        placeholder: "Official book(s) adopted for the course.",
        type: "text",
      },
      {
        name: "digitalResources",
        label: "Digital Resources",
        placeholder: "Online tools, apps, or platforms supporting learning.",
        type: "textarea",
      },
      {
        name: "supplementaryMaterials",
        label: "Print / Supplementary Materials",
        placeholder: "Extra booklets, worksheets, or past exams that reinforce learning.",
        type: "textarea",
      },
    ],
  },
  {
    key: "policies",
    title: "Class Policies",
    fields: [
      {
        name: "classPolicies",
        label: "Policies",
        placeholder: "Rules for behavior, participation, attendance, homework, deadlines, honesty.",
        type: "textarea",
      },
    ],
  },
  {
    key: "differentiation",
    title: "Differentiation & Inclusion",
    fields: [
      {
        name: "supportStruggling",
        label: "Support for Struggling Learners",
        placeholder: "Scaffolds, extra help, or intervention supports.",
        type: "textarea",
      },
      {
        name: "challengeAdvanced",
        label: "Challenge for Advanced Learners",
        placeholder: "Extensions, enrichment, or acceleration strategies.",
        type: "textarea",
      },
      {
        name: "accessibility",
        label: "Accessibility",
        placeholder: "Adaptations ensuring all students can participate meaningfully.",
        type: "textarea",
      },
    ],
  },
  {
    key: "weeklySchedule",
    title: "Weekly Calendar / Schedule",
    fields: [],
  },
  {
    key: "references",
    title: "References & Support",
    fields: [
      {
        name: "references",
        label: "References",
        placeholder: "List curriculum documents, research, or support resources consulted.",
        type: "textarea",
      },
    ],
  },
];

const createWeeklyRow = (index) => ({
  week: `Week ${index}`,
  topic: "",
  activities: "",
  assessment: "",
});

const createLessonSequenceEntry = (index) => ({
  title: `Lesson ${index}`,
  content: "",
});

const buildDefaults = () => {
  const base = {
    syllabusTitle: "Course Syllabus",
    unitPlanTitle: "Unit Plan",
    lessonPlanTitle: "Lesson Plan",
    weeklyScheduleTable: [createWeeklyRow(1)],
    unitLessonSequence: [createLessonSequenceEntry(1), createLessonSequenceEntry(2), createLessonSequenceEntry(3), createLessonSequenceEntry(4)],
  };
  SYLLABUS_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      base[field.name] = "";
    });
  });
  UNIT_PLAN_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      base[field.name] = "";
    });
  });
  LESSON_PLAN_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      base[field.name] = "";
    });
  });
  return base;
};

function useSyllabusState() {
  const [values, setValues] = useState(buildDefaults);

  const updateField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const resetAll = () => setValues(buildDefaults());

  const updateWeeklyCell = (rowIndex, key, value) => {
    setValues((prev) => {
      const nextRows = prev.weeklyScheduleTable.map((row, idx) =>
        idx === rowIndex ? { ...row, [key]: value } : row
      );
      return { ...prev, weeklyScheduleTable: nextRows };
    });
  };

  const addWeeklyRow = () => {
    setValues((prev) => {
      const nextIndex = prev.weeklyScheduleTable.length + 1;
      const nextRows = [...prev.weeklyScheduleTable, createWeeklyRow(nextIndex)];
      return { ...prev, weeklyScheduleTable: nextRows };
    });
  };

  const removeWeeklyRow = (rowIndex) => {
    setValues((prev) => {
      if (prev.weeklyScheduleTable.length === 1) return prev;
      const nextRows = prev.weeklyScheduleTable.filter((_, idx) => idx !== rowIndex);
      return { ...prev, weeklyScheduleTable: nextRows };
    });
  };

  const updateUnitSequence = (index, value) => {
    setValues((prev) => {
      const next = prev.unitLessonSequence.map((entry, idx) =>
        idx === index ? { ...entry, content: value } : entry
      );
      return { ...prev, unitLessonSequence: next };
    });
  };

  const addUnitSequenceEntry = () => {
    setValues((prev) => {
      const nextIndex = prev.unitLessonSequence.length + 1;
      return {
        ...prev,
        unitLessonSequence: [...prev.unitLessonSequence, createLessonSequenceEntry(nextIndex)],
      };
    });
  };

  const removeUnitSequenceEntry = (index) => {
    setValues((prev) => {
      if (prev.unitLessonSequence.length === 1) return prev;
      return {
        ...prev,
        unitLessonSequence: prev.unitLessonSequence.filter((_, idx) => idx !== index),
      };
    });
  };

  return {
    values,
    updateField,
    resetAll,
    updateWeeklyCell,
    addWeeklyRow,
    removeWeeklyRow,
    updateUnitSequence,
    addUnitSequenceEntry,
    removeUnitSequenceEntry,
  };
}

function useGradebookState() {
  const [gradebook, setGradebook] = useState(() => {
    if (typeof window === "undefined") return buildGradebookDefaults();
    try {
      const raw = localStorage.getItem(GRADEBOOK_STORAGE_KEY);
      if (!raw) return buildGradebookDefaults();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return buildGradebookDefaults();
      return {
        ...buildGradebookDefaults(),
        ...parsed,
        students: Array.isArray(parsed.students) ? parsed.students : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
        scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
      };
    } catch {
      return buildGradebookDefaults();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(GRADEBOOK_STORAGE_KEY, JSON.stringify(gradebook));
    } catch {}
  }, [gradebook]);

  const applyGradebook = (updater) => {
    setGradebook((prev) => {
      try {
        const next = updater(prev);
        if (!next || typeof next !== "object") return prev;
        return next;
      } catch (err) {
        console.error("gradebook update", err);
        return prev;
      }
    });
  };

  const resetGradebook = () => setGradebook(buildGradebookDefaults());

  const addStudent = (name) => {
    const clean = normalizeGradebookLabel(name);
    if (!clean) return;
    setGradebook((prev) => {
      const exists = prev.students.some((student) => student.name.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        students: [...prev.students, { id: makeId(), name: clean }],
      };
    });
  };

  const removeStudent = (studentId) => {
    setGradebook((prev) => {
      const nextStudents = prev.students.filter((student) => student.id !== studentId);
      const nextScores = { ...prev.scores };
      Object.keys(nextScores).forEach((assessmentId) => {
        const assessmentScores = nextScores[assessmentId];
        if (!assessmentScores || typeof assessmentScores !== "object") return;
        const { [studentId]: _removed, ...rest } = assessmentScores;
        nextScores[assessmentId] = rest;
      });
      return { ...prev, students: nextStudents, scores: nextScores };
    });
  };

  const addSkill = (name) => {
    const clean = normalizeGradebookLabel(name);
    if (!clean) return;
    setGradebook((prev) => {
      const exists = prev.skills.some((skill) => skill.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      return { ...prev, skills: [...prev.skills, clean] };
    });
  };

  const removeSkill = (skillName) => {
    setGradebook((prev) => {
      const nextSkills = prev.skills.filter((skill) => skill !== skillName);
      const nextAssessments = prev.assessments.map((assessment) => ({
        ...assessment,
        questions: (assessment.questions || []).map((question) =>
          question.skill === skillName ? { ...question, skill: "" } : question
        ),
      }));
      return { ...prev, skills: nextSkills, assessments: nextAssessments };
    });
  };

  const addAssessment = ({ title, date, questionCount }) => {
    const cleanTitle = normalizeGradebookLabel(title);
    if (!cleanTitle) return null;
    const count = Math.max(1, Math.min(100, parseInt(questionCount, 10) || 1));
    const id = makeId();
    const questions = Array.from({ length: count }, (_, idx) => ({
      id: `q${idx + 1}`,
      label: `Q${idx + 1}`,
      maxPoints: 1,
      skill: "",
    }));
    const assessment = { id, title: cleanTitle, date: date || "", questions };
    setGradebook((prev) => ({
      ...prev,
      assessments: [assessment, ...prev.assessments],
      scores: { ...prev.scores, [id]: prev.scores[id] || {} },
    }));
    return id;
  };

  const removeAssessment = (assessmentId) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.filter((assessment) => assessment.id !== assessmentId);
      const { [assessmentId]: _removed, ...restScores } = prev.scores || {};
      return { ...prev, assessments: nextAssessments, scores: restScores };
    });
  };

  const updateAssessmentMeta = (assessmentId, patch) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) =>
        assessment.id === assessmentId ? { ...assessment, ...patch } : assessment
      );
      return { ...prev, assessments: nextAssessments };
    });
  };

  const updateQuestionMeta = (assessmentId, questionId, patch) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) => {
        if (assessment.id !== assessmentId) return assessment;
        const nextQuestions = (assessment.questions || []).map((question) =>
          question.id === questionId ? { ...question, ...patch } : question
        );
        return { ...assessment, questions: nextQuestions };
      });
      return { ...prev, assessments: nextAssessments };
    });
  };

  const addQuestion = (assessmentId) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) => {
        if (assessment.id !== assessmentId) return assessment;
        const current = Array.isArray(assessment.questions) ? assessment.questions : [];
        const used = new Set(current.map((question) => question.id));
        let nextIndex = current.length + 1;
        while (used.has(`q${nextIndex}`)) nextIndex += 1;
        const nextId = `q${nextIndex}`;
        return {
          ...assessment,
          questions: [...current, { id: nextId, label: `Q${nextIndex}`, maxPoints: 1, skill: "" }],
        };
      });
      return { ...prev, assessments: nextAssessments };
    });
  };

  const removeQuestion = (assessmentId, questionId) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) => {
        if (assessment.id !== assessmentId) return assessment;
        const nextQuestions = (assessment.questions || []).filter((question) => question.id !== questionId);
        return { ...assessment, questions: nextQuestions };
      });
      const nextScores = { ...prev.scores };
      const assessmentScores = nextScores[assessmentId];
      if (assessmentScores && typeof assessmentScores === "object") {
        Object.keys(assessmentScores).forEach((studentId) => {
          const studentScores = assessmentScores[studentId];
          if (!studentScores || typeof studentScores !== "object") return;
          const { [questionId]: _removed, ...rest } = studentScores;
          assessmentScores[studentId] = rest;
        });
        nextScores[assessmentId] = assessmentScores;
      }
      return { ...prev, assessments: nextAssessments, scores: nextScores };
    });
  };

  const setScore = (assessmentId, studentId, questionId, score) => {
    setGradebook((prev) => {
      const nextScores = { ...(prev.scores || {}) };
      const assessmentScores = (nextScores[assessmentId] && typeof nextScores[assessmentId] === "object") ? nextScores[assessmentId] : {};
      const studentScores = (assessmentScores[studentId] && typeof assessmentScores[studentId] === "object") ? assessmentScores[studentId] : {};
      nextScores[assessmentId] = {
        ...assessmentScores,
        [studentId]: {
          ...studentScores,
          [questionId]: score,
        },
      };
      return { ...prev, scores: nextScores };
    });
  };

  return {
    gradebook,
    applyGradebook,
    resetGradebook,
    addStudent,
    removeStudent,
    addSkill,
    removeSkill,
    addAssessment,
    removeAssessment,
    updateAssessmentMeta,
    updateQuestionMeta,
    addQuestion,
    removeQuestion,
    setScore,
  };
}

function SectionField({ field, value, onChange }) {
  const baseStyles = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        style={{ ...baseStyles, minHeight: 120, resize: "vertical" }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(field.name, e.target.value)}
      placeholder={field.placeholder}
      style={baseStyles}
    />
  );
}

function PlaceholderPanel({ title, description, steps }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h3 style={{ margin: "0 0 6px", color: "#111827" }}>{title}</h3>
        <p style={{ margin: 0, color: "#6b7280" }}>{description}</p>
      </div>
      {steps?.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 20, color: "#374151" }}>
          {steps.map((step) => (
            <li key={step} style={{ marginBottom: 6 }}>
              {step}
            </li>
          ))}
        </ol>
      )}
      <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
        More AI-assisted tools are coming soon. Share outlines now and export them alongside the syllabus.
      </p>
    </div>
  );
}

function BarList({ items, color = "#4f46e5" }) {
  if (!items.length) {
    return <div style={{ color: "#6b7280" }}>No data.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>{item.label}</span>
            <span style={{ color: "#6b7280" }}>
              {Number.isFinite(item.value) ? `${Math.round(item.value)}%` : "—"}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, Number.isFinite(item.value) ? item.value : 0))}%`,
                height: "100%",
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Histogram({ values }) {
  const bins = useMemo(() => {
    const next = Array.from({ length: 10 }, (_, idx) => ({
      idx,
      label: idx === 9 ? "90–100" : `${idx * 10}–${idx * 10 + 9}`,
      count: 0,
    }));
    (values || []).forEach((raw) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      const idx = Math.max(0, Math.min(9, Math.floor(value / 10)));
      next[idx].count += 1;
    });
    return next;
  }, [values]);

  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {bins.map((bin) => (
        <div
          key={bin.label}
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr 40px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280" }}>{bin.label}</div>
          <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
            <div
              style={{
                width: `${(bin.count / maxCount) * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: "#0ea5e9",
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#111827", textAlign: "right" }}>{bin.count}</div>
        </div>
      ))}
    </div>
  );
}

function FeedbackAssessmentWorkspace() {
  const {
    gradebook,
    applyGradebook,
    resetGradebook,
    addStudent,
    removeStudent,
    addSkill,
    removeSkill,
    addAssessment,
    removeAssessment,
    updateAssessmentMeta,
    updateQuestionMeta,
    addQuestion,
    removeQuestion,
    setScore,
  } = useGradebookState();

  const [studentDraft, setStudentDraft] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(() => {
    try {
      return new Date().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  });
  const [assessmentQuestionCount, setAssessmentQuestionCount] = useState("10");
  const [activeAssessmentId, setActiveAssessmentId] = useState(gradebook.assessments[0]?.id || "");
  const [activeStudentId, setActiveStudentId] = useState(gradebook.students[0]?.id || "");
  const [gradingTab, setGradingTab] = useState("questions"); // questions | scores | analysis
  const [isNewGradingModalOpen, setIsNewGradingModalOpen] = useState(false);
  const [newGradingQuestionCount, setNewGradingQuestionCount] = useState("10");

  useEffect(() => {
    if (!gradebook.assessments.length) {
      if (activeAssessmentId) setActiveAssessmentId("");
      return;
    }
    if (!activeAssessmentId || !gradebook.assessments.some((assessment) => assessment.id === activeAssessmentId)) {
      setActiveAssessmentId(gradebook.assessments[0].id);
    }
  }, [gradebook.assessments, activeAssessmentId]);

  useEffect(() => {
    if (!gradebook.students.length) {
      if (activeStudentId) setActiveStudentId("");
      return;
    }
    if (!activeStudentId || !gradebook.students.some((student) => student.id === activeStudentId)) {
      setActiveStudentId(gradebook.students[0].id);
    }
  }, [gradebook.students, activeStudentId]);

  const activeAssessment = useMemo(
    () => gradebook.assessments.find((assessment) => assessment.id === activeAssessmentId) || null,
    [gradebook.assessments, activeAssessmentId]
  );

  const activeStudent = useMemo(
    () => gradebook.students.find((student) => student.id === activeStudentId) || null,
    [gradebook.students, activeStudentId]
  );

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const panelStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#ffffff",
  };

  const handleAddStudent = () => {
    addStudent(studentDraft);
    setStudentDraft("");
  };

  const handleAddSkill = () => {
    addSkill(skillDraft);
    setSkillDraft("");
  };

  const handleCreateAssessment = () => {
    const id = addAssessment({ title: assessmentTitle, date: assessmentDate, questionCount: assessmentQuestionCount });
    if (id) {
      setActiveAssessmentId(id);
      setAssessmentTitle("");
    }
  };

  const handleStartNewGrading = () => {
    setNewGradingQuestionCount(assessmentQuestionCount || "10");
    setIsNewGradingModalOpen(true);
  };

  const handleConfirmNewGrading = () => {
    const fallback = Math.max(1, Math.min(100, parseInt(assessmentQuestionCount, 10) || 10));
    const parsed = parseInt(String(newGradingQuestionCount ?? "").trim(), 10);
    const count = Math.max(1, Math.min(100, Number.isFinite(parsed) ? parsed : fallback));
    const countStr = String(count);
    setAssessmentQuestionCount(countStr);

    const now = (() => {
      try {
        return new Date().toISOString().slice(0, 10);
      } catch {
        return "";
      }
    })();
    const nextTitle = `Grading ${gradebook.assessments.length + 1}`;
    const id = addAssessment({ title: nextTitle, date: now, questionCount: countStr });
    if (id) {
      setActiveAssessmentId(id);
      setGradingTab("questions");
    }
    setIsNewGradingModalOpen(false);
  };

  const assessmentTotals = useMemo(() => {
    const questions = activeAssessment?.questions || [];
    const totalMax = questions.reduce((sum, question) => sum + (Number(question.maxPoints) || 0), 0);

    const perStudent = gradebook.students.map((student) => {
      const studentScores = gradebook.scores?.[activeAssessmentId]?.[student.id] || {};
      const totalScore = questions.reduce((sum, question) => {
        const raw = studentScores?.[question.id];
        const value = Number(raw);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
      const percent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      return { studentId: student.id, totalScore, percent };
    });

    const classAverage = perStudent.length ? perStudent.reduce((sum, row) => sum + row.percent, 0) / perStudent.length : 0;
    const sorted = [...perStudent].sort((a, b) => a.percent - b.percent);
    const classMedian = sorted.length ? sorted[Math.floor(sorted.length / 2)].percent : 0;
    const classMin = sorted.length ? sorted[0].percent : 0;
    const classMax = sorted.length ? sorted[sorted.length - 1].percent : 0;

    return { totalMax, perStudent, classAverage, classMedian, classMin, classMax };
  }, [activeAssessment?.questions, activeAssessmentId, gradebook.scores, gradebook.students]);

  const skillAnalysis = useMemo(() => {
    const questions = activeAssessment?.questions || [];
    const skillsFromQuestions = Array.from(
      new Set(questions.map((question) => normalizeGradebookLabel(question.skill) || "Unassigned").filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const skillMeta = skillsFromQuestions.map((skill) => {
      const related = questions.filter((question) => (normalizeGradebookLabel(question.skill) || "Unassigned") === skill);
      const maxPoints = related.reduce((sum, question) => sum + (Number(question.maxPoints) || 0), 0);
      return { skill, questionIds: related.map((question) => question.id), maxPoints };
    });

    const studentSkillPercents = {};
    gradebook.students.forEach((student) => {
      const studentScores = gradebook.scores?.[activeAssessmentId]?.[student.id] || {};
      studentSkillPercents[student.id] = skillMeta.map((meta) => {
        const scored = meta.questionIds.reduce((sum, qid) => {
          const value = Number(studentScores?.[qid]);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        const pct = meta.maxPoints > 0 ? (scored / meta.maxPoints) * 100 : 0;
        return { skill: meta.skill, percent: pct };
      });
    });

    const classSkill = skillMeta.map((meta) => {
      if (!gradebook.students.length || meta.maxPoints <= 0) return { label: meta.skill, value: 0 };
      let totalScored = 0;
      gradebook.students.forEach((student) => {
        const studentScores = gradebook.scores?.[activeAssessmentId]?.[student.id] || {};
        meta.questionIds.forEach((qid) => {
          const value = Number(studentScores?.[qid]);
          totalScored += Number.isFinite(value) ? value : 0;
        });
      });
      const denom = meta.maxPoints * gradebook.students.length;
      return { label: meta.skill, value: denom > 0 ? (totalScored / denom) * 100 : 0 };
    });

    return { studentSkillPercents, classSkill };
  }, [activeAssessment?.questions, activeAssessmentId, gradebook.scores, gradebook.students]);

  const activeStudentSkillBars = useMemo(() => {
    if (!activeStudentId) return [];
    const entries = skillAnalysis.studentSkillPercents?.[activeStudentId] || [];
    return entries.map((entry) => ({ label: entry.skill, value: entry.percent }));
  }, [activeStudentId, skillAnalysis.studentSkillPercents]);

  const activeStudentTotals = useMemo(
    () => assessmentTotals.perStudent.find((row) => row.studentId === activeStudentId) || null,
    [assessmentTotals.perStudent, activeStudentId]
  );

  const distribution = useMemo(() => assessmentTotals.perStudent.map((row) => row.percent), [assessmentTotals.perStudent]);
  const questions = activeAssessment?.questions || [];
  const totalsByStudentId = useMemo(() => {
    const next = {};
    assessmentTotals.perStudent.forEach((row) => {
      next[row.studentId] = row;
    });
    return next;
  }, [assessmentTotals.perStudent]);

  const parseClipboardGrid = (text) => {
    if (!text) return [];
    const lines = String(text).replace(/\r/g, "").split("\n");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const grid = lines.map((line) => line.split("\t"));
    if (grid.length === 1 && grid[0].length === 1 && grid[0][0] === "") return [];
    return grid;
  };

  const normalizeSkillCellValue = (skills, raw) => {
    const clean = normalizeGradebookLabel(raw);
    if (!clean) return { value: "", skillsToAdd: [] };
    const match = skills.find((skill) => skill.toLowerCase() === clean.toLowerCase());
    if (match) return { value: match, skillsToAdd: [] };
    return { value: clean, skillsToAdd: [clean] };
  };

  const handlePasteQuestionRow = (kind, startQuestionIndex) => (event) => {
    if (!activeAssessmentId) return;
    const text = event.clipboardData?.getData("text") || "";
    const grid = parseClipboardGrid(text);
    if (grid.length === 0) return;
    event.preventDefault();

    const row = grid[0] || [];
    applyGradebook((prev) => {
      const assessment = prev.assessments.find((item) => item.id === activeAssessmentId);
      if (!assessment) return prev;
      const currentQuestions = Array.isArray(assessment.questions) ? assessment.questions : [];
      const patches = {};
      const pendingSkills = new Set();

      row.forEach((cell, offset) => {
        const question = currentQuestions[startQuestionIndex + offset];
        if (!question) return;
        const raw = String(cell ?? "");
        if (kind === "label") {
          patches[question.id] = { label: raw };
          return;
        }
        if (kind === "max") {
          if (raw.trim() === "") {
            patches[question.id] = { maxPoints: "" };
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          patches[question.id] = { maxPoints: Math.max(0, parsed) };
          return;
        }
        if (kind === "skill") {
          const normalized = normalizeSkillCellValue(prev.skills, raw);
          patches[question.id] = { skill: normalized.value };
          normalized.skillsToAdd.forEach((entry) => pendingSkills.add(entry));
        }
      });

      if (Object.keys(patches).length === 0) return prev;

      const nextAssessments = prev.assessments.map((item) => {
        if (item.id !== activeAssessmentId) return item;
        const nextQuestions = (item.questions || []).map((question) => {
          const patch = patches[question.id];
          return patch ? { ...question, ...patch } : question;
        });
        return { ...item, questions: nextQuestions };
      });

      const nextSkills = pendingSkills.size ? [...prev.skills, ...Array.from(pendingSkills)] : prev.skills;
      return { ...prev, skills: nextSkills, assessments: nextAssessments };
    });
  };

  const handlePasteScores = (startStudentIndex, startQuestionIndex) => (event) => {
    if (!activeAssessmentId) return;
    const text = event.clipboardData?.getData("text") || "";
    const grid = parseClipboardGrid(text);
    if (grid.length === 0) return;
    event.preventDefault();

    applyGradebook((prev) => {
      const assessment = prev.assessments.find((item) => item.id === activeAssessmentId);
      if (!assessment) return prev;
      const currentQuestions = Array.isArray(assessment.questions) ? assessment.questions : [];
      const currentStudents = Array.isArray(prev.students) ? prev.students : [];

      const nextScores = { ...(prev.scores || {}) };
      const assessmentScores = (nextScores[activeAssessmentId] && typeof nextScores[activeAssessmentId] === "object")
        ? { ...nextScores[activeAssessmentId] }
        : {};

      grid.forEach((row, rowOffset) => {
        const student = currentStudents[startStudentIndex + rowOffset];
        if (!student) return;
        const existingStudentScores =
          assessmentScores[student.id] && typeof assessmentScores[student.id] === "object"
            ? assessmentScores[student.id]
            : {};
        const studentScores = { ...existingStudentScores };

        row.forEach((cell, colOffset) => {
          const question = currentQuestions[startQuestionIndex + colOffset];
          if (!question) return;
          const raw = String(cell ?? "");
          if (raw.trim() === "") {
            studentScores[question.id] = null;
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          const maxPoints = Math.max(0, Number(question.maxPoints) || 0);
          const clamped = Math.max(0, Math.min(maxPoints, parsed));
          studentScores[question.id] = clamped;
        });

        assessmentScores[student.id] = studentScores;
      });

      nextScores[activeAssessmentId] = assessmentScores;
      return { ...prev, scores: nextScores };
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isNewGradingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => setIsNewGradingModalOpen(false)}
        >
          <div
            style={{ ...panelStyle, width: "min(520px, 100%)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, color: "#111827" }}>Start New Grading</div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>How many questions are in this assessment?</div>
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Number of questions</span>
              <input
                type="number"
                min="1"
                max="100"
                value={newGradingQuestionCount}
                onChange={(e) => setNewGradingQuestionCount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmNewGrading();
                  }
                }}
                style={inputStyle}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Btn variant="secondary" onClick={() => setIsNewGradingModalOpen(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={handleConfirmNewGrading}>
                Start
              </Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h3 style={{ margin: 0, color: "#111827" }}>Gradebook & Analysis</h3>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            Add students, assessments, and question skills, then enter scores to see student and class analytics.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="primary" onClick={handleStartNewGrading}>
            Start New Grading
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => {
              if (window.confirm("Clear all saved gradebook data in this browser?")) resetGradebook();
            }}
          >
            Clear Gradebook
          </Btn>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "questions", label: "Sheet 1: Questions & Skills" },
              { key: "scores", label: "Sheet 2: Student Scores" },
              { key: "analysis", label: "Analysis" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setGradingTab(tab.key)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: gradingTab === tab.key ? "1px solid #4f46e5" : "1px solid #d1d5db",
                  background: gradingTab === tab.key ? "#eef2ff" : "#fff",
                  color: gradingTab === tab.key ? "#312e81" : "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {gradingTab !== "analysis" && (
          <section style={panelStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Students</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={studentDraft}
                onChange={(e) => setStudentDraft(e.target.value)}
                placeholder="Add student name..."
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddStudent();
                  }
                }}
              />
              <Btn variant="primary" onClick={handleAddStudent}>
                Add
              </Btn>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {gradebook.students.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No students yet.</div>
              ) : (
                gradebook.students.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: student.id === activeStudentId ? "#eef2ff" : "#ffffff",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveStudentId(student.id)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        fontWeight: student.id === activeStudentId ? 700 : 600,
                        color: "#111827",
                      }}
                    >
                      {student.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}
                      title="Remove student"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
          )}

          {gradingTab === "analysis" && (
          <section style={panelStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Skills</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                placeholder="Add skill tag..."
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Btn variant="primary" onClick={handleAddSkill}>
                Add
              </Btn>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {gradebook.skills.length === 0 ? (
                <div style={{ color: "#6b7280" }}>Add skills to tag questions (e.g., Algebra, Reading, Grammar).</div>
              ) : (
                gradebook.skills.map((skill) => (
                  <div
                    key={skill}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#111827" }}>{skill}</div>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}
                      title="Remove skill"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
          )}
          <section style={panelStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Assessments</div>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder="Assessment title..."
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <DateTimePicker
                  mode="date"
                  value={assessmentDate}
                  onChange={setAssessmentDate}
                  inputStyle={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={assessmentQuestionCount}
                  onChange={(e) => setAssessmentQuestionCount(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <Btn variant="primary" onClick={handleCreateAssessment}>
                Create Assessment
              </Btn>
            </div>

            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {gradebook.assessments.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No assessments yet.</div>
              ) : (
                gradebook.assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: assessment.id === activeAssessmentId ? "#eef2ff" : "#ffffff",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveAssessmentId(assessment.id)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        fontWeight: assessment.id === activeAssessmentId ? 700 : 600,
                        color: "#111827",
                      }}
                    >
                      <div>{assessment.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{assessment.date || "—"}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Delete this assessment and its scores?")) {
                          removeAssessment(assessment.id);
                          if (assessment.id === activeAssessmentId) setActiveAssessmentId("");
                        }
                      }}
                      style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}
                      title="Delete assessment"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {gradingTab !== "analysis" && (
          <section style={{ ...panelStyle, minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {gradingTab === "questions" ? "Sheet 1: Questions & Skills" : "Sheet 2: Student Scores"}
                </div>
                <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>
                  {gradingTab === "questions"
                    ? "Edit question labels, assign skills, and set max points (paste from Excel/Sheets)."
                    : "Enter student scores per question (paste a block from Excel/Sheets)."}
                </div>
              </div>
              {activeAssessment && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => addQuestion(activeAssessment.id)}>
                    + Add Question
                  </Btn>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Assessment title</span>
                    <input
                      value={activeAssessment.title || ""}
                      onChange={(e) => updateAssessmentMeta(activeAssessment.id, { title: e.target.value })}
                      style={{ ...inputStyle, width: 240, fontSize: 13 }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Date</span>
                    <DateTimePicker
                      mode="date"
                      value={activeAssessment.date || ""}
                      onChange={(nextValue) => updateAssessmentMeta(activeAssessment.id, { date: nextValue })}
                      inputStyle={{ ...inputStyle, width: 160, fontSize: 13 }}
                    />
                  </label>
                </div>
              )}
            </div>

            {!activeAssessment ? (
              <div style={{ marginTop: 12, color: "#6b7280" }}>Select or create an assessment to begin.</div>
            ) : (
              <div style={{ overflowX: "auto", overflowY: "auto", maxWidth: "100%", marginTop: 12 }}>
                <datalist id="ai-educator-skill-options">
                  {gradebook.skills.map((skill) => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
                <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
                  <thead>
                    <tr style={{ background: "#eef2ff" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #e5e7eb" }}>
                        {gradingTab === "questions" ? "Question" : "Student"}
                      </th>
                      {questions.map((question, questionIndex) => (
                        <th key={question.id} style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}>
                          {gradingTab === "questions" ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                value={question.label || ""}
                                onChange={(e) => updateQuestionMeta(activeAssessment.id, question.id, { label: e.target.value })}
                                onPaste={handlePasteQuestionRow("label", questionIndex)}
                                placeholder={question.id}
                                style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm("Remove this question column? Scores for it will be deleted.")) {
                                    removeQuestion(activeAssessment.id, question.id);
                                  }
                                }}
                                style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 800 }}
                                title="Remove question"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 2, minWidth: 90 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{question.label || question.id}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {(question.skill || "").trim() ? `Skill: ${question.skill} | ` : ""}Max: {Math.max(0, Number(question.maxPoints) || 0)}
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #e5e7eb" }}>
                        {gradingTab === "questions" ? "Total Max" : "Total"}
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #e5e7eb" }}>
                        {gradingTab === "questions" ? "" : "%"}
                      </th>
                    </tr>
                    {gradingTab === "questions" && (
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                          Skill
                        </th>
                        {questions.map((question, questionIndex) => (
                          <th key={question.id} style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}>
                            <input
                              type="text"
                              list="ai-educator-skill-options"
                              value={question.skill || ""}
                              onChange={(e) => updateQuestionMeta(activeAssessment.id, question.id, { skill: e.target.value })}
                              onBlur={(e) => {
                                const value = normalizeGradebookLabel(e.target.value);
                                if (value) addSkill(value);
                              }}
                              onPaste={handlePasteQuestionRow("skill", questionIndex)}
                              placeholder="Skill"
                              style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}
                            />
                          </th>
                        ))}
                        <th style={{ borderBottom: "1px solid #e5e7eb" }} />
                        <th style={{ borderBottom: "1px solid #e5e7eb" }} />
                      </tr>
                    )}
                    {gradingTab === "questions" && (
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                          Max
                        </th>
                        {questions.map((question, questionIndex) => (
                          <th key={question.id} style={{ padding: "6px 10px", borderBottom: "1px solid #e5e7eb" }}>
                            <input
                              type="number"
                              min="0"
                              value={question.maxPoints ?? ""}
                              onChange={(e) => updateQuestionMeta(activeAssessment.id, question.id, { maxPoints: e.target.value })}
                              onPaste={handlePasteQuestionRow("max", questionIndex)}
                              placeholder="0"
                              style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}
                            />
                          </th>
                        ))}
                        <th style={{ padding: "8px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                          {assessmentTotals.totalMax}
                        </th>
                        <th style={{ borderBottom: "1px solid #e5e7eb" }} />
                      </tr>
                    )}
                  </thead>
                  {gradingTab === "scores" ? (
                    <tbody>
                      {gradebook.students.length === 0 ? (
                        <tr>
                          <td colSpan={questions.length + 3} style={{ padding: "12px", color: "#6b7280" }}>
                            Add students to start entering scores.
                          </td>
                        </tr>
                      ) : (
                        gradebook.students.map((student, studentIndex) => {
                          const totals = totalsByStudentId[student.id] || { totalScore: 0, percent: 0 };
                          return (
                            <tr key={student.id} style={{ background: student.id === activeStudentId ? "#fef3c7" : "#ffffff" }}>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, color: "#111827" }}>
                                <button
                                  type="button"
                                  onClick={() => setActiveStudentId(student.id)}
                                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontWeight: 700, color: "#111827" }}
                                >
                                  {student.name}
                                </button>
                              </td>
                              {questions.map((question, questionIndex) => {
                                const raw = gradebook.scores?.[activeAssessment.id]?.[student.id]?.[question.id];
                                const value = raw === null || raw === undefined ? "" : String(raw);
                                const maxPoints = Math.max(0, Number(question.maxPoints) || 0);
                                return (
                                  <td key={`${student.id}-${question.id}`} style={{ padding: "6px 10px", borderBottom: "1px solid #f3f4f6" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxPoints}
                                      value={value}
                                      onChange={(e) => {
                                        const nextRaw = e.target.value;
                                        if (nextRaw === "") {
                                          setScore(activeAssessment.id, student.id, question.id, null);
                                          return;
                                        }
                                        const parsed = Number(nextRaw);
                                        if (!Number.isFinite(parsed)) return;
                                        const clamped = Math.max(0, Math.min(maxPoints, parsed));
                                        setScore(activeAssessment.id, student.id, question.id, clamped);
                                      }}
                                      onPaste={handlePasteScores(studentIndex, questionIndex)}
                                      style={{ ...inputStyle, fontSize: 12, padding: "8px 10px", width: 90 }}
                                    />
                                  </td>
                                );
                              })}
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, color: "#111827" }}>
                                {totals.totalScore.toFixed(1)}
                              </td>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", color: "#111827" }}>
                                {Math.round(totals.percent)}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  ) : (
                    <tbody>
                      <tr>
                        <td colSpan={questions.length + 3} style={{ padding: "12px", color: "#6b7280" }}>
                          Switch to "Sheet 2: Student Scores" to enter grades.
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
                <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                  {gradingTab === "questions"
                    ? "Tip: paste a row from Excel/Sheets into a Question/Skill/Max cell to fill across question columns."
                    : "Tip: copy a block from Excel/Sheets and paste into any score cell to fill multiple students × questions."}
                </div>
              </div>
            )}
          </section>
          )}
          {gradingTab === "analysis" && (
          <section style={{ ...panelStyle, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Analytics</div>
                <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>Student and class performance summary.</div>
              </div>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Student</span>
                <select value={activeStudentId} onChange={(e) => setActiveStudentId(e.target.value)} style={{ ...inputStyle, width: 240, fontSize: 13 }}>
                  <option value=""> </option>
                  {gradebook.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!activeAssessment ? (
              <div style={{ marginTop: 12, color: "#6b7280" }}>Select an assessment to view analytics.</div>
            ) : gradebook.students.length === 0 ? (
              <div style={{ marginTop: 12, color: "#6b7280" }}>Add students and enter scores to view analytics.</div>
            ) : (
              <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Class Avg", value: assessmentTotals.classAverage },
                    { label: "Median", value: assessmentTotals.classMedian },
                    { label: "Min", value: assessmentTotals.classMin },
                    { label: "Max", value: assessmentTotals.classMax },
                  ].map((item) => (
                    <div key={item.label} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#ffffff" }}>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{Math.round(item.value)}%</div>
                    </div>
                  ))}
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#ffffff" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Student</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
                      {activeStudentTotals ? `${Math.round(activeStudentTotals.percent)}%` : "—"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Class Skill Averages</div>
                    <BarList items={skillAnalysis.classSkill} color="#2563eb" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Score Distribution</div>
                    <Histogram values={distribution} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>
                      {activeStudent ? `Skill Breakdown — ${activeStudent.name}` : "Skill Breakdown — Student"}
                    </div>
                    <BarList items={activeStudentSkillBars} color="#a855f7" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Notes</div>
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                      Tips:
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        <li>Add skills first, then tag each question to see skill charts.</li>
                        <li>Leave a score blank while grading; totals treat blank as 0 until filled.</li>
                        <li>Data is stored locally in this browser.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
}

function WeeklyScheduleTable({ rows, onChangeCell, onAddRow, onRemoveRow }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 640,
            border: "1px solid #e5e7eb",
          }}
        >
          <thead>
            <tr style={{ background: "#eef2ff", color: "#312e81" }}>
              {["Week", "Topic", "Activities", "Assessment", ""].map((head) => (
                <th
                  key={head}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderBottom: "1px solid #d1d5db",
                  }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`week-row-${index}`}>
                {["week", "topic", "activities", "assessment"].map((fieldKey) => (
                  <td key={fieldKey} style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                    <input
                      type="text"
                      value={row[fieldKey]}
                      onChange={(e) => onChangeCell(index, fieldKey, e.target.value)}
                      placeholder={
                        fieldKey === "week"
                          ? `Week ${index + 1}`
                          : fieldKey === "topic"
                            ? "Topic / Theme"
                            : fieldKey === "activities"
                              ? "Key Activities / Tasks"
                              : "Assessment / Evidence"
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </td>
                ))}
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", width: 40 }}>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    disabled={rows.length === 1}
                    style={{
                      border: "none",
                      background: "none",
                      color: rows.length === 1 ? "#d1d5db" : "#b91c1c",
                      cursor: rows.length === 1 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                    title="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Btn variant="secondary" onClick={onAddRow}>
          + Add Week
        </Btn>
      </div>
    </div>
  );
}

SectionField.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

WeeklyScheduleTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      week: PropTypes.string,
      topic: PropTypes.string,
      activities: PropTypes.string,
      assessment: PropTypes.string,
    })
  ).isRequired,
  onChangeCell: PropTypes.func.isRequired,
  onAddRow: PropTypes.func.isRequired,
  onRemoveRow: PropTypes.func.isRequired,
};

function LessonSequenceList({ entries, onChange, onAdd, onRemove }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {entries.map((entry, index) => (
        <label key={`lesson-seq-${index}`} style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>{entry.title}</span>
          <textarea
            value={entry.content}
            onChange={(e) => onChange(index, e.target.value)}
            placeholder="Outline focus, activities, and assessments for this lesson."
            rows={3}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
          <div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={entries.length === 1}
              style={{
                background: "none",
                border: "none",
                color: entries.length === 1 ? "#d1d5db" : "#b91c1c",
                cursor: entries.length === 1 ? "not-allowed" : "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </label>
      ))}
      <Btn variant="secondary" onClick={onAdd}>
        + Add Lesson
      </Btn>
    </div>
  );
}

LessonSequenceList.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      content: PropTypes.string,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

PlaceholderPanel.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.string),
};

export default function AIEducator({ onNavigate }) {
  AIEducator.propTypes = { onNavigate: PropTypes.func.isRequired };
  const {
    values,
    updateField,
    resetAll,
    updateWeeklyCell,
    addWeeklyRow,
    removeWeeklyRow,
    updateUnitSequence,
    addUnitSequenceEntry,
    removeUnitSequenceEntry,
  } = useSyllabusState();
  const [mainTab, setMainTab] = useState("planning");
  const [planningTab, setPlanningTab] = useState("syllabus");

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.text(values.syllabusTitle || "Course Syllabus", margin, y);
    y += 28;

    const addBlock = (label, content) => {
      if (y > 770) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(label, margin, y);
      y += 16;
      doc.setFont("Helvetica", "normal");
      const value = content?.trim() ? content : "—";
      const wrapped = doc.splitTextToSize(value, maxWidth);
      wrapped.forEach((line) => {
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin + 12, y);
        y += 14;
      });
      y += 6;
    };

    const drawWeeklyTable = () => {
      const columns = [
        { key: "week", label: "Week", width: 80 },
        { key: "topic", label: "Topic", width: 150 },
        { key: "activities", label: "Activities", width: 180 },
        { key: "assessment", label: "Assessment", width: 150 },
      ];
      const lineHeight = 12;
      const cellPadding = 6;

      const ensureSpace = (heightNeeded) => {
        if (y + heightNeeded > 780) {
          doc.addPage();
          y = margin;
        }
      };

      const drawRow = (cells, isHeader = false) => {
        const heights = cells.map((cell, idx) => {
          const content = cell || (isHeader ? columns[idx].label : "—");
          const textWidth = columns[idx].width - cellPadding * 2;
          const lines = doc.splitTextToSize(content, textWidth);
          return Math.max(lines.length * lineHeight + cellPadding * 2, 24);
        });
        const rowHeight = Math.max(...heights);
        ensureSpace(rowHeight + 6);

        let x = margin;
        columns.forEach((col, idx) => {
          doc.rect(x, y, col.width, rowHeight);
          const content = cells[idx] || (isHeader ? col.label : "—");
          const textWidth = col.width - cellPadding * 2;
          const lines = doc.splitTextToSize(content, textWidth);
          let textY = y + cellPadding + lineHeight;
          doc.setFont("Helvetica", isHeader ? "bold" : "normal");
          lines.forEach((line) => {
            doc.text(line, x + cellPadding, textY - 4);
            textY += lineHeight;
          });
          x += col.width;
        });
        y += rowHeight;
      };

      drawRow(columns.map((c) => c.label), true);
      const rows = values.weeklyScheduleTable || [];
      if (rows.length === 0) {
        drawRow(Array(columns.length).fill("—"));
      } else {
        rows.forEach((row) => {
          drawRow([row.week, row.topic, row.activities, row.assessment]);
        });
      }
      y += 12;
    };

    SYLLABUS_SECTIONS.forEach((section) => {
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(section.title, margin, y);
      y += 18;
      section.fields.forEach((field) => {
        addBlock(field.label, values[field.name]);
      });
      if (section.key === "weeklySchedule") {
        drawWeeklyTable();
      }
      y += 6;
    });

    doc.save("syllabus.pdf");
  };

  const renderLessonPlan = () => (
    <>
      <div>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Draft a full lesson plan—use the grey prompts as guidance.
        </p>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Lesson Plan Title</span>
          <input
            type="text"
            value={values.lessonPlanTitle}
            onChange={(e) => updateField("lessonPlanTitle", e.target.value)}
            placeholder="Lesson Plan"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 16,
              fontWeight: 500,
              boxSizing: "border-box",
            }}
          />
        </label>
      </div>
      {LESSON_PLAN_SECTIONS.map((section) => (
        <section
          key={section.key}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
            background: "#f9fafb",
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", color: "#111827" }}>{section.title}</h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
              Use the placeholders below to capture the required details.
            </p>
          </div>
          {section.fields.map((field) => (
            <label key={field.name} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>{field.label}</span>
              <SectionField field={field} value={values[field.name]} onChange={updateField} />
            </label>
          ))}
        </section>
      ))}
    </>
  );

  const renderUnitPlan = () => (
    <>
      <div>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Outline the entire instructional unit, including lesson sequence and key connections.
        </p>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>Unit Plan Title</span>
          <input
            type="text"
            value={values.unitPlanTitle}
            onChange={(e) => updateField("unitPlanTitle", e.target.value)}
            placeholder="Unit Plan"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 16,
              fontWeight: 500,
              boxSizing: "border-box",
            }}
          />
        </label>
      </div>
      {UNIT_PLAN_SECTIONS.map((section) => (
        <section
          key={section.key}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
            background: "#f9fafb",
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", color: "#111827" }}>{section.title}</h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
              {section.key === "unitLessonSequence"
                ? "Outline each lesson in the unit."
                : "Use the prompts to capture the unit details."}
            </p>
          </div>
          {section.key === "unitLessonSequence" ? (
            <LessonSequenceList
              entries={values.unitLessonSequence}
              onChange={updateUnitSequence}
              onAdd={addUnitSequenceEntry}
              onRemove={removeUnitSequenceEntry}
            />
          ) : (
            section.fields.map((field) => (
              <label key={field.name} style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>{field.label}</span>
                <SectionField field={field} value={values[field.name]} onChange={updateField} />
              </label>
            ))
          )}
        </section>
      ))}
    </>
  );

  const renderPlanningContent = () => {
    if (planningTab === "lesson") {
      return renderLessonPlan();
    }
    if (planningTab === "unit") {
      return renderUnitPlan();
    }
    return (
      <>
        <div>
          <p style={{ marginTop: 0, color: "#6b7280" }}>
            Fill in as many sections as you need—placeholders guide the required content. Export to PDF at any time.
          </p>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Syllabus Title</span>
            <input
              type="text"
              value={values.syllabusTitle}
              onChange={(e) => updateField("syllabusTitle", e.target.value)}
              placeholder="Edit Title"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                fontSize: 16,
                fontWeight: 500,
                boxSizing: "border-box",
              }}
            />
          </label>
        </div>

        {SYLLABUS_SECTIONS.map((section) => (
          <section
            key={section.key}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 20,
              background: "#f9fafb",
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", color: "#111827" }}>{section.title}</h3>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
                {section.key === "weeklySchedule"
                  ? "Plan each week with a quick table. Add as many rows as you need."
                  : "Use the grey prompts inside each box; they disappear as soon as you type."}
              </p>
            </div>
            {section.key === "weeklySchedule" ? (
              <WeeklyScheduleTable
                rows={values.weeklyScheduleTable}
                onChangeCell={updateWeeklyCell}
                onAddRow={addWeeklyRow}
                onRemoveRow={removeWeeklyRow}
              />
            ) : (
              section.fields.map((field) => (
                <label key={field.name} style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: "#374151" }}>{field.label}</span>
                  <SectionField field={field} value={values[field.name]} onChange={updateField} />
                </label>
              ))
            )}
          </section>
        ))}
      </>
    );
  };

  const renderMainContent = () => {
    if (mainTab === "planning") {
      return (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLANNING_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPlanningTab(tab.key)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: planningTab === tab.key ? "1px solid #4f46e5" : "1px solid #d1d5db",
                  background: planningTab === tab.key ? "#eef2ff" : "#fff",
                  color: planningTab === tab.key ? "#312e81" : "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>{renderPlanningContent()}</div>
        </>
      );
    }

    if (mainTab === "materials") {
      return (
        <PlaceholderPanel
          title="Instructional Materials Hub"
          description="Organize handouts, slide decks, media, and templates. Uploads with AI tagging will land here soon."
          steps={[
            "List the core resources tied to each lesson or unit.",
            "Identify digital platforms (LMS, apps) that host student-facing content.",
            "Flag materials needing translation or accessibility adjustments.",
          ]}
        />
      );
    }

    return <FeedbackAssessmentWorkspace />;
  };

  return (
    <PageWrap>
      <HeaderBar title="AI Educator Workspace" right={null} />
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMainTab(tab.key)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  border: mainTab === tab.key ? "1px solid #4f46e5" : "1px solid #d1d5db",
                  background: mainTab === tab.key ? "#eef2ff" : "#fff",
                  color: mainTab === tab.key ? "#312e81" : "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {renderMainContent()}

          {mainTab === "planning" && planningTab === "syllabus" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Btn variant="secondary" onClick={resetAll}>
                Clear All
              </Btn>
              <Btn variant="primary" onClick={exportPdf}>
                Export to PDF
              </Btn>
              <Btn variant="back" onClick={() => onNavigate("home")}>
                Back Home
              </Btn>
            </div>
          )}
          {!(mainTab === "planning" && planningTab === "syllabus") && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Btn variant="back" onClick={() => onNavigate("home")}>
                Back Home
              </Btn>
            </div>
          )}
        </div>
      </Card>
    </PageWrap>
  );
}
