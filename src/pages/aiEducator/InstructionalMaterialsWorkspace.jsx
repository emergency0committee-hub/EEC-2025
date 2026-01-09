import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../components/Btn.jsx";
import { useTheme } from "../../components/AppProviders.jsx";
import ModalPortal from "../../components/ModalPortal.jsx";
import { routeHref } from "../../lib/routes.js";
import {
  QUESTION_TYPES,
  QUESTION_TYPES_WITH_OPTIONS,
  normalizeGradebookLabel,
} from "./gradebookState.js";

export default function InstructionalMaterialsWorkspace({ formState }) {
  InstructionalMaterialsWorkspace.propTypes = {
    formState: PropTypes.shape({
      gradebook: PropTypes.object.isRequired,
      addAssessment: PropTypes.func.isRequired,
      importForm: PropTypes.func.isRequired,
      updateAssessmentMeta: PropTypes.func.isRequired,
      addQuestion: PropTypes.func.isRequired,
      removeQuestion: PropTypes.func.isRequired,
      updateQuestionMeta: PropTypes.func.isRequired,
      addSkill: PropTypes.func.isRequired,
      removeAssessment: PropTypes.func.isRequired,
      saveAssessment: PropTypes.func.isRequired,
    }).isRequired,
  };

  const {
    gradebook,
    addAssessment,
    importForm,
    updateAssessmentMeta,
    addQuestion,
    removeQuestion,
    updateQuestionMeta,
    addSkill,
    removeAssessment,
    saveAssessment,
  } = formState;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeFormId, setActiveFormId] = useState(gradebook.assessments[0]?.id || "");
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [legacyFile, setLegacyFile] = useState(null);
  const [legacyError, setLegacyError] = useState("");
  const [legacyBusy, setLegacyBusy] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newFormCategory, setNewFormCategory] = useState("quiz");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const saveTimerRef = useRef(null);
  const shareTimerRef = useRef(null);

  useEffect(() => {
    if (!gradebook.assessments.length) {
      if (activeFormId) setActiveFormId("");
      return;
    }
    if (!activeFormId || !gradebook.assessments.some((assessment) => assessment.id === activeFormId)) {
      setActiveFormId(gradebook.assessments[0].id);
    }
  }, [gradebook.assessments, activeFormId]);

  const activeForm = useMemo(
    () => gradebook.assessments.find((assessment) => assessment.id === activeFormId) || null,
    [gradebook.assessments, activeFormId]
  );

  const toBool = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return ["true", "yes", "1", "required"].includes(normalized);
  };

  const parseOptions = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return [];
    const separator = raw.includes("|") ? "|" : ",";
    return raw
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
  };
  const formatCorrectOptions = (question) => {
    const correct = Array.isArray(question?.correctOptions) ? question.correctOptions : [];
    if (!correct.length) return "";
    if (question.type === "multiple_choice") return correct[0] || "";
    return correct.join("|");
  };

  useEffect(() => {
    if (!legacyOpen) return;
    setLegacyError("");
    setLegacyFile(null);
  }, [legacyOpen]);

  useEffect(() => () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    if (shareTimerRef.current) {
      window.clearTimeout(shareTimerRef.current);
    }
  }, []);

  const updateQuestionOptions = (questionId, nextOptions) => {
    if (!activeFormId) return;
    updateQuestionMeta(activeFormId, questionId, { options: nextOptions });
  };

  const addQuestionOption = (questionId) => {
    const question = activeForm?.questions?.find((item) => item.id === questionId);
    if (!question) return;
    const options = Array.isArray(question.options) ? question.options : [];
    updateQuestionOptions(questionId, [...options, `Option ${options.length + 1}`]);
  };

  const updateQuestionOption = (questionId, optionIndex, value) => {
    const question = activeForm?.questions?.find((item) => item.id === questionId);
    if (!question) return;
    const options = Array.isArray(question.options) ? question.options : [];
    const previousLabel = options[optionIndex] || "";
    const nextOptions = options.map((option, idx) => (idx === optionIndex ? value : option));
    let nextCorrect = Array.isArray(question.correctOptions) ? question.correctOptions : [];
    if (previousLabel && nextCorrect.includes(previousLabel)) {
      nextCorrect = nextCorrect.map((entry) => (entry === previousLabel ? value : entry));
    }
    updateQuestionMeta(activeFormId, questionId, { options: nextOptions, correctOptions: nextCorrect });
  };

  const removeQuestionOption = (questionId, optionIndex) => {
    const question = activeForm?.questions?.find((item) => item.id === questionId);
    if (!question) return;
    const options = Array.isArray(question.options) ? question.options : [];
    const removedLabel = options[optionIndex] || "";
    const nextOptions = options.filter((_, idx) => idx !== optionIndex);
    const nextCorrect = Array.isArray(question.correctOptions)
      ? question.correctOptions.filter((entry) => entry !== removedLabel)
      : [];
    updateQuestionMeta(activeFormId, questionId, { options: nextOptions, correctOptions: nextCorrect });
  };

  const toggleCorrectOption = (questionId, optionIndex) => {
    const question = activeForm?.questions?.find((item) => item.id === questionId);
    if (!question) return;
    const options = Array.isArray(question.options) ? question.options : [];
    const optionLabel = options[optionIndex];
    if (!optionLabel) return;
    const current = Array.isArray(question.correctOptions) ? question.correctOptions : [];
    if (question.type === "multiple_choice") {
      updateQuestionMeta(activeFormId, questionId, { correctOptions: [optionLabel] });
      return;
    }
    const nextCorrect = current.includes(optionLabel)
      ? current.filter((entry) => entry !== optionLabel)
      : [...current, optionLabel];
    updateQuestionMeta(activeFormId, questionId, { correctOptions: nextCorrect });
  };

  const handleQuestionTypeChange = (questionId, nextType) => {
    if (!activeFormId) return;
    const question = activeForm?.questions?.find((item) => item.id === questionId);
    if (!question) return;
    const hasOptions = QUESTION_TYPES_WITH_OPTIONS.has(nextType);
    const existingOptions = Array.isArray(question.options) ? question.options : [];
    const nextOptions = hasOptions && existingOptions.length === 0 ? ["Option 1", "Option 2"] : existingOptions;
    const patch = { type: nextType, options: nextOptions };
    if (!hasOptions) {
      patch.correctOptions = [];
    } else if (nextType === "multiple_choice") {
      const currentCorrect = Array.isArray(question.correctOptions) ? question.correctOptions : [];
      patch.correctOptions = currentCorrect.length ? [currentCorrect[0]] : [];
    }
    if (nextType === "rating" && (!question.maxPoints || Number(question.maxPoints) <= 1)) {
      patch.maxPoints = 5;
    }
    updateQuestionMeta(activeFormId, questionId, patch);
  };

  const borderColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.55)";
  const panelBg = isDark ? "rgba(15, 23, 42, 0.58)" : "rgba(255, 255, 255, 0.58)";
  const cardBg = isDark ? "rgba(15, 23, 42, 0.42)" : "rgba(255, 255, 255, 0.42)";
  const textPrimary = isDark ? "#e2e8f0" : "#111827";
  const textMuted = isDark ? "#94a3b8" : "#6b7280";
  const inputBg = isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)";
  const inputBorder = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(209, 213, 219, 0.8)";
  const accent = isDark ? "#93c5fd" : "#2563eb";
  const formCategories = [
    { value: "quiz", label: "Quiz" },
    { value: "homework", label: "Homework" },
    { value: "test", label: "Test" },
  ];
  const formCategoryMeta = {
    quiz: {
      accent: "#60a5fa",
      boxBg: "rgba(96, 165, 250, 0.22)",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5" />
          <path d="M8 12h8M8 16h6" />
        </svg>
      ),
    },
    homework: {
      accent: "#f59e0b",
      boxBg: "rgba(245, 158, 11, 0.22)",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
          <path d="M9 15h6" />
        </svg>
      ),
    },
    test: {
      accent: "#f472b6",
      boxBg: "rgba(244, 114, 182, 0.22)",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h6M8 15h4" />
          <path d="M15.5 16.5l1.5 1.5 3-3" />
        </svg>
      ),
    },
  };
  const questionTypeValues = useMemo(() => new Set(QUESTION_TYPES.map((item) => item.value)), []);

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: inputBg,
    color: textPrimary,
  };

  const formCanvasStyle = {
    background: panelBg,
    borderRadius: 18,
    padding: 20,
    border: `1px solid ${borderColor}`,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    backdropFilter: "blur(10px) saturate(140%)",
    WebkitBackdropFilter: "blur(10px) saturate(140%)",
  };

  const formCardStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    background: cardBg,
    overflow: "hidden",
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
  };

  const questionCardStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    background: cardBg,
    padding: 16,
    display: "grid",
    gap: 12,
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
  };

  const headerInputStyle = {
    width: "100%",
    padding: "6px 0",
    border: "none",
    borderBottom: `1px solid ${inputBorder}`,
    fontSize: 24,
    fontWeight: 600,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    background: "transparent",
    color: textPrimary,
  };

  const selectStyle = {
    ...inputStyle,
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
  };

  const handleCreateForm = (category) => {
    const cleanTitle = `Untitled form ${gradebook.assessments.length + 1}`;
    const id = addAssessment({ title: cleanTitle, questionCount: "1", category });
    if (id) {
      updateAssessmentMeta(id, { description: "" });
      setActiveFormId(id);
    }
    setNewFormOpen(false);
    setNewFormCategory("quiz");
  };

  const handleSaveForm = async () => {
    if (!activeForm) return;
    setSaveStatus("");
    setSaveBusy(true);
    const result = await saveAssessment(activeForm.id);
    setSaveBusy(false);
    if (result?.ok) {
      setSaveStatus("Saved.");
    } else {
      setSaveStatus(result?.error || "Save failed.");
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => setSaveStatus(""), 2600);
  };

  const buildShareLink = (id) => {
    if (!id || typeof window === "undefined") return "";
    try {
      const base = new URL(routeHref("ai-form"), window.location.origin);
      base.searchParams.set("form", id);
      return base.toString();
    } catch {
      return "";
    }
  };

  const handleShareLink = async () => {
    if (!activeForm) return;
    const url = buildShareLink(activeForm.id);
    if (!url) {
      setShareStatus("Unable to build link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Student link copied.");
    } catch {
      window.prompt("Copy this student link:", url);
      setShareStatus("Student link ready.");
    }
    if (shareTimerRef.current) {
      window.clearTimeout(shareTimerRef.current);
    }
    shareTimerRef.current = window.setTimeout(() => setShareStatus(""), 2600);
  };

  const buildWorkbook = async ({ title = "", description = "", category = "quiz", questions = [] } = {}) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const formSheet = XLSX.utils.aoa_to_sheet([
      ["Field", "Value"],
      ["Title", title],
      ["Description", description],
      ["Category", category],
    ]);
    const questionRows = [
      ["label", "prompt", "type", "options", "correct", "skill", "max_points", "required"],
      ...questions.map((question) => [
        question.label || "",
        question.prompt || "",
        question.type || "short",
        Array.isArray(question.options) ? question.options.join("|") : "",
        formatCorrectOptions(question),
        question.skill || "",
        Number.isFinite(Number(question.maxPoints)) ? Number(question.maxPoints) : "",
        question.required ? "true" : "false",
      ]),
    ];
    const questionSheet = XLSX.utils.aoa_to_sheet(questionRows);
    XLSX.utils.book_append_sheet(wb, formSheet, "Form");
    XLSX.utils.book_append_sheet(wb, questionSheet, "Questions");
    return { XLSX, wb };
  };

  const downloadWorkbook = (XLSX, wb, filename) => {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleTemplateDownload = async () => {
    const { XLSX, wb } = await buildWorkbook();
    downloadWorkbook(XLSX, wb, "ai-educator-form-template.xlsx");
  };

  const handleExportCurrentForm = async () => {
    if (!activeForm) return;
    const { XLSX, wb } = await buildWorkbook({
      title: activeForm.title || "",
      description: activeForm.description || "",
      category: activeForm.category || "quiz",
      questions: activeForm.questions || [],
    });
    const safeTitle = activeForm.title ? activeForm.title.replace(/[\\/:*?"<>|]+/g, "-") : "ai-educator-form";
    downloadWorkbook(XLSX, wb, `${safeTitle}.xlsx`);
  };

  const parseLegacyFile = async (file) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const formSheet = workbook.Sheets.Form || workbook.Sheets[workbook.SheetNames[0]];
    const questionSheet = workbook.Sheets.Questions || workbook.Sheets[workbook.SheetNames[1]];
    if (!formSheet || !questionSheet) {
      throw new Error("Template sheets not found. Use the provided template.");
    }

    const formRows = XLSX.utils.sheet_to_json(formSheet, { header: 1, blankrows: false });
    const metaMap = new Map(
      formRows
        .filter((row) => row && row.length >= 2)
        .map((row) => [String(row[0] || "").toLowerCase().trim(), row[1]])
    );
    const titleRaw = String(metaMap.get("title") || "").trim();
    const descriptionRaw = String(metaMap.get("description") || "").trim();
    const categoryRaw = String(metaMap.get("category") || "").trim().toLowerCase();
    const category = ["quiz", "homework", "test"].includes(categoryRaw) ? categoryRaw : "quiz";
    const title = titleRaw || "Imported form";

    const questionRows = XLSX.utils.sheet_to_json(questionSheet, { header: 1, blankrows: false });
    if (!questionRows.length) {
      return { title, description: descriptionRaw, questions: [] };
    }

    const header = questionRows[0].map((cell) => String(cell || "").toLowerCase().trim());
    const colIndex = (name) => header.indexOf(name);
    const idx = {
      label: colIndex("label"),
      prompt: colIndex("prompt"),
      type: colIndex("type"),
      options: colIndex("options"),
      correct: colIndex("correct"),
      skill: colIndex("skill"),
      maxPoints: colIndex("max_points"),
      required: colIndex("required"),
    };
    const requiredColumns = ["prompt", "type"];
    const missingColumns = requiredColumns.filter((name) => colIndex(name) === -1);
    if (missingColumns.length) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}.`);
    }

    const questions = questionRows.slice(1).reduce((acc, row) => {
      const prompt = String(row[idx.prompt] || "").trim();
      if (!prompt) return acc;
      const rawType = String(row[idx.type] || "short").trim().toLowerCase();
      const type = questionTypeValues.has(rawType) ? rawType : "short";
      const options = QUESTION_TYPES_WITH_OPTIONS.has(type) ? parseOptions(row[idx.options]) : [];
      const correctRaw = idx.correct === -1 ? "" : String(row[idx.correct] || "").trim();
      const correctValues = correctRaw && QUESTION_TYPES_WITH_OPTIONS.has(type) ? parseOptions(correctRaw) : [];
      const filteredCorrect = correctValues.filter((entry) => options.includes(entry));
      const correctOptions =
        type === "multiple_choice" && filteredCorrect.length > 0
          ? [filteredCorrect[0]]
          : filteredCorrect;
      const maxPointsValue = row[idx.maxPoints];
      const maxPoints = maxPointsValue === "" || maxPointsValue === null ? undefined : Number(maxPointsValue);
      const nextQuestion = {
        label: String(row[idx.label] || "").trim(),
        prompt,
        type,
        options,
        correctOptions,
        skill: String(row[idx.skill] || "").trim(),
        maxPoints: Number.isFinite(maxPoints) ? maxPoints : undefined,
        required: toBool(row[idx.required]),
      };
      if (type === "rating" && !Number.isFinite(nextQuestion.maxPoints)) {
        nextQuestion.maxPoints = 5;
      }
      acc.push(nextQuestion);
      return acc;
    }, []);

    return { title, description: descriptionRaw, category, questions };
  };

  const handleLegacyImport = async () => {
    if (!legacyFile) {
      setLegacyError("Choose an Excel file to import.");
      return;
    }
    setLegacyError("");
    setLegacyBusy(true);
    try {
      const payload = await parseLegacyFile(legacyFile);
      const formId = await importForm(payload);
      if (formId) {
        setActiveFormId(formId);
      }
      setLegacyFile(null);
      setLegacyOpen(false);
    } catch (err) {
      setLegacyError(err?.message || "Unable to import the Excel file.");
    } finally {
      setLegacyBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, color: textPrimary }}>Instructional Materials</h3>
          <p style={{ margin: "6px 0 0", color: textMuted }}>
            Build checks, quizzes, or exit tickets with skill tagging.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={() => setLegacyOpen(true)}>
            Legacy Mode
          </Btn>
          <Btn variant="primary" onClick={() => setNewFormOpen(true)}>
            New Form
          </Btn>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) auto",
          gridTemplateRows: "auto auto",
          columnGap: 12,
          rowGap: 6,
          alignItems: "center",
          width: "100%",
        }}
      >
        <label
          htmlFor="ai-educator-form-select"
          style={{ fontSize: 12, color: textMuted, gridColumn: "1 / 2", gridRow: "1 / 2" }}
        >
          Form
        </label>
        <select
          id="ai-educator-form-select"
          value={activeFormId}
          onChange={(e) => setActiveFormId(e.target.value)}
          style={{ ...selectStyle, minWidth: 240, gridColumn: "1 / 2", gridRow: "2 / 3" }}
        >
          <option value="">Select a form</option>
          {gradebook.assessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.title}
            </option>
          ))}
        </select>
        {activeForm && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this form and its questions?")) {
                removeAssessment(activeForm.id);
                setActiveFormId("");
              }
            }}
            style={{
              gridColumn: "2 / 3",
              gridRow: "2 / 3",
              justifySelf: "end",
              alignSelf: "center",
              border: `1px solid ${borderColor}`,
              background: cardBg,
              color: "#b91c1c",
              borderRadius: 999,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Delete form
          </button>
        )}
      </div>

      <div style={formCanvasStyle}>
        <div style={{ display: "grid", gap: 16, maxWidth: 860, margin: "0 auto" }}>
          {!activeForm ? (
            <div style={{ color: textMuted, padding: 16 }}>Select or create a form to begin.</div>
          ) : (
            <>
              <section style={formCardStyle}>
                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  <input
                    value={activeForm.title || ""}
                    onChange={(e) => updateAssessmentMeta(activeForm.id, { title: e.target.value })}
                    placeholder="Untitled form"
                    style={headerInputStyle}
                  />
                  <textarea
                    value={activeForm.description || ""}
                    onChange={(e) => updateAssessmentMeta(activeForm.id, { description: e.target.value })}
                    placeholder="Form description"
                    rows={3}
                    style={{
                      ...inputStyle,
                      border: "none",
                      borderBottom: `1px solid ${inputBorder}`,
                      borderRadius: 0,
                      padding: "6px 0",
                      fontSize: 14,
                      background: "transparent",
                    }}
                  />
                  <label style={{ display: "grid", gap: 6, maxWidth: 240 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Category</span>
                    <select
                      value={activeForm.category || "quiz"}
                      onChange={(e) => updateAssessmentMeta(activeForm.id, { category: e.target.value })}
                      style={selectStyle}
                    >
                      {formCategories.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <datalist id="ai-educator-skill-options">
                {gradebook.skills.map((skill) => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>

              <div style={{ display: "grid", gap: 12 }}>
                {(activeForm.questions || []).map((question, index) => {
                  const showOptions = QUESTION_TYPES_WITH_OPTIONS.has(question.type);
                  return (
                    <div key={question.id} style={questionCardStyle}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 220px)",
                          gap: 12,
                          alignItems: "start",
                        }}
                      >
                        <input
                          value={question.prompt || ""}
                          onChange={(e) => updateQuestionMeta(activeForm.id, question.id, { prompt: e.target.value })}
                          placeholder={`Question ${index + 1}`}
                          style={{
                            ...inputStyle,
                            border: "none",
                            borderBottom: `1px solid ${inputBorder}`,
                            borderRadius: 0,
                            padding: "6px 0",
                            fontSize: 16,
                            fontWeight: 500,
                            background: "transparent",
                          }}
                        />
                        <select
                          value={question.type || "short"}
                          onChange={(e) => handleQuestionTypeChange(question.id, e.target.value)}
                          style={selectStyle}
                        >
                          {QUESTION_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(140px, 1fr)", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, color: textMuted }}>Skill tag</span>
                          <input
                            type="text"
                            list="ai-educator-skill-options"
                            value={question.skill || ""}
                            onChange={(e) => updateQuestionMeta(activeForm.id, question.id, { skill: e.target.value })}
                            onBlur={(e) => {
                              const value = normalizeGradebookLabel(e.target.value);
                              if (value) addSkill(value);
                            }}
                            placeholder="Skill"
                            style={inputStyle}
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 12, color: textMuted }}>Max points</span>
                          <input
                            type="number"
                            min="0"
                            value={question.maxPoints ?? ""}
                            onChange={(e) => updateQuestionMeta(activeForm.id, question.id, { maxPoints: e.target.value })}
                            style={inputStyle}
                          />
                        </label>
                      </div>

                      {showOptions && (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 12, color: textMuted }}>
                            {question.type === "checkboxes" ? "Correct answers (select all that apply)" : "Correct answer"}
                          </div>
                          {(question.options || []).map((option, optionIndex) => {
                            const correctOptions = Array.isArray(question.correctOptions) ? question.correctOptions : [];
                            const isCorrect = correctOptions.includes(option);
                            return (
                              <div key={`${question.id}-opt-${optionIndex}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type={question.type === "checkboxes" ? "checkbox" : "radio"}
                                  name={`correct-${question.id}`}
                                  checked={isCorrect}
                                  onChange={() => toggleCorrectOption(question.id, optionIndex)}
                                  aria-label="Mark as correct answer"
                                />
                              <input
                                value={option}
                                onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                                style={{ ...inputStyle, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={() => removeQuestionOption(question.id, optionIndex)}
                                style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}
                              >
                                Remove
                              </button>
                            </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => addQuestionOption(question.id)}
                            style={{ border: "none", background: "none", color: accent, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
                          >
                            + Add option
                          </button>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Remove this question?")) {
                              removeQuestion(activeForm.id, question.id);
                            }
                          }}
                          style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}
                        >
                          Delete
                        </button>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textPrimary }}>
                          Required
                          <input
                            type="checkbox"
                            checked={Boolean(question.required)}
                            onChange={(e) => updateQuestionMeta(activeForm.id, question.id, { required: e.target.checked })}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn variant="secondary" onClick={() => addQuestion(activeForm.id)}>
                  + Add Question
                </Btn>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {(saveStatus || shareStatus) && (
                    <span style={{ fontSize: 12, color: textMuted }}>
                      {shareStatus || saveStatus}
                    </span>
                  )}
                  <Btn variant="secondary" onClick={handleShareLink}>
                    Copy Student Link
                  </Btn>
                  <Btn variant="primary" onClick={handleSaveForm} disabled={saveBusy}>
                    {saveBusy ? "Saving..." : "Save Form"}
                  </Btn>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {legacyOpen ? (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setLegacyOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.78)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: 16,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(720px, 100%)",
                borderRadius: 18,
                border: `1px solid ${borderColor}`,
                background: panelBg,
                padding: 20,
                boxShadow: "0 24px 50px rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(12px) saturate(140%)",
                WebkitBackdropFilter: "blur(12px) saturate(140%)",
                color: textPrimary,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Legacy Mode (Excel)</h3>
                  <p style={{ margin: "6px 0 0", color: textMuted, fontSize: 14 }}>
                    Download the template, fill it in Excel, then upload to save to the backend.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLegacyOpen(false)}
                  style={{ border: "none", background: "none", color: textPrimary, fontSize: 18, cursor: "pointer" }}
                  aria-label="Close dialog"
                >
                  X
                </button>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <div style={{ fontSize: 13, color: textMuted }}>
                  Template sheets: <strong>Form</strong> (Title, Description) and <strong>Questions</strong>. Columns:
                  <span style={{ color: textPrimary }}> label, prompt, type, options, correct, skill, max_points, required</span>. Types:
                  <strong> short</strong>, <strong> paragraph</strong>, <strong> multiple_choice</strong>,{" "}
                  <strong> checkboxes</strong>, <strong> rating</strong>, <strong> numeric</strong>. Use <strong>|</strong> to
                  separate options. Category values: <strong>quiz</strong>, <strong>homework</strong>, <strong>test</strong>.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn variant="secondary" onClick={handleTemplateDownload}>
                    Download Template
                  </Btn>
                  {activeForm && (
                    <Btn variant="secondary" onClick={handleExportCurrentForm}>
                      Download Current Form
                    </Btn>
                  )}
                  <label
                    style={{
                      border: `1px dashed ${borderColor}`,
                      borderRadius: 12,
                      padding: "10px 14px",
                      cursor: "pointer",
                      background: cardBg,
                      fontSize: 14,
                    }}
                  >
                    {legacyFile ? legacyFile.name : "Choose Excel file"}
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(event) => setLegacyFile(event.target.files?.[0] || null)}
                      style={{ display: "none" }}
                    />
                  </label>
                  <Btn variant="primary" onClick={handleLegacyImport} disabled={legacyBusy}>
                    {legacyBusy ? "Importing..." : "Import"}
                  </Btn>
                </div>
                {legacyError && <div style={{ color: "#fca5a5", fontSize: 13 }}>{legacyError}</div>}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {newFormOpen ? (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setNewFormOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.78)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: 16,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(520px, 100%)",
                borderRadius: 18,
                border: `1px solid ${borderColor}`,
                background: panelBg,
                padding: 20,
                boxShadow: "0 24px 50px rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(12px) saturate(140%)",
                WebkitBackdropFilter: "blur(12px) saturate(140%)",
                color: textPrimary,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Choose form type</h3>
                  <p style={{ margin: "6px 0 0", color: textMuted, fontSize: 14 }}>
                    Pick the category before creating the form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewFormOpen(false)}
                  style={{ border: "none", background: "none", color: textPrimary, fontSize: 18, cursor: "pointer" }}
                  aria-label="Close dialog"
                >
                  X
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {formCategories.map((option) => {
                  const active = newFormCategory === option.value;
                  const meta = formCategoryMeta[option.value] || {};
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewFormCategory(option.value)}
                      style={{
                        border: `1px solid ${active ? (meta.accent || accent) : borderColor}`,
                        background: active ? (meta.boxBg || "rgba(37, 99, 235, 0.18)") : cardBg,
                        color: textPrimary,
                        borderRadius: 14,
                        padding: "16px 12px",
                        textAlign: "center",
                        cursor: "pointer",
                        fontWeight: 600,
                        aspectRatio: "1 / 1",
                        minHeight: 120,
                        display: "grid",
                        placeItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          display: "grid",
                          placeItems: "center",
                          background: active ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.08)",
                          color: active ? meta.accent || accent : textPrimary,
                          fontWeight: 700,
                        }}
                      >
                        {meta.icon}
                      </div>
                      <div style={{ fontSize: 14 }}>{option.label}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <Btn variant="secondary" onClick={() => setNewFormOpen(false)}>
                  Cancel
                </Btn>
                <Btn variant="primary" onClick={() => handleCreateForm(newFormCategory)}>
                  Create Form
                </Btn>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
