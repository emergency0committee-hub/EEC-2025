import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

const GRADEBOOK_STORAGE_KEY = "ai_educator_gradebook_v1";
const FORMS_TABLE = "cg_ai_forms";
const QUESTIONS_TABLE = "cg_ai_form_questions";
const SUBMISSIONS_TABLE = "cg_ai_form_submissions";

const makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const getUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return makeId();
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getCachedUser = () => {
  try {
    const raw = localStorage.getItem("cg_current_user_v1");
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
};

const isAdminRole = (role) => {
  const normalized = String(role || "").toLowerCase();
  return normalized === "admin" || normalized === "administrator";
};

const canViewAllForms = () => {
  try {
    if (localStorage.getItem("cg_admin_ok_v1") === "1") return true;
  } catch {}
  const cached = getCachedUser();
  return isAdminRole(cached.role);
};

export const QUESTION_TYPES = [
  { value: "short", label: "Short answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "numeric", label: "Numeric score" },
];

const QUESTION_TYPE_VALUES = new Set(QUESTION_TYPES.map((item) => item.value));
export const QUESTION_TYPES_WITH_OPTIONS = new Set(["multiple_choice", "checkboxes"]);

export const normalizeGradebookLabel = (value) => String(value || "").trim();

const buildGradebookDefaults = () => ({
  version: 1,
  skills: [],
  assessments: [],
  scores: {},
  responseMeta: {},
});

const normalizeFormCategory = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["quiz", "homework", "test"].includes(normalized)) return normalized;
  return "quiz";
};

const createQuestion = (index) => ({
  id: getUuid(),
  label: `Q${index}`,
  prompt: "",
  type: "short",
  options: [],
  correctOptions: [],
  maxPoints: 1,
  skill: "",
  required: false,
});

const normalizeQuestion = (question, index) => {
  const fallback = createQuestion(index + 1);
  const prompt =
    typeof question?.prompt === "string"
      ? question.prompt
      : typeof question?.label === "string"
        ? question.label
        : fallback.prompt;
  const rawType = typeof question?.type === "string" ? question.type : fallback.type;
  const type = QUESTION_TYPE_VALUES.has(rawType) ? rawType : fallback.type;
  const options = Array.isArray(question?.options) ? question.options : fallback.options;
  const hasOptionList = QUESTION_TYPES_WITH_OPTIONS.has(type);
  const normalizedOptions = hasOptionList && options.length === 0 ? ["Option 1", "Option 2"] : options;
  const rawCorrect =
    Array.isArray(question?.correctOptions)
      ? question.correctOptions
      : Array.isArray(question?.correct)
      ? question.correct
      : question?.correctOption
      ? [question.correctOption]
      : [];
  const normalizedCorrect = hasOptionList
    ? rawCorrect.filter((value) => normalizedOptions.includes(value))
    : [];
  const finalCorrect =
    type === "multiple_choice"
      ? normalizedCorrect.length > 0
        ? [normalizedCorrect[0]]
        : []
      : normalizedCorrect;
  const required = typeof question?.required === "boolean" ? question.required : fallback.required;
  return {
    ...fallback,
    ...question,
    id: isUuid(question?.id) ? question.id : fallback.id,
    label: typeof question?.label === "string" && question.label.trim() ? question.label : fallback.label,
    prompt,
    type,
    options: normalizedOptions,
    correctOptions: finalCorrect,
    maxPoints: question?.maxPoints ?? fallback.maxPoints,
    skill: typeof question?.skill === "string" ? question.skill : fallback.skill,
    required,
  };
};

const toQuestionRow = (question, formId, sortIndex) => ({
  id: isUuid(question.id) ? question.id : getUuid(),
  form_id: formId,
  label: question.label || null,
  prompt: question.prompt || null,
  question_type: question.type || "short",
  options: Array.isArray(question.options) ? question.options : [],
  correct_options: Array.isArray(question.correctOptions) ? question.correctOptions : [],
  skill: question.skill || null,
  max_points: Number.isFinite(Number(question.maxPoints)) ? Number(question.maxPoints) : null,
  required: Boolean(question.required),
  sort_index: Number.isFinite(sortIndex) ? sortIndex : null,
});

const fromQuestionRow = (row, index) =>
  normalizeQuestion(
    {
      id: row.id,
      label: row.label,
      prompt: row.prompt,
      type: row.question_type,
      options: Array.isArray(row.options) ? row.options : [],
      correctOptions: Array.isArray(row.correct_options) ? row.correct_options : [],
      skill: row.skill,
      maxPoints: row.max_points,
      required: row.required,
    },
    index
  );

export function useGradebookState() {
  const [gradebook, setGradebook] = useState(() => {
    if (typeof window === "undefined") return buildGradebookDefaults();
    try {
      const raw = localStorage.getItem(GRADEBOOK_STORAGE_KEY);
      if (!raw) return buildGradebookDefaults();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return buildGradebookDefaults();
      const normalizeAssessment = (assessment) => {
        const questions = Array.isArray(assessment?.questions)
          ? assessment.questions.map((question, index) => normalizeQuestion(question, index))
          : [];
        return { ...assessment, category: normalizeFormCategory(assessment?.category), questions };
      };
      return {
        ...buildGradebookDefaults(),
        ...parsed,
        assessments: Array.isArray(parsed.assessments)
          ? parsed.assessments.map(normalizeAssessment)
          : [],
        scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
        responseMeta: parsed.responseMeta && typeof parsed.responseMeta === "object" ? parsed.responseMeta : {},
      };
    } catch {
      return buildGradebookDefaults();
    }
  });
  const [authUserId, setAuthUserId] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthUserId(data?.user?.id || null);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthUserId(session?.user?.id || null);
    });
    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(GRADEBOOK_STORAGE_KEY, JSON.stringify(gradebook));
    } catch {}
  }, [gradebook]);

  useEffect(() => {
    if (!authUserId) return;
    let active = true;
    const loadForms = async () => {
      const formQuery = supabase
        .from(FORMS_TABLE)
        .select("id,title,description,category,updated_at,created_by")
        .order("updated_at", { ascending: false });

      if (!canViewAllForms()) {
        formQuery.eq("created_by", authUserId);
      }

      const { data: forms, error: formsError } = await formQuery;

      if (!active) return;
      if (formsError) {
        console.error("Failed to load AI educator forms:", formsError);
        return;
      }

      const formIds = (forms || []).map((form) => form.id).filter(Boolean);
      let questionRows = [];
      let submissionsByForm = null;
      let responseMeta = null;
      if (formIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from(QUESTIONS_TABLE)
          .select("id,form_id,label,prompt,question_type,options,correct_options,skill,max_points,required,sort_index")
          .in("form_id", formIds)
          .order("sort_index", { ascending: true });

        if (!active) return;
        if (questionsError) {
          console.error("Failed to load AI educator questions:", questionsError);
        } else {
          questionRows = questions || [];
        }

        const { data: submissions, error: submissionsError } = await supabase
          .from(SUBMISSIONS_TABLE)
          .select("id,form_id,respondent_email,respondent_name,respondent_school,respondent_class,respondent_phone,scores,updated_at,created_at")
          .in("form_id", formIds)
          .order("updated_at", { ascending: false });

        if (!active) return;
        if (submissionsError) {
          console.error("Failed to load AI educator submissions:", submissionsError);
        } else {
          submissionsByForm = {};
          responseMeta = {};
          formIds.forEach((id) => {
            submissionsByForm[id] = {};
            responseMeta[id] = {};
          });
          (submissions || []).forEach((row) => {
            if (!row?.form_id) return;
            const key =
              normalizeGradebookLabel(row.respondent_email) ||
              normalizeGradebookLabel(row.respondent_name) ||
              row.id;
            if (!submissionsByForm[row.form_id][key]) {
              submissionsByForm[row.form_id][key] =
                row.scores && typeof row.scores === "object" ? row.scores : {};
              responseMeta[row.form_id][key] = {
                id: row.id,
                email: row.respondent_email || "",
                name: row.respondent_name || "",
                school: row.respondent_school || "",
                className: row.respondent_class || "",
                phone: row.respondent_phone || "",
                updated_at: row.updated_at || row.created_at || null,
              };
            }
          });
        }
      }

      const grouped = questionRows.reduce((acc, row) => {
        if (!row?.form_id) return acc;
        if (!acc[row.form_id]) acc[row.form_id] = [];
        acc[row.form_id].push(row);
        return acc;
      }, {});

      const assessments = (forms || []).map((form) => {
        const rows = grouped[form.id] || [];
        const sorted = [...rows].sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
        const questions = sorted.map((row, index) => fromQuestionRow(row, index));
        return {
          id: form.id,
          title: form.title || "",
          description: form.description || "",
          category: normalizeFormCategory(form.category),
          questions,
        };
      });

      const derivedSkills = assessments
        .flatMap((assessment) => assessment.questions || [])
        .map((question) => normalizeGradebookLabel(question.skill))
        .filter(Boolean);

      setGradebook((prev) => ({
        ...prev,
        assessments,
        skills: Array.from(new Set([...(prev.skills || []), ...derivedSkills])),
        ...(submissionsByForm ? { scores: submissionsByForm, responseMeta } : {}),
      }));
    };

    loadForms();
    return () => {
      active = false;
    };
  }, [authUserId]);

  const addSkill = (name) => {
    const clean = normalizeGradebookLabel(name);
    if (!clean) return;
    setGradebook((prev) => {
      const exists = prev.skills.some((skill) => skill.toLowerCase() === clean.toLowerCase());
      if (exists) return prev;
      return { ...prev, skills: [...prev.skills, clean] };
    });
  };

  const addAssessment = ({ title, questionCount, category }) => {
    const cleanTitle = normalizeGradebookLabel(title);
    if (!cleanTitle) return null;
    const count = Math.max(1, Math.min(100, parseInt(questionCount, 10) || 1));
    const id = getUuid();
    const questions = Array.from({ length: count }, (_, idx) => createQuestion(idx + 1));
    const assessment = { id, title: cleanTitle, description: "", category: normalizeFormCategory(category), questions };

    setGradebook((prev) => ({
      ...prev,
      assessments: [assessment, ...prev.assessments],
      scores: { ...prev.scores, [id]: prev.scores[id] || {} },
    }));

    (async () => {
      if (!authUserId) return;
      const { error: insertError } = await supabase.from(FORMS_TABLE).insert({
        id,
        created_by: authUserId,
        title: cleanTitle,
        description: "",
        category: normalizeFormCategory(category),
      });
      if (insertError) {
        console.error("Failed to create form:", insertError);
        return;
      }
      if (questions.length > 0) {
        const payload = questions.map((question, idx) => toQuestionRow(question, id, idx));
        const { error: questionError } = await supabase.from(QUESTIONS_TABLE).insert(payload);
        if (questionError) {
          console.error("Failed to create questions:", questionError);
        }
      }
    })();

    return id;
  };

  const importForm = async ({ title, description, questions, category }) => {
    const cleanTitle = normalizeGradebookLabel(title) || "Imported form";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const normalizedQuestions = Array.isArray(questions)
      ? questions.map((question, index) => normalizeQuestion(question, index))
      : [];
    const formId = getUuid();
    const normalizedCategory = normalizeFormCategory(category);

    setGradebook((prev) => ({
      ...prev,
      assessments: [
        { id: formId, title: cleanTitle, description: cleanDescription, category: normalizedCategory, questions: normalizedQuestions },
        ...prev.assessments,
      ],
      scores: { ...prev.scores, [formId]: prev.scores[formId] || {} },
    }));

    const derivedSkills = normalizedQuestions
      .map((question) => normalizeGradebookLabel(question.skill))
      .filter(Boolean);
    if (derivedSkills.length) {
      setGradebook((prev) => ({
        ...prev,
        skills: Array.from(new Set([...(prev.skills || []), ...derivedSkills])),
      }));
    }

    if (!authUserId) return formId;

    const { error: insertError } = await supabase.from(FORMS_TABLE).insert({
      id: formId,
      created_by: authUserId,
      title: cleanTitle,
      description: cleanDescription,
      category: normalizedCategory,
    });
    if (insertError) {
      console.error("Failed to import form:", insertError);
      return formId;
    }

    if (normalizedQuestions.length > 0) {
      const payload = normalizedQuestions.map((question, idx) => toQuestionRow(question, formId, idx));
      const { error: questionError } = await supabase.from(QUESTIONS_TABLE).insert(payload);
      if (questionError) {
        console.error("Failed to import questions:", questionError);
      }
    }

    return formId;
  };

  const removeAssessment = (assessmentId) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.filter((assessment) => assessment.id !== assessmentId);
      const { [assessmentId]: _removed, ...restScores } = prev.scores || {};
      return { ...prev, assessments: nextAssessments, scores: restScores };
    });

    (async () => {
      if (!assessmentId) return;
      const { error } = await supabase.from(FORMS_TABLE).delete().eq("id", assessmentId);
      if (error) {
        console.error("Failed to delete form:", error);
      }
    })();
  };

  const updateAssessmentMeta = (assessmentId, patch) => {
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) =>
        assessment.id === assessmentId ? { ...assessment, ...patch } : assessment
      );
      return { ...prev, assessments: nextAssessments };
    });

    if (!assessmentId || !patch || typeof patch !== "object") return;
    const payload = {};
    if ("title" in patch) payload.title = patch.title;
    if ("description" in patch) payload.description = patch.description;
    if ("category" in patch) payload.category = normalizeFormCategory(patch.category);
    if (Object.keys(payload).length === 0) return;
    supabase
      .from(FORMS_TABLE)
      .update(payload)
      .eq("id", assessmentId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update form:", error);
        }
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

    if (!questionId || !patch || typeof patch !== "object") return;
    if (!isUuid(questionId)) return;
    const payload = {};
    if ("label" in patch) payload.label = patch.label;
    if ("prompt" in patch) payload.prompt = patch.prompt;
    if ("type" in patch) payload.question_type = patch.type;
    if ("options" in patch) payload.options = Array.isArray(patch.options) ? patch.options : [];
    if ("correctOptions" in patch) {
      payload.correct_options = Array.isArray(patch.correctOptions) ? patch.correctOptions : [];
    }
    if ("skill" in patch) payload.skill = patch.skill;
    if ("maxPoints" in patch) {
      const numeric = Number(patch.maxPoints);
      payload.max_points = Number.isFinite(numeric) ? numeric : null;
    }
    if ("required" in patch) payload.required = patch.required;
    if ("sortIndex" in patch) payload.sort_index = patch.sortIndex;
    if (Object.keys(payload).length === 0) return;

    supabase
      .from(QUESTIONS_TABLE)
      .update(payload)
      .eq("id", questionId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update question:", error);
        }
      });
  };

  const addQuestion = (assessmentId) => {
    let insertedQuestion = null;
    let insertedSort = null;
    setGradebook((prev) => {
      const nextAssessments = prev.assessments.map((assessment) => {
        if (assessment.id !== assessmentId) return assessment;
        const current = Array.isArray(assessment.questions) ? assessment.questions : [];
        const nextIndex = current.length + 1;
        const nextQuestion = createQuestion(nextIndex);
        insertedQuestion = nextQuestion;
        insertedSort = current.length;
        return {
          ...assessment,
          questions: [...current, nextQuestion],
        };
      });
      return { ...prev, assessments: nextAssessments };
    });

    if (!assessmentId || !insertedQuestion) return;
    if (!isUuid(insertedQuestion.id)) return;
    supabase
      .from(QUESTIONS_TABLE)
      .insert(toQuestionRow(insertedQuestion, assessmentId, insertedSort))
      .then(({ error }) => {
        if (error) {
          console.error("Failed to add question:", error);
        }
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

    if (!isUuid(questionId)) return;
    supabase
      .from(QUESTIONS_TABLE)
      .delete()
      .eq("id", questionId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete question:", error);
        }
      });
  };

  const saveAssessment = async (assessmentId) => {
    if (!assessmentId) return { ok: false, error: "Missing form id." };
    const assessment = gradebook.assessments.find((item) => item.id === assessmentId);
    if (!assessment) return { ok: false, error: "Form not found." };
    if (!authUserId) return { ok: false, error: "Sign in required to save." };

    const formPayload = {
      id: assessmentId,
      created_by: authUserId,
      title: assessment.title || "Untitled form",
      description: assessment.description || "",
      category: normalizeFormCategory(assessment.category),
    };
    const { error: formError } = await supabase.from(FORMS_TABLE).upsert(formPayload, { onConflict: "id" });
    if (formError) {
      console.error("Failed to save form:", formError);
      return { ok: false, error: formError.message || "Failed to save form." };
    }

    const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
    const questionPayload = questions
      .map((question, idx) => toQuestionRow(question, assessmentId, idx))
      .filter((row) => isUuid(row.id));
    if (questionPayload.length > 0) {
      const { error: questionError } = await supabase
        .from(QUESTIONS_TABLE)
        .upsert(questionPayload, { onConflict: "id" });
      if (questionError) {
        console.error("Failed to save questions:", questionError);
        return { ok: false, error: questionError.message || "Failed to save questions." };
      }
    }

    return { ok: true, error: "" };
  };

  return {
    gradebook,
    addSkill,
    addAssessment,
    importForm,
    removeAssessment,
    updateAssessmentMeta,
    updateQuestionMeta,
    addQuestion,
    removeQuestion,
    saveAssessment,
  };
}
