// src/pages/AIEducator.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { jsPDF } from "jspdf";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

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

    return (
      <PlaceholderPanel
        title="Feedback & Assessment Workspace"
        description="Track formative checkpoints, rubric feedback, and post-assessment reflections."
        steps={[
          "Capture quick evidence notes after each lesson or small-group meeting.",
          "Draft rubric criteria or comment banks for recurring tasks.",
          "Plan student conferences or peer-feedback cycles.",
        ]}
      />
    );
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
