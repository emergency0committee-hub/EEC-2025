// src/pages/admin/AdminQuestionBank.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import LanguageButton from "../../components/LanguageButton.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import { LANGS } from "../../i18n/strings.js";
import Btn from "../../components/Btn.jsx";
import { BlockMath, InlineMath } from "react-katex";
import {
  createAssignmentQuestion,
  deleteAssignmentQuestion,
  listAssignmentQuestions,
  updateAssignmentQuestion,
} from "../../lib/assignmentQuestions.js";
import {
  SUBJECT_OPTIONS,
  HARDNESS_OPTIONS,
  MATH_UNIT_OPTIONS,
  MATH_LESSON_OPTIONS,
  BANKS,
  createDefaultForm,
  normalizeSubjectValue,
} from "../../lib/questionBanks.js";

const LOCAL_IMAGE_STORE_KEY = "cg_question_images_v1";
const LOCAL_IMAGE_PREFIX = "local-image://";
const DEFAULT_TABLE_ROWS = 2;
const DEFAULT_TABLE_COLS = 2;
const MAX_TABLE_ROWS = 10;
const MAX_TABLE_COLS = 6;

const COPY = {
  EN: {
    title: "Question Bank",
    subtitle: "Add and manage questions for quizzes, homework, and classwork.",
    questionType: "Question Type",
    mcqLabel: "Multiple Choice (A/B/C/D)",
    fillLabel: "Fill in the Blank",
    subject: "Subject",
    unit: "Unit",
    lesson: "Lesson",
    hardness: "Difficulty",
    skill: "Skill",
    question: "Question",
    answers: "Answers",
    answer: (label) => `Answer ${label}`,
    fillAnswerLabel: "Correct answer",
    correctAnswer: "Correct Choice",
    imageLabel: "Image URL",
    imageUpload: "Upload image",
    imageUploading: "Uploading...",
    imageAlt: "Question image (optional)",
    removeImage: "Remove Image",
    optional: "optional",
    create: "Save Question",
    reset: "Reset",
    filters: "Filters",
    filterQuestionType: "Question Type",
    filterAll: "All",
    tableQuestion: "Question",
    tableSubject: "Subject",
    tableUnit: "Unit",
    tableLesson: "Lesson",
    tableType: "Type",
    tableHardness: "Difficulty",
    tableSkill: "Skill",
    tableImage: "Image",
    tableCreated: "Created",
    tableActions: "Actions",
    delete: "Delete",
    deleteConfirm: "Delete this question?",
    noResults: "No questions yet. Add your first one above.",
    loadError: "Could not load questions.",
    createSuccess: "Question saved.",
    updateSuccess: "Question updated.",
    uploadTip: "Drag & drop an image or click to upload. You can also paste a publicly accessible image URL.",
    refresh: "Refresh",
    update: "Update Question",
    cancelEdit: "Cancel Editing",
    editingNotice: "Editing existing question",
    edit: "Edit",
    preview: "Preview",
    close: "Close",
    previewTitle: "Question Preview",
    importLabel: "Import CSV",
    importHint: "Upload a CSV file to queue multiple questions.",
    importingStatus: "Importing question {current} of {total}",
    importSubmit: "Save & Next",
    skip: "Skip",
    cancelImport: "Cancel Import",
    importError: "Could not process the CSV file.",
    importEmpty: "No rows found in the CSV.",
    importFinished: "Import completed.",
    importPreviewTitle: "Imported Question Preview",
    importSkipped: "Question skipped.",
    tabMath: "Math Bank",
    tabEnglish: "English Bank",
    tabTests: "Test Bank",
    tableBuilderTitle: "Table Builder",
    tableBuilderInstructions: "Configure rows and columns, fill the cells, then insert the table into the question or an answer.",
    tableBuilderRows: "Rows",
    tableBuilderCols: "Columns",
    tableBuilderIncludeHeader: "Use first row as header",
    tableBuilderTarget: "Insert into",
    tableBuilderCellsLabel: "Cells",
    tableBuilderCellPlaceholder: "Cell",
    tableBuilderPreview: "Preview",
    tableBuilderPreviewEmpty: "Add content to preview the table.",
    tableBuilderInsert: "Insert Table",
    tableBuilderClear: "Clear cells",
    tableBuilderInsertSuccess: "Table inserted.",
    tableBuilderEmptyError: "Please add some content to the table before inserting.",
    tableBuilderHide: "Hide table builder",
    addTable: "Add table",
    addImage: "Add image",
    hideImage: "Hide image tools",
    tableBuilderMergedCell: "Merged",
    tableBuilderSelectedCell: (row, col) => `Selected cell: Row ${row + 1}, Column ${col + 1}`,
    tableBuilderMergeRight: "Merge right",
    tableBuilderMergeDown: "Merge down",
    tableBuilderSplitCell: "Split cell",
  },
  AR: {
    title: "بنك الأسئلة",
    subtitle: "أضف الأسئلة وادِرها للاختبارات والواجبات والتمارين الصفية.",
    questionType: "نوع السؤال",
    mcqLabel: "اختيار من متعدد (أ/ب/ج/د)",
    fillLabel: "إملأ الفراغ",
    subject: "المادة",
    unit: "الوحدة",
    lesson: "الدرس",
    hardness: "درجة الصعوبة",
    skill: "المهارة",
    question: "السؤال",
    answers: "الإجابات",
    answer: (label) => `الإجابة ${label}`,
    fillAnswerLabel: "الإجابة الصحيحة",
    correctAnswer: "الخيار الصحيح",
    imageLabel: "رابط الصورة",
    imageUpload: "رفع صورة",
    imageUploading: "جاري الرفع...",
    imageAlt: "صورة السؤال (اختياري)",
    removeImage: "إزالة الصورة",
    optional: "اختياري",
    create: "حفظ السؤال",
    reset: "إعادة ضبط",
    filters: "عوامل التصفية",
    filterQuestionType: "نوع السؤال",
    filterAll: "الكل",
    tableQuestion: "السؤال",
    tableSubject: "المادة",
    tableUnit: "الوحدة",
    tableLesson: "الدرس",
    tableType: "النوع",
    tableHardness: "الصعوبة",
    tableSkill: "المهارة",
    tableImage: "الصورة",
    tableCreated: "تاريخ الإضافة",
    tableActions: "إجراءات",
    delete: "حذف",
    deleteConfirm: "هل تريد حذف هذا السؤال؟",
    noResults: "لا توجد أسئلة بعد. أضف أول سؤال أعلاه.",
    loadError: "تعذّر تحميل الأسئلة.",
    createSuccess: "تم حفظ السؤال.",
    updateSuccess: "تم تحديث السؤال.",
    uploadTip: "اسحب الصورة وأفلتها أو اضغط للرفع. يمكنك أيضًا لصق رابط صورة متاحة للجميع.",
    refresh: "تحديث",
    update: "تحديث السؤال",
    cancelEdit: "إلغاء التعديل",
    editingNotice: "تعديل سؤال موجود",
    edit: "تعديل",
    preview: "عرض",
    close: "إغلاق",
    previewTitle: "معاينة السؤال",
    importLabel: "استيراد CSV",
    importHint: "قم برفع ملف CSV لإضافة عدة أسئلة.",
    importingStatus: "استيراد السؤال {current} من {total}",
    importSubmit: "حفظ والانتقال",
    skip: "تخطي",
    cancelImport: "إلغاء الاستيراد",
    importError: "تعذر معالجة ملف CSV.",
    importEmpty: "لا توجد صفوف في ملف CSV.",
    importFinished: "اكتمل الاستيراد.",
    importPreviewTitle: "معاينة السؤال المستورد",
    importSkipped: "تم تخطي السؤال.",
   tabMath: "بنك الرياضيات",
    tabEnglish: "بنك اللغة الإنجليزية",
    tabTests: "بنك الاختبارات",
    tableBuilderTitle: "منشئ الجداول",
    tableBuilderInstructions: "اضبط عدد الصفوف والأعمدة واملأ الخلايا ثم أدرج الجدول في السؤال أو الإجابة.",
    tableBuilderRows: "عدد الصفوف",
    tableBuilderCols: "عدد الأعمدة",
    tableBuilderIncludeHeader: "استخدام الصف الأول كعنوان",
    tableBuilderTarget: "الإدراج في",
    tableBuilderCellsLabel: "الخلايا",
    tableBuilderCellPlaceholder: "خلية",
    tableBuilderPreview: "معاينة",
    tableBuilderPreviewEmpty: "أضف محتوى لعرض الجدول.",
    tableBuilderInsert: "إدراج الجدول",
    tableBuilderClear: "مسح الخلايا",
    tableBuilderInsertSuccess: "تم إدراج الجدول.",
    tableBuilderEmptyError: "يرجى إدخال محتوى في خلايا الجدول قبل الإدراج.",
    tableBuilderHide: "إخفاء منشئ الجداول",
    addTable: "إضافة جدول",
    addImage: "إضافة صورة",
    hideImage: "إخفاء خيارات الصورة",
    tableBuilderMergedCell: "مُدمج",
    tableBuilderSelectedCell: (row, col) => `الخلية المحددة: الصف ${row + 1}، العمود ${col + 1}`,
    tableBuilderMergeRight: "دمج إلى اليمين",
    tableBuilderMergeDown: "دمج إلى الأسفل",
    tableBuilderSplitCell: "فصل الخلية",
  },
  FR: {
    title: "Banque de questions",
    subtitle: "Ajoutez et gérez des questions pour les quiz, devoirs et travaux en classe.",
    questionType: "Type de question",
    mcqLabel: "Choix multiples (A/B/C/D)",
    fillLabel: "Réponse libre",
    subject: "Matière",
    unit: "Unité",
    lesson: "Leçon",
    hardness: "Difficulté",
    skill: "Compétence",
    question: "Question",
    answers: "Réponses",
    answer: (label) => `Réponse ${label}`,
    fillAnswerLabel: "Bonne réponse",
    correctAnswer: "Choix correct",
    imageLabel: "URL de l'image",
    imageUpload: "Téléverser une image",
    imageUploading: "Téléversement...",
    imageAlt: "Image de la question (optionnel)",
    removeImage: "Supprimer l'image",
    optional: "optionnel",
    create: "Enregistrer",
    reset: "Réinitialiser",
    filters: "Filtres",
    filterQuestionType: "Type de question",
    filterAll: "Tous",
    tableQuestion: "Question",
    tableSubject: "Matière",
    tableUnit: "Unité",
    tableLesson: "Leçon",
    tableType: "Type",
    tableHardness: "Difficulté",
    tableSkill: "Compétence",
    tableImage: "Image",
    tableCreated: "Créé le",
    tableActions: "Actions",
    delete: "Supprimer",
    deleteConfirm: "Supprimer cette question ?",
    noResults: "Aucune question pour le moment. Ajoutez-en une ci-dessus.",
    loadError: "Impossible de charger les questions.",
    createSuccess: "Question enregistrée.",
    updateSuccess: "Question mise à jour.",
    uploadTip: "Glissez-déposez une image ou cliquez pour la téléverser. Vous pouvez aussi coller une URL publique.",
    refresh: "Actualiser",
    update: "Mettre à jour la question",
    cancelEdit: "Annuler la modification",
    editingNotice: "Modification d'une question existante",
    edit: "Modifier",
    preview: "Aperçu",
    close: "Fermer",
    previewTitle: "Aperçu de la question",
    importLabel: "Importer un CSV",
    importHint: "Téléversez un fichier CSV pour ajouter plusieurs questions.",
    importingStatus: "Import de la question {current} sur {total}",
    importSubmit: "Enregistrer et continuer",
    skip: "Ignorer",
    cancelImport: "Annuler l'import",
    importError: "Impossible de traiter le fichier CSV.",
    importEmpty: "Aucune ligne trouvée dans le CSV.",
    importFinished: "Import terminé.",
    importPreviewTitle: "Aperçu de la question importée",
    importSkipped: "Question ignorée.",
    tabMath: "Banque Maths",
    tabEnglish: "Banque Anglais",
    tabTests: "Banque Tests",
    tableBuilderTitle: "Créateur de tableau",
    tableBuilderInstructions: "Configurez les lignes et colonnes, remplissez les cellules puis insérez le tableau dans la question ou la réponse.",
    tableBuilderRows: "Lignes",
    tableBuilderCols: "Colonnes",
    tableBuilderIncludeHeader: "Utiliser la première ligne comme en-tête",
    tableBuilderTarget: "Insérer dans",
    tableBuilderCellsLabel: "Cellules",
    tableBuilderCellPlaceholder: "Cellule",
    tableBuilderPreview: "Aperçu",
    tableBuilderPreviewEmpty: "Ajoutez du contenu pour afficher l'aperçu du tableau.",
    tableBuilderInsert: "Insérer le tableau",
    tableBuilderClear: "Effacer les cellules",
    tableBuilderInsertSuccess: "Tableau inséré.",
    tableBuilderEmptyError: "Veuillez remplir au moins une cellule avant d'insérer le tableau.",
    tableBuilderHide: "Masquer le créateur de tableau",
    addTable: "Ajouter un tableau",
    addImage: "Ajouter une image",
    hideImage: "Masquer les options d'image",
    tableBuilderMergedCell: "Fusionné",
    tableBuilderSelectedCell: (row, col) => `Cellule sélectionnée : ligne ${row + 1}, colonne ${col + 1}`,
    tableBuilderMergeRight: "Fusionner vers la droite",
    tableBuilderMergeDown: "Fusionner vers le bas",
    tableBuilderSplitCell: "Séparer la cellule",
  },
};



const QUESTION_TYPES = [
  { value: "mcq", labelKey: "mcqLabel" },
  { value: "fill", labelKey: "fillLabel" },
];

export default function AdminQuestionBank({ onNavigate, lang = "EN", setLang }) {
  AdminQuestionBank.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
    setLang: PropTypes.func,
  };

  const copy = COPY[lang] || COPY.EN;

  const [activeBank, setActiveBank] = useState("math");
  const bank = BANKS[activeBank] || BANKS.math;

  const [form, setForm] = useState(() => createDefaultForm(bank));
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({ type: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [localImages, setLocalImages] = useState(() => loadLocalImages());
  const [reloadKey, setReloadKey] = useState(0);
  const [editingRow, setEditingRow] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [showImageTools, setShowImageTools] = useState(false);
  const [showTableBuilder, setShowTableBuilder] = useState(false);
  const [tableBuilder, setTableBuilder] = useState(() => createInitialTableBuilder());
  const importInputRef = useRef(null);
  const [importRows, setImportRows] = useState([]);
  const [importIndex, setImportIndex] = useState(0);
  const [importError, setImportError] = useState("");
  const isEditing = Boolean(editingRow);
  const isImporting = importRows.length > 0;
  const isImportingActive = isImporting && !isEditing;
  const currentImportRow = isImportingActive ? importRows[importIndex] : null;

  const tableTargets = useMemo(() => {
    const values = getTableTargetValues(form.questionType);
    return values.map((value) => ({
      value,
      label: tableTargetLabel(copy, value),
    }));
  }, [copy, form.questionType]);

  const tablePreviewHtml = useMemo(
    () => buildTableHtml(tableBuilder.cells, tableBuilder.includeHeader),
    [tableBuilder.cells, tableBuilder.includeHeader]
  );

  const canInsertTable = hasTableContent(tableBuilder.cells);

  useEffect(() => {
    const allowed = getTableTargetValues(form.questionType);
    setTableBuilder((prev) => {
      if (allowed.includes(prev.target)) return prev;
      return { ...prev, target: allowed[0] || "question" };
    });
  }, [form.questionType]);

  useEffect(() => {
    const defaultForm = createDefaultForm(bank);
    setForm(defaultForm);
    setEditingRow(null);
    setPreviewRow(null);
    setImportRows([]);
    setImportIndex(0);
    setImportError("");
    setSuccessMessage("");
    setFilters({ type: "all" });
    setQuestions([]);
    setLocalImages(loadLocalImages());
    setShowImageTools(false);
    setShowTableBuilder(false);
    setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
  }, [bank]);

  const handleTableDimensionChange = (field, rawValue) => {
    setTableBuilder((prev) => {
      const limit = field === "rows" ? MAX_TABLE_ROWS : MAX_TABLE_COLS;
      const fallback = field === "rows" ? prev.rows : prev.cols;
      const parsed = parseInt(rawValue, 10);
      const clamped = clamp(Number.isFinite(parsed) ? parsed : fallback, 1, limit);
      const nextRows = field === "rows" ? clamped : prev.rows;
      const nextCols = field === "cols" ? clamped : prev.cols;
      const nextCells = resizeTableCells(prev.cells, nextRows, nextCols);
      let nextActive = { ...prev.activeCell };
      nextActive.row = Math.min(nextActive.row, nextRows - 1);
      nextActive.col = Math.min(nextActive.col, nextCols - 1);
      if (nextActive.row < 0 || nextActive.col < 0 || nextCells[nextActive.row][nextActive.col].hidden) {
        nextActive = { row: 0, col: 0 };
      }
      return {
        ...prev,
        rows: nextRows,
        cols: nextCols,
        cells: nextCells,
        activeCell: nextActive,
      };
    });
  };

  const handleTableCellChange = (rowIndex, colIndex, value) => {
    setTableBuilder((prev) => {
      const target = prev.cells[rowIndex]?.[colIndex];
      if (!target || target.hidden) return prev;
      const cells = cloneCells(prev.cells);
      cells[rowIndex][colIndex].text = value;
      return { ...prev, cells };
    });
  };

  const handleSelectTableCell = (rowIndex, colIndex) => {
    const cell = tableBuilder.cells[rowIndex]?.[colIndex];
    if (!cell || cell.hidden) return;
    setTableBuilder((prev) => ({ ...prev, activeCell: { row: rowIndex, col: colIndex } }));
  };

  const handleMergeRight = () => {
    setTableBuilder((prev) => {
      const { row, col } = prev.activeCell;
      const master = prev.cells[row]?.[col];
      if (!master || master.hidden) return prev;
      const targetCol = col + master.colspan;
      if (targetCol >= prev.cols) return prev;

      for (let r = row; r < row + master.rowspan; r += 1) {
        const neighbor = prev.cells[r]?.[targetCol];
        if (!neighbor || neighbor.hidden || neighbor.rowspan !== 1 || neighbor.colspan !== 1) {
          return prev;
        }
      }

      const cells = cloneCells(prev.cells);
      const masterCell = cells[row][col];
      for (let r = row; r < row + masterCell.rowspan; r += 1) {
        const neighbor = cells[r][targetCol];
        neighbor.hidden = true;
        neighbor.master = { row, col };
        neighbor.text = "";
        neighbor.rowspan = 1;
        neighbor.colspan = 1;
      }
      masterCell.colspan += 1;
      return { ...prev, cells };
    });
  };

  const handleMergeDown = () => {
    setTableBuilder((prev) => {
      const { row, col } = prev.activeCell;
      const master = prev.cells[row]?.[col];
      if (!master || master.hidden) return prev;
      const targetRow = row + master.rowspan;
      if (targetRow >= prev.rows) return prev;

      for (let c = col; c < col + master.colspan; c += 1) {
        const neighbor = prev.cells[targetRow]?.[c];
        if (!neighbor || neighbor.hidden || neighbor.rowspan !== 1 || neighbor.colspan !== 1) {
          return prev;
        }
      }

      const cells = cloneCells(prev.cells);
      const masterCell = cells[row][col];
      for (let c = col; c < col + masterCell.colspan; c += 1) {
        const neighbor = cells[targetRow][c];
        neighbor.hidden = true;
        neighbor.master = { row, col };
        neighbor.text = "";
        neighbor.rowspan = 1;
        neighbor.colspan = 1;
      }
      masterCell.rowspan += 1;
      return { ...prev, cells };
    });
  };

  const handleSplitCell = () => {
    setTableBuilder((prev) => {
      const { row, col } = prev.activeCell;
      const master = prev.cells[row]?.[col];
      if (!master || master.hidden) return prev;
      if (master.rowspan === 1 && master.colspan === 1) return prev;

      const cells = cloneCells(prev.cells);
      for (let r = row; r < row + master.rowspan; r += 1) {
        for (let c = col; c < col + master.colspan; c += 1) {
          if (r === row && c === col) continue;
          const cell = cells[r][c];
          if (cell && cell.hidden && cell.master && cell.master.row === row && cell.master.col === col) {
            cells[r][c] = createCell();
          }
        }
      }
      cells[row][col].rowspan = 1;
      cells[row][col].colspan = 1;
      return { ...prev, cells };
    });
  };

  const handleToggleTableHeader = (checked) => {
    setTableBuilder((prev) => ({ ...prev, includeHeader: checked }));
  };

  const handleTableTargetChange = (value) => {
    setTableBuilder((prev) => ({ ...prev, target: value }));
  };

  const handleClearTableCells = () => {
    setTableBuilder((prev) => ({
      ...prev,
      cells: createEmptyTableCells(prev.rows, prev.cols),
      activeCell: { row: 0, col: 0 },
    }));
  };

  const handleInsertTable = () => {
    if (!hasTableContent(tableBuilder.cells)) {
      alert(copy.tableBuilderEmptyError);
      return;
    }
    const html = buildTableHtml(tableBuilder.cells, tableBuilder.includeHeader);
    const targetField = tableBuilder.target || "question";
    setForm((prev) => {
      if (!(targetField in prev)) return prev;
      return {
        ...prev,
        [targetField]: mergeTableContent(prev[targetField], html),
      };
    });
    setError("");
    setSuccessMessage(copy.tableBuilderInsertSuccess);
  };
  const refreshQuestions = () => setReloadKey((prev) => prev + 1);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listAssignmentQuestions({ table: bank.table });
        if (!ignore) setQuestions(data);
      } catch (err) {
        console.error("assignment question list", err);
        if (!ignore) setError(copy.loadError);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [bank.table, copy.loadError, reloadKey]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchType = filters.type === "all" ? true : q.question_type === filters.type;
      return matchType;
    });
  }, [questions, filters]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "subject") {
        if (bank.subjectLocked) return prev;
        const subjectValue = value;
        const next = { ...prev, subject: subjectValue };
        if (bank.supportsUnitLesson && subjectValue === "math") {
          const unit = MATH_UNIT_OPTIONS.some((opt) => opt.value === prev.unit)
            ? prev.unit
            : MATH_UNIT_OPTIONS[0]?.value || "";
          const lessonOptions = MATH_LESSON_OPTIONS[unit] || [];
          const lesson = lessonOptions.some((opt) => opt.value === prev.lesson)
            ? prev.lesson
            : lessonOptions[0]?.value || "";
          next.unit = unit;
          next.lesson = lesson;
        } else if (bank.supportsUnitLesson) {
          next.unit = "";
          next.lesson = "";
        }
        return next;
      }
      if (field === "unit") {
        if (!bank.supportsUnitLesson) return prev;
        const unit = value;
        const lessonOptions = MATH_LESSON_OPTIONS[unit] || [];
        const lesson = lessonOptions.some((opt) => opt.value === prev.lesson)
          ? prev.lesson
          : lessonOptions[0]?.value || "";
        return { ...prev, unit, lesson };
      }
      if (field === "lesson") {
        if (!bank.supportsUnitLesson) return prev;
        return { ...prev, lesson: value };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleReset = () => {
    const defaultForm = createDefaultForm(bank);
    setForm(defaultForm);
    setSuccessMessage("");
    setEditingRow(null);
    setShowImageTools(false);
    setShowTableBuilder(false);
    setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
  };

  const convertFileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadImageFile = async (file) => {
    if (!file) return false;
    if (file.type !== "image/png") {
      alert("Only PNG images are supported for question attachments.");
      return false;
    }
    try {
      setUploading(true);
      const dataUrl = await convertFileToDataUrl(file);
      const name = `assignment/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/\s+/g, "_")}`;
      const nextImages = { ...localImages, [name]: dataUrl || "" };
      setLocalImages(nextImages);
      persistLocalImages(nextImages);
      setForm((prev) => ({ ...prev, imageUrl: `${LOCAL_IMAGE_PREFIX}${name}` }));
      return true;
    } catch (err) {
      console.error("encode question image", err);
      alert(err?.message || "Failed to read image file.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    event.target.value = "";
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsImageDragOver(true);
  };

  const handleImageDragLeave = (event) => {
    event.preventDefault();
    const related = event.relatedTarget;
    if (related && event.currentTarget.contains(related)) return;
    setIsImageDragOver(false);
  };

  const handleImageDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsImageDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await uploadImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => {
      const current = prev.imageUrl;
      if (!current) return prev;
      if (current.startsWith(LOCAL_IMAGE_PREFIX)) {
        const key = current.slice(LOCAL_IMAGE_PREFIX.length);
        setLocalImages((map) => {
          const next = { ...map };
          if (next[key]) {
            delete next[key];
            persistLocalImages(next);
          }
          return next;
        });
      }
      return { ...prev, imageUrl: "" };
    });
  };

  const applyImportRow = (row) => {
    const nextForm = buildFormFromRow(row, bank);
    setForm(nextForm);
    setShowImageTools(Boolean(nextForm.imageUrl));
    setShowTableBuilder(false);
    setTableBuilder(createInitialTableBuilder(nextForm.questionType));
  };

  const startImport = (rows) => {
    if (!rows.length) {
      setImportError(copy.importEmpty);
      return;
    }
    setImportRows(rows);
    setImportIndex(0);
    setImportError("");
    setEditingRow(null);
    setPreviewRow(null);
    setSuccessMessage("");
    applyImportRow(rows[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advanceImport = (message) => {
    const nextIndex = importIndex + 1;
    setEditingRow(null);
    setPreviewRow(null);
    if (nextIndex < importRows.length) {
      setImportIndex(nextIndex);
      applyImportRow(importRows[nextIndex]);
      if (message) setSuccessMessage(message);
    } else {
      const defaultForm = createDefaultForm(bank);
      setImportRows([]);
      setImportIndex(0);
      setForm(defaultForm);
      setShowImageTools(false);
      setShowTableBuilder(false);
      setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
      setSuccessMessage(message || copy.importFinished);
    }
  };

  const handleImportSkip = () => {
    advanceImport(copy.importSkipped);
  };

  const handleImportCancel = () => {
    setImportRows([]);
    setImportIndex(0);
    setImportError("");
    setSuccessMessage("");
    setPreviewRow(null);
    setEditingRow(null);
    const defaultForm = createDefaultForm(bank);
    setForm(defaultForm);
    setShowImageTools(false);
    setShowTableBuilder(false);
    setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (!parsed.length) {
        setImportError(copy.importEmpty);
        return;
      }
      const normalized = parsed.map(normalizeCSVRow).filter((row) => row && row.question);
      if (!normalized.length) {
        setImportError(copy.importEmpty);
        return;
      }
      startImport(normalized);
    } catch (err) {
      console.error("import csv", err);
      setImportError(copy.importError);
    } finally {
      event.target.value = "";
    }
  };

  const validate = () => {
    const trimmedQuestion = form.question.trim();
    if (!trimmedQuestion) return "Question is required.";
    if (!form.subject) return "Subject is required.";

    if (bank.supportsUnitLesson && form.subject === "math") {
      const unitValue = form.unit ?? "";
      const unitIsBlank = typeof unitValue === "string" ? unitValue.trim() === "" : !unitValue;
      if (unitIsBlank) return "Unit is required.";
      const lessonValue = form.lesson ?? "";
      const lessonIsBlank = typeof lessonValue === "string" ? lessonValue.trim() === "" : !lessonValue;
      if (lessonIsBlank) return "Lesson is required.";
    }

    if (form.questionType === "mcq") {
      if (!form.answerA.trim() || !form.answerB.trim() || !form.answerC.trim() || !form.answerD.trim()) {
        return "All four answers are required for MCQ.";
      }
    } else {
      if (!form.fillAnswer.trim()) return "Correct answer is required.";
    }
    return "";
  };

  const buildFormFromRow = (row, targetBank = bank) => {
    const type = row.question_type === "fill" ? "fill" : "mcq";
    const subjectValue = targetBank.subjectLocked
      ? targetBank.defaultSubject
      : row.subject || targetBank.defaultSubject || SUBJECT_OPTIONS[0].value;
    const includeUnitLesson = targetBank.supportsUnitLesson && subjectValue === "math";
    return {
      questionType: type,
      question: row.question || "",
      answerA: row.answer_a || "",
      answerB: row.answer_b || "",
      answerC: row.answer_c || "",
      answerD: row.answer_d || "",
      fillAnswer: type === "fill" ? row.correct_answer || "" : "",
      correctAnswer: type === "mcq" ? row.correct_answer || "A" : "A",
      subject: subjectValue,
      unit: includeUnitLesson ? row.unit || "" : "",
      lesson: includeUnitLesson ? row.lesson || "" : "",
      hardness: row.hardness || "",
      skill: row.skill || "",
      imageUrl: row.image_url || "",
    };
  };

  const handleEdit = (row) => {
    if (isImporting) {
      handleImportCancel();
    }
    setEditingRow(row);
    setSuccessMessage("");
    setPreviewRow(null);
    const nextForm = buildFormFromRow(row, bank);
    setForm(nextForm);
    setShowImageTools(Boolean(nextForm.imageUrl));
    setShowTableBuilder(false);
    setTableBuilder(createInitialTableBuilder(nextForm.questionType));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreview = (row) => {
    setPreviewRow(row);
  };

  const closePreview = () => setPreviewRow(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    const problem = validate();
    if (problem) {
      alert(problem);
      return;
    }

    const assignmentType =
      (isImportingActive && currentImportRow?.assignment_type ? currentImportRow.assignment_type : null) ||
      editingRow?.assignment_type ||
      "quiz";
    const subjectValue = bank.subjectLocked ? bank.defaultSubject : form.subject || bank.defaultSubject;

    const payload = {
      question_type: form.questionType,
      question: form.question.trim(),
      assignment_type: assignmentType,
      subject: subjectValue,
      hardness: form.hardness || null,
      skill: form.skill.trim() || null,
      image_url: form.imageUrl.trim() || null,
    };

    if (bank.supportsUnitLesson && subjectValue === "math") {
      payload.unit = (form.unit || "").trim();
      payload.lesson = (form.lesson || "").trim();
    }

    if (form.questionType === "mcq") {
      Object.assign(payload, {
        answer_a: form.answerA.trim(),
        answer_b: form.answerB.trim(),
        answer_c: form.answerC.trim(),
        answer_d: form.answerD.trim(),
        correct_answer: form.correctAnswer,
      });
    } else {
      const fill = form.fillAnswer.trim();
      Object.assign(payload, {
        answer_a: fill,
        answer_b: "",
        answer_c: "",
        answer_d: "",
        correct_answer: fill,
      });
    }

    try {
      setSubmitting(true);
      let record;
      if (isEditing) {
        record = await updateAssignmentQuestion(editingRow.id, payload, { table: bank.table });
        setQuestions((prev) => prev.map((q) => (q.id === record.id ? record : q)));
        const defaultForm = createDefaultForm(bank);
        setForm(defaultForm);
        setEditingRow(null);
        setShowImageTools(false);
        setShowTableBuilder(false);
        setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
        setSuccessMessage(copy.updateSuccess);
      } else {
        record = await createAssignmentQuestion(payload, { table: bank.table });
        setQuestions((prev) => [record, ...prev]);
        if (isImportingActive) {
          const isLast = importIndex === importRows.length - 1;
          advanceImport(isLast ? copy.importFinished : copy.createSuccess);
        } else {
          const defaultForm = createDefaultForm(bank);
          setForm(defaultForm);
          setShowImageTools(false);
          setShowTableBuilder(false);
          setTableBuilder(createInitialTableBuilder(defaultForm.questionType));
          setSuccessMessage(copy.createSuccess);
        }
      }
    } catch (err) {
      const context = isEditing ? "update" : "create";
      console.error(`${context} assignment question`, err);
      alert(err?.message || "Failed to save question.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteAssignmentQuestion(row.id, { table: bank.table });
      setQuestions((prev) => prev.filter((q) => q.id !== row.id));
      if (editingRow?.id === row.id) {
        handleReset();
      }
      if (previewRow?.id === row.id) {
        closePreview();
      }
    } catch (err) {
      console.error("delete assignment question", err);
      alert(err?.message || "Failed to delete question.");
    }
  };

  return (
    <PageWrap>
      <HeaderBar
        lang={lang}
        title={copy.title}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
            <UserMenu lang={lang} onNavigate={onNavigate} />
          </div>
        }
      />

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.values(BANKS).map((cfg) => (
          <button
            key={cfg.id}
            type="button"
            onClick={() => setActiveBank(cfg.id)}
            style={bankTabStyle(cfg.id === bank.id)}
          >
            {copy[cfg.labelKey]}
          </button>
        ))}
      </div>

      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>{copy.subtitle}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Btn variant="secondary" onClick={() => importInputRef.current?.click()}>
            {copy.importLabel}
          </Btn>
          <span style={{ color: "#6b7280", fontSize: 13 }}>{copy.importHint}</span>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
        {importError && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c" }}>
            {importError}
          </div>
        )}
        {isImportingActive && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>
            {copy.importingStatus.replace("{current}", String(importIndex + 1)).replace("{total}", String(importRows.length))}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          {isEditing && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 12px", color: "#78350f" }}>
              {copy.editingNotice}
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>{copy.questionType}</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {QUESTION_TYPES.map((item) => (
                <label key={item.value} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="questionType"
                    value={item.value}
                    checked={form.questionType === item.value}
                    onChange={(e) => handleChange("questionType", e.target.value)}
                  />
                  {copy[item.labelKey]}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>{copy.subject}</label>
            {bank.subjectLocked ? (
              <div style={lockedFieldStyle}>{subjectLabel(form.subject, lang)}</div>
            ) : (
              <select
                value={form.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                style={selectStyle}
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label[lang] || opt.label.EN}
                  </option>
                ))}
              </select>
            )}
          </div>

          <GridInputs copy={copy} form={form} handleChange={handleChange} lang={lang} bank={bank} />

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>{copy.question}</label>
            <textarea
              value={form.question}
              onChange={(e) => handleChange("question", e.target.value)}
              rows={4}
              style={textareaStyle}
              required
            />
          </div>

          {form.questionType === "mcq" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 600 }}>{copy.answers}</div>
              {["A", "B", "C", "D"].map((label) => (
                <div key={label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ width: 20, fontWeight: 600 }}>{label}</span>
                  <input
                    type="text"
                    value={form[`answer${label}`]}
                    onChange={(e) => handleChange(`answer${label}`, e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              ))}
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 600 }}>{copy.correctAnswer}</label>
                <select
                  value={form.correctAnswer}
                  onChange={(e) => handleChange("correctAnswer", e.target.value)}
                  style={selectStyle}
                >
                  {["A", "B", "C", "D"].map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>{copy.fillAnswerLabel}</label>
              <input
                type="text"
                value={form.fillAnswer}
                onChange={(e) => handleChange("fillAnswer", e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {!showTableBuilder && (
              <button
                type="button"
                onClick={() => {
                  setShowTableBuilder(true);
                  setSuccessMessage("");
                }}
                style={secondaryButtonStyle}
              >
                {copy.addTable}
              </button>
            )}
            {!showImageTools && (
              <button
                type="button"
                onClick={() => {
                  setShowImageTools(true);
                  setSuccessMessage("");
                }}
                style={secondaryButtonStyle}
              >
                {copy.addImage}
              </button>
            )}
          </div>

          {showTableBuilder && (
            <TableBuilderSection
              copy={copy}
              builder={tableBuilder}
              targets={tableTargets}
              onDimensionChange={handleTableDimensionChange}
              onCellChange={handleTableCellChange}
              onSelectCell={handleSelectTableCell}
              onMergeRight={handleMergeRight}
              onMergeDown={handleMergeDown}
              onSplitCell={handleSplitCell}
              onToggleHeader={handleToggleTableHeader}
              onTargetChange={handleTableTargetChange}
              onClear={handleClearTableCells}
              onInsert={handleInsertTable}
              activeCell={tableBuilder.activeCell}
              previewHtml={tablePreviewHtml}
              canInsert={canInsertTable}
              onClose={() => setShowTableBuilder(false)}
            />
          )}

          {showImageTools ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>
                  {copy.imageLabel} <span style={{ color: "#9ca3af" }}>({copy.optional})</span>
                </span>
                <button type="button" style={inlineLinkButtonStyle} onClick={() => setShowImageTools(false)}>
                  {copy.hideImage}
                </button>
              </div>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
              <div
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                style={{
                  border: `2px dashed ${isImageDragOver ? "#2563eb" : "#d1d5db"}`,
                  borderRadius: 12,
                  padding: 16,
                  background: isImageDragOver ? "#eff6ff" : "#f9fafb",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                  display: "grid",
                  gap: 10,
                }}
              >
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", justifySelf: "flex-start" }}>
                  <input type="file" accept="image/png" style={{ display: "none" }} onChange={handleFileUpload} />
                  <span style={{ padding: "6px 12px", borderRadius: 6, background: "#e0f2fe", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 600 }}>
                    {uploading ? copy.imageUploading : copy.imageUpload}
                  </span>
                </label>
                <small style={{ color: "#6b7280" }}>{copy.uploadTip}</small>
              </div>
              {form.imageUrl && resolveImageUrl(form.imageUrl) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <img
                    src={resolveImageUrl(form.imageUrl)}
                    alt={copy.imageAlt}
                    style={{ maxWidth: 200, borderRadius: 12, border: "1px solid #d1d5db" }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ef4444", background: "#fee2e2", color: "#b91c1c", fontWeight: 600, cursor: "pointer" }}
                  >
                    {copy.removeImage || "Remove Image"}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={submitting}
              style={primaryButtonStyle(submitting)}
            >
              {submitting ? "..." : isImportingActive ? copy.importSubmit : isEditing ? copy.update : copy.create}
            </button>
            {isImportingActive ? (
              <>
                <button type="button" onClick={handleImportSkip} style={secondaryButtonStyle}>
                  {copy.skip}
                </button>
                <button type="button" onClick={handleImportCancel} style={secondaryButtonStyle}>
                  {copy.cancelImport}
                </button>
              </>
            ) : (
              <button type="button" onClick={handleReset} style={secondaryButtonStyle}>
                {isEditing ? copy.cancelEdit : copy.reset}
              </button>
            )}
          </div>
          {successMessage && <div style={{ color: "#047857", fontWeight: 600 }}>{successMessage}</div>}
        </form>
      </Card>

      {isImportingActive && currentImportRow && (
        <Card style={{ marginTop: 16, background: "#f8fafc" }}>
          <h3 style={{ marginTop: 0 }}>{copy.importPreviewTitle}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: "#111827" }}>
              <MathText value={currentImportRow.question} block />
            </div>
            {currentImportRow.question_type === "mcq" ? (
              <ol style={{ listStyle: "upper-alpha", paddingLeft: 20, margin: 0, display: "grid", gap: 6 }}>
                {[currentImportRow.answer_a, currentImportRow.answer_b, currentImportRow.answer_c, currentImportRow.answer_d].map((answer, idx) => (
                  <li key={idx} style={{ background: "#e0f2fe", borderRadius: 6, padding: "6px 10px" }}>
                    <MathText value={answer} />
                  </li>
                ))}
              </ol>
            ) : (
              <div style={{ background: "#e0f2fe", borderRadius: 6, padding: "6px 10px", color: "#0c4a6e" }}>
                {currentImportRow.correct_answer || "—"}
              </div>
            )}
            {currentImportRow.image_url && (
              <div>
                <img
                  src={resolveImageUrl(currentImportRow.image_url)}
                  alt=""
                  style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #bfdbfe" }}
                />
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#1e3a8a", fontSize: 13 }}>
              <span><strong>{copy.tableSubject}:</strong> {subjectLabel(currentImportRow.subject, lang)}</span>
              <span><strong>{copy.tableUnit}:</strong> {unitLabel(currentImportRow.subject, currentImportRow.unit, lang)}</span>
              <span><strong>{copy.tableLesson}:</strong> {lessonLabel(currentImportRow.subject, currentImportRow.unit, currentImportRow.lesson, lang)}</span>
              <span><strong>{copy.tableHardness}:</strong> {hardnessLabel(currentImportRow.hardness, lang)}</span>
              {currentImportRow.skill && (
                <span><strong>{copy.tableSkill}:</strong> {currentImportRow.skill}</span>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <strong>{copy.filters}</strong>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>{copy.filterQuestionType}</span>
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                style={selectStyle}
              >
                <option value="all">{copy.filterAll}</option>
                {QUESTION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {copy[opt.labelKey]}
                  </option>
                ))}
              </select>
            </label>
            <Btn variant="secondary" onClick={refreshQuestions}>
              {copy.refresh}
            </Btn>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : filteredQuestions.length === 0 ? (
          <p style={{ color: "#6b7280" }}>{copy.noResults}</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>{copy.tableQuestion}</th>
                  <th style={thStyle}>{copy.tableSubject}</th>
                  {bank.supportsUnitLesson && (
                    <>
                      <th style={thStyle}>{copy.tableUnit}</th>
                      <th style={thStyle}>{copy.tableLesson}</th>
                    </>
                  )}
                  <th style={thStyle}>{copy.tableType}</th>
                  <th style={thStyle}>{copy.tableHardness}</th>
                  <th style={thStyle}>{copy.tableSkill}</th>
                  <th style={thStyle}>{copy.tableImage}</th>
                  <th style={thStyle}>{copy.tableCreated}</th>
                  <th style={thStyle}>{copy.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((row) => (
                  <tr key={row.id} style={tbodyRowStyle}>
                    <td style={tdStyle}>{firstWords(row.question, 3)}</td>
                    <td style={tdStyle}>{subjectLabel(row.subject, lang)}</td>
                    {bank.supportsUnitLesson && (
                      <>
                        <td style={tdStyle}>{row.subject === "math" ? unitLabel(row.subject, row.unit, lang) : "—"}</td>
                        <td style={tdStyle}>{row.subject === "math" ? lessonLabel(row.subject, row.unit, row.lesson, lang) : "—"}</td>
                      </>
                    )}
                    <td style={tdStyle}>{row.question_type === "mcq" ? copy.mcqLabel : copy.fillLabel}</td>
                    <td style={tdStyle}>{hardnessLabel(row.hardness, lang)}</td>
                    <td style={tdStyle}>{row.skill || "—"}</td>
                    <td style={tdStyle}>
                      {row.image_url ? (() => {
                        const href = resolveImageUrl(row.image_url);
                        if (!href) return "—";
                        const isLocal = row.image_url.startsWith(LOCAL_IMAGE_PREFIX);
                        if (isLocal) {
                          return (
                            <button
                              type="button"
                              onClick={() => window.open(href, "_blank", "noopener")}
                              style={{ background: "none", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                            >
                              View
                            </button>
                          );
                        }
                        return (
                          <a href={href} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                            View
                          </a>
                        );
                      })() : (
                        "—"
                      )}
                    </td>
                    <td style={tdStyle}>{new Date(row.created_at).toLocaleString()}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handlePreview(row)}
                          style={actionButtonStyle}
                          aria-label={copy.preview}
                          title={copy.preview}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          style={actionButtonStyle}
                          aria-label={copy.edit}
                          title={copy.edit}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          style={dangerButtonStyle}
                          aria-label={copy.delete}
                          title={copy.delete}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {previewRow && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-labelledby="question-bank-preview-title" onClick={closePreview}>
          <div style={modalContentStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <h2 id="question-bank-preview-title" style={{ margin: 0 }}>{copy.previewTitle}</h2>
              <button type="button" onClick={closePreview} style={modalCloseButtonStyle}>
                {copy.close}
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ color: "#374151" }}>
                <MathText value={previewRow.question} block />
              </div>

              {previewRow.image_url && (
                <div>
                  <img
                    src={resolveImageUrl(previewRow.image_url)}
                    alt=""
                    style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              )}

              {previewRow.question_type === "mcq" ? (
                <ol style={{ listStyle: "upper-alpha", paddingLeft: 20, margin: 0, display: "grid", gap: 8 }}>
                  {[previewRow.answer_a, previewRow.answer_b, previewRow.answer_c, previewRow.answer_d].map((answer, index) => (
                    <li key={index} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                      <MathText value={answer} />
                    </li>
                  ))}
                </ol>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder={copy.fillLabel}
                    readOnly
                    style={{ ...inputStyle, cursor: "not-allowed", background: "#f3f4f6" }}
                    value=""
                  />
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#6b7280", fontSize: 14 }}>
                <span>
                  <strong>{copy.tableSubject}:</strong> {subjectLabel(previewRow.subject, lang)}
                </span>
                <span>
                  <strong>{copy.tableUnit}:</strong> {unitLabel(previewRow.subject, previewRow.unit, lang)}
                </span>
                <span>
                  <strong>{copy.tableLesson}:</strong> {lessonLabel(previewRow.subject, previewRow.unit, previewRow.lesson, lang)}
                </span>
                <span>
                  <strong>{copy.tableHardness}:</strong> {hardnessLabel(previewRow.hardness, lang)}
                </span>
                {previewRow.skill && (
                  <span>
                    <strong>{copy.tableSkill}:</strong> {previewRow.skill}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </PageWrap>
  );
}

function TableBuilderSection({
  copy,
  builder,
  targets,
  onDimensionChange,
  onCellChange,
  onSelectCell,
  onMergeRight,
  onMergeDown,
  onSplitCell,
  onToggleHeader,
  onTargetChange,
  onClear,
  onInsert,
  activeCell,
  previewHtml,
  canInsert,
  onClose = undefined,
}) {
  TableBuilderSection.propTypes = {
    copy: PropTypes.object.isRequired,
    builder: PropTypes.shape({
      rows: PropTypes.number.isRequired,
      cols: PropTypes.number.isRequired,
      includeHeader: PropTypes.bool.isRequired,
      target: PropTypes.string.isRequired,
      cells: PropTypes.arrayOf(
        PropTypes.arrayOf(
          PropTypes.shape({
            text: PropTypes.string.isRequired,
            rowspan: PropTypes.number.isRequired,
            colspan: PropTypes.number.isRequired,
            hidden: PropTypes.bool.isRequired,
            master: PropTypes.shape({
              row: PropTypes.number,
              col: PropTypes.number,
            }),
          })
        )
      ).isRequired,
    }).isRequired,
    targets: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.node.isRequired,
      })
    ).isRequired,
    onDimensionChange: PropTypes.func.isRequired,
    onCellChange: PropTypes.func.isRequired,
    onSelectCell: PropTypes.func.isRequired,
    onMergeRight: PropTypes.func.isRequired,
    onMergeDown: PropTypes.func.isRequired,
    onSplitCell: PropTypes.func.isRequired,
    onToggleHeader: PropTypes.func.isRequired,
    onTargetChange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onInsert: PropTypes.func.isRequired,
    activeCell: PropTypes.shape({
      row: PropTypes.number.isRequired,
      col: PropTypes.number.isRequired,
    }).isRequired,
    previewHtml: PropTypes.string.isRequired,
    canInsert: PropTypes.bool.isRequired,
    onClose: PropTypes.func,
  };

  const safeActive = activeCell || { row: 0, col: 0 };
  const selectedCell = builder.cells?.[safeActive.row]?.[safeActive.col];

  const mergeRightPossible = (() => {
    if (!selectedCell || selectedCell.hidden) return false;
    const targetCol = safeActive.col + selectedCell.colspan;
    if (targetCol >= builder.cols) return false;
    for (let r = safeActive.row; r < safeActive.row + selectedCell.rowspan; r += 1) {
      const neighbor = builder.cells[r]?.[targetCol];
      if (!neighbor || neighbor.hidden || neighbor.rowspan !== 1 || neighbor.colspan !== 1) {
        return false;
      }
    }
    return true;
  })();

  const mergeDownPossible = (() => {
    if (!selectedCell || selectedCell.hidden) return false;
    const targetRow = safeActive.row + selectedCell.rowspan;
    if (targetRow >= builder.rows) return false;
    for (let c = safeActive.col; c < safeActive.col + selectedCell.colspan; c += 1) {
      const neighbor = builder.cells[targetRow]?.[c];
      if (!neighbor || neighbor.hidden || neighbor.rowspan !== 1 || neighbor.colspan !== 1) {
        return false;
      }
    }
    return true;
  })();

  const splitPossible = Boolean(selectedCell && !selectedCell.hidden && (selectedCell.rowspan > 1 || selectedCell.colspan > 1));
  const gridColumns = builder.cols || (builder.cells[0]?.length ?? 1);
  const selectedLabel = copy.tableBuilderSelectedCell(safeActive.row, safeActive.col);

  const handleCellClick = (rowIndex, colIndex) => {
    const cell = builder.cells[rowIndex]?.[colIndex];
    if (!cell || cell.hidden) return;
    onSelectCell(rowIndex, colIndex);
  };

  const buttonStyle = (enabled) =>
    enabled
      ? tableBuilderActionButtonStyle
      : { ...tableBuilderActionButtonStyle, ...tableBuilderActionButtonDisabledStyle };

  return (
    <div style={tableBuilderContainerStyle}>
      <div style={tableBuilderHeaderStyle}>
        <div style={{ fontWeight: 600 }}>{copy.tableBuilderTitle}</div>
        <div style={tableBuilderHeaderActionsStyle}>
          <button type="button" onClick={onClear} style={tableBuilderClearButtonStyle}>
            {copy.tableBuilderClear}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={tableBuilderHideButtonStyle}>
              {copy.tableBuilderHide}
            </button>
          )}
        </div>
      </div>
      <p style={tableBuilderHintStyle}>{copy.tableBuilderInstructions}</p>

      <div style={tableBuilderControlsRowStyle}>
        <label style={tableBuilderControlStyle}>
          <span style={{ fontWeight: 600 }}>{copy.tableBuilderRows}</span>
          <input
            type="number"
            min={1}
            max={MAX_TABLE_ROWS}
            value={builder.rows}
            onChange={(e) => onDimensionChange("rows", e.target.value)}
            style={tableBuilderNumberInputStyle}
          />
        </label>
        <label style={tableBuilderControlStyle}>
          <span style={{ fontWeight: 600 }}>{copy.tableBuilderCols}</span>
          <input
            type="number"
            min={1}
            max={MAX_TABLE_COLS}
            value={builder.cols}
            onChange={(e) => onDimensionChange("cols", e.target.value)}
            style={tableBuilderNumberInputStyle}
          />
        </label>
        <label style={tableBuilderToggleStyle}>
          <input
            type="checkbox"
            checked={builder.includeHeader}
            onChange={(e) => onToggleHeader(e.target.checked)}
          />
          <span>{copy.tableBuilderIncludeHeader}</span>
        </label>
        <label style={tableBuilderTargetStyle}>
          <span style={{ fontWeight: 600 }}>{copy.tableBuilderTarget}</span>
          <select value={builder.target} onChange={(e) => onTargetChange(e.target.value)} style={selectStyle}>
            {targets.map((target) => (
              <option key={target.value} value={target.value}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{copy.tableBuilderCellsLabel}</span>
        <div style={tableBuilderGridStyle(gridColumns)}>
          {builder.cells.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const isSelected = activeCell.row === rowIndex && activeCell.col === colIndex;
              const isHidden = cell.hidden;
              return (
                <div
                  key={key}
                  style={tableBuilderCellWrapperStyle(isSelected, isHidden)}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {isHidden ? (
                    <span style={tableBuilderMergedBadgeStyle}>{copy.tableBuilderMergedCell}</span>
                  ) : (
                    <>
                      <div style={tableBuilderCellIndexStyle}>{`R${rowIndex + 1}C${colIndex + 1}`}</div>
                      <input
                        type="text"
                        value={cell.text}
                        onFocus={() => onSelectCell(rowIndex, colIndex)}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCell(rowIndex, colIndex);
                        }}
                        onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                        placeholder={copy.tableBuilderCellPlaceholder}
                        style={tableBuilderCellInputStyle}
                      />
                      {(cell.rowspan > 1 || cell.colspan > 1) && (
                        <div style={tableBuilderSpanBadgeStyle}>
                          {cell.rowspan > 1 && <span>{`rowspan ×${cell.rowspan}`}</span>}
                          {cell.colspan > 1 && <span>{`colspan ×${cell.colspan}`}</span>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={tableBuilderSelectionRowStyle}>
        <div style={{ fontWeight: 600 }}>{selectedLabel}</div>
        <div style={tableBuilderSelectionButtonsStyle}>
          <button
            type="button"
            style={buttonStyle(mergeRightPossible)}
            onClick={onMergeRight}
            disabled={!mergeRightPossible}
          >
            {copy.tableBuilderMergeRight}
          </button>
          <button
            type="button"
            style={buttonStyle(mergeDownPossible)}
            onClick={onMergeDown}
            disabled={!mergeDownPossible}
          >
            {copy.tableBuilderMergeDown}
          </button>
          <button
            type="button"
            style={buttonStyle(splitPossible)}
            onClick={onSplitCell}
            disabled={!splitPossible}
          >
            {copy.tableBuilderSplitCell}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{copy.tableBuilderPreview}</span>
        {canInsert ? (
          <div style={tableBuilderPreviewStyle} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
          <div style={tableBuilderPreviewEmptyStyle}>{copy.tableBuilderPreviewEmpty}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn type="button" onClick={onInsert} disabled={!canInsert}>
          {copy.tableBuilderInsert}
        </Btn>
      </div>
    </div>
  );
}

function GridInputs({ copy, form, handleChange, lang, bank }) {
  GridInputs.propTypes = {
    copy: PropTypes.object.isRequired,
    form: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    bank: PropTypes.object.isRequired,
  };

  const showMathSelectors = bank.supportsUnitLesson && form.subject === "math";

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {showMathSelectors && (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{copy.unit}</span>
          <select
            value={form.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
            style={selectStyle}
          >
            {MATH_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[lang] || opt.label.EN}
              </option>
            ))}
          </select>
        </label>
      )}

      {showMathSelectors && (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{copy.lesson}</span>
          <select
            value={form.lesson}
            onChange={(e) => handleChange("lesson", e.target.value)}
            style={selectStyle}
          >
            {(MATH_LESSON_OPTIONS[form.unit] || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[lang] || opt.label.EN}
              </option>
            ))}
          </select>
        </label>
      )}
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{copy.hardness}</span>
        <select
          value={form.hardness}
          onChange={(e) => handleChange("hardness", e.target.value)}
          style={selectStyle}
        >
          <option value="">{copy.optional}</option>
          {HARDNESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label[lang] || opt.label.EN}
            </option>
          ))}
        </select>
      </label>
      <LabeledInput
        label={`${copy.skill} (${copy.optional})`}
        value={form.skill}
        onChange={(e) => handleChange("skill", e.target.value)}
      />
    </div>
  );
}

function LabeledInput({ label, value, onChange, required = false }) {
  LabeledInput.propTypes = {
    label: PropTypes.node.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    required: PropTypes.bool,
  };

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input type="text" value={value} onChange={onChange} style={inputStyle} required={required} />
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 120,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
};

const tableBuilderContainerStyle = {
  marginTop: 4,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "#f9fafb",
  display: "grid",
  gap: 12,
};

const tableBuilderHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const tableBuilderHeaderActionsStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const tableBuilderHintStyle = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
};

const tableBuilderControlsRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const tableBuilderControlStyle = {
  display: "grid",
  gap: 6,
  minWidth: 120,
};

const tableBuilderNumberInputStyle = {
  ...inputStyle,
  maxWidth: 120,
};

const tableBuilderToggleStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  fontSize: 14,
};

const tableBuilderTargetStyle = {
  display: "grid",
  gap: 6,
  minWidth: 160,
};

const tableBuilderGridStyle = (cols) => ({
  display: "grid",
  gap: 8,
  gridTemplateColumns: `repeat(${Math.max(1, Math.min(cols, MAX_TABLE_COLS))}, minmax(140px, 1fr))`,
});

const tableBuilderCellWrapperStyle = (selected, hidden) => ({
  position: "relative",
  borderRadius: 10,
  border: `1px solid ${hidden ? "#e5e7eb" : selected ? "#2563eb" : "#d1d5db"}`,
  background: hidden ? "#f9fafb" : "#ffffff",
  minHeight: 100,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  cursor: hidden ? "not-allowed" : "pointer",
  boxShadow: selected ? "0 0 0 2px rgba(37, 99, 235, 0.15)" : "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
});

const tableBuilderMergedBadgeStyle = {
  fontSize: 13,
  color: "#6b7280",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
};

const tableBuilderCellIndexStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
};

const tableBuilderCellInputStyle = {
  ...inputStyle,
  minWidth: 0,
  height: 40,
};

const tableBuilderSpanBadgeStyle = {
  display: "flex",
  gap: 10,
  fontSize: 12,
  color: "#2563eb",
  fontWeight: 600,
};

const tableBuilderPreviewStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: 12,
  background: "#ffffff",
  overflowX: "auto",
};

const tableBuilderPreviewEmptyStyle = {
  ...tableBuilderPreviewStyle,
  color: "#6b7280",
  fontStyle: "italic",
};

const tableBuilderClearButtonStyle = {
  background: "none",
  border: "none",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 600,
  padding: 0,
};

const tableBuilderHideButtonStyle = {
  background: "none",
  border: "none",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
  padding: 0,
};

const tableBuilderSelectionRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  padding: "8px 0",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
};

const tableBuilderSelectionButtonsStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const tableBuilderActionButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  padding: "6px 12px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease, border 0.15s ease",
};

const tableBuilderActionButtonDisabledStyle = {
  opacity: 0.55,
  cursor: "not-allowed",
  borderColor: "#e5e7eb",
  color: "#9ca3af",
  background: "#f3f4f6",
};

const inlineLinkButtonStyle = {
  background: "none",
  border: "none",
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 600,
  padding: 0,
};

const lockedFieldStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  fontWeight: 600,
  color: "#111827",
};

const primaryButtonStyle = (disabled) => ({
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#9ca3af" : "linear-gradient(135deg, #2563eb, #7c3aed)",
  color: "#ffffff",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "transform 0.15s ease",
});

const secondaryButtonStyle = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ef4444",
  background: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
};

const tableHeaderRowStyle = {
  background: "#f3f4f6",
  textAlign: "left",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tbodyRowStyle = {
  borderBottom: "1px solid #f3f4f6",
};

const tdStyle = {
  padding: "10px 12px",
  fontSize: 13,
  verticalAlign: "top",
};

const actionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#1f2937",
  cursor: "pointer",
};

const bankTabStyle = (active) => ({
  padding: "6px 14px",
  borderRadius: 999,
  border: active ? "1px solid #2563eb" : "1px solid #d1d5db",
  background: active ? "#2563eb" : "#ffffff",
  color: active ? "#ffffff" : "#111827",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: active ? "0 6px 12px rgba(37, 99, 235, 0.25)" : "none",
  transition: "background 0.2s ease, color 0.2s ease, border 0.2s ease",
});

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 1000,
};

const modalContentStyle = {
  background: "#ffffff",
  borderRadius: 12,
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 24,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
  display: "grid",
  gap: 16,
};

const modalCloseButtonStyle = {
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  color: "#111827",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
};

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M1.5 12s3.5-7.5 10.5-7.5S22.5 12 22.5 12 19 19.5 12 19.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" />
      <path d="m14.06 6.19 2.12-2.12a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12l-2.12 2.12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

const MATH_HINT_REGEX = /\\[a-zA-Z]+|\\frac|\\sqrt|\\sum|\\int|\\left|\\right|\\times|\\div|\\pm|\\pi|\\alpha|\\beta|\\gamma|\^|_|=|\\\(|\\\)|\\\[|\\\]|\$\$/;

const loadLocalImages = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_IMAGE_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("loadLocalImages", err);
    return {};
  }
};

const persistLocalImages = (map) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_IMAGE_STORE_KEY, JSON.stringify(map || {}));
  } catch (err) {
    console.warn("persistLocalImages", err);
  }
};

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith(LOCAL_IMAGE_PREFIX)) {
    const key = value.slice(LOCAL_IMAGE_PREFIX.length);
    const images = loadLocalImages();
    return images[key] || "";
  }
  return value;
};

const TABLE_TARGET_VALUES = {
  mcq: ["question", "answerA", "answerB", "answerC", "answerD"],
  fill: ["question", "fillAnswer"],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const HTML_TABLE_STYLE = "border-collapse:collapse;width:100%;border:1px solid #d1d5db;background:#ffffff";
const HTML_HEADER_CELL_STYLE = "border:1px solid #d1d5db;padding:8px;background:#f3f4f6;font-weight:600;text-align:left";
const HTML_BODY_CELL_STYLE = "border:1px solid #d1d5db;padding:8px;text-align:left;background:#ffffff";

const createCell = () => ({
  text: "",
  rowspan: 1,
  colspan: 1,
  hidden: false,
  master: null,
});

function cloneCell(cell) {
  return {
    text: cell.text,
    rowspan: cell.rowspan,
    colspan: cell.colspan,
    hidden: cell.hidden,
    master: cell.master ? { row: cell.master.row, col: cell.master.col } : null,
  };
}

function cloneCells(cells) {
  return cells.map((row) => row.map((cell) => cloneCell(cell)));
}

function createEmptyTableCells(rows, cols) {
  const safeRows = clamp(rows, 1, MAX_TABLE_ROWS);
  const safeCols = clamp(cols, 1, MAX_TABLE_COLS);
  return Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => createCell()));
}

function createInitialTableBuilder(questionType = "mcq") {
  const targetValues = getTableTargetValues(questionType);
  return {
    rows: DEFAULT_TABLE_ROWS,
    cols: DEFAULT_TABLE_COLS,
    includeHeader: false,
    target: targetValues[0] || "question",
    cells: createEmptyTableCells(DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLS),
    activeCell: { row: 0, col: 0 },
  };
}

function resizeTableCells(prevCells, rows, cols) {
  const next = createEmptyTableCells(rows, cols);
  if (!Array.isArray(prevCells)) return next;

  const maxRows = Math.min(rows, prevCells.length);
  const maxCols = Math.min(cols, prevCells[0]?.length || 0);
  for (let r = 0; r < maxRows; r += 1) {
    for (let c = 0; c < maxCols; c += 1) {
      const cell = prevCells[r][c];
      if (!cell || cell.hidden) continue;
      next[r][c].text = cell.text;
    }
  }
  return next;
}

function hasTableContent(cells) {
  if (!Array.isArray(cells)) return false;
  return cells.some((row) =>
    Array.isArray(row) &&
    row.some((cell) => cell && !cell.hidden && String(cell.text || "").trim().length > 0)
  );
}

function buildTableHtml(cells, includeHeader) {
  if (!Array.isArray(cells) || cells.length === 0) return "";
  const rowsHtml = cells
    .map((row, rowIndex) => {
      const safeRow = Array.isArray(row) ? row : [];
      const cellHtml = safeRow
        .map((cell, colIndex) => {
          if (!cell || cell.hidden) return "";
          const tag = includeHeader && rowIndex === 0 ? "th" : "td";
          const attrs = [];
          if (cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`);
          if (cell.colspan > 1) attrs.push(`colspan="${cell.colspan}"`);
          const style = includeHeader && rowIndex === 0 ? HTML_HEADER_CELL_STYLE : HTML_BODY_CELL_STYLE;
          attrs.push(`style="${style}"`);
          const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
          return `<${tag}${attrText}>${tableHtmlEscape(cell.text)}</${tag}>`;
        })
        .join("");
      return `<tr>${cellHtml}</tr>`;
    })
    .join("");
  if (!rowsHtml) return "";
  return `<table style="${HTML_TABLE_STYLE}">${rowsHtml}</table>`;
}

function tableHtmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mergeTableContent(existing, html) {
  const current = String(existing || "").trim();
  const next = String(html || "").trim();
  if (!current) return next;
  if (!next) return current;
  return `${current}\n\n${next}`;
}

function getTableTargetValues(questionType) {
  return TABLE_TARGET_VALUES[questionType] || TABLE_TARGET_VALUES.mcq;
}

function tableTargetLabel(copy, value) {
  switch (value) {
    case "question":
      return copy.question;
    case "answerA":
      return copy.answer("A");
    case "answerB":
      return copy.answer("B");
    case "answerC":
      return copy.answer("C");
    case "answerD":
      return copy.answer("D");
    case "fillAnswer":
      return copy.fillAnswerLabel;
    default:
      return value;
  }
}

const ALLOWED_TABLE_TAGS = new Set(["TABLE", "TBODY", "THEAD", "TFOOT", "TR", "TD", "TH", "COLGROUP", "COL", "SPAN", "P", "BR", "B", "STRONG", "I", "EM", "U", "SMALL"]);
const ALLOWED_TABLE_ATTRS = new Set(["rowspan", "colspan", "align", "style"]);

const sanitizeTableHtml = (html) => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (!ALLOWED_TABLE_TAGS.has(el.tagName)) {
        toRemove.push(el);
        continue;
      }
      Array.from(el.attributes).forEach((attr) => {
        if (!ALLOWED_TABLE_ATTRS.has(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
      });
    }
    toRemove.forEach((node) => {
      const text = node.textContent || "";
      node.replaceWith(doc.createTextNode(text));
    });
    doc.querySelectorAll("table").forEach((table) => {
      table.setAttribute("style", HTML_TABLE_STYLE);
      table.querySelectorAll("th").forEach((th) => {
        th.setAttribute("style", HTML_HEADER_CELL_STYLE);
      });
      table.querySelectorAll("td").forEach((td) => {
        td.setAttribute("style", HTML_BODY_CELL_STYLE);
      });
    });
    return doc.body.innerHTML;
  } catch (err) {
    console.warn("sanitizeTableHtml", err);
    return html;
  }
};

const renderMathSegments = (text, block) => {
  const inlineRegex = /\\\[(.+?)\\\]|\\\((.+?)\\\)|\$\$(.+?)\$\$/gs;
  const segments = [];
  let match;
  let lastIndex = 0;
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] != null) {
      segments.push({ type: "block", value: match[1] });
    } else if (match[2] != null) {
      segments.push({ type: "inline", value: match[2] });
    } else if (match[3] != null) {
      segments.push({ type: "block", value: match[3] });
    }
    lastIndex = inlineRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (segments.some((segment) => segment.type !== "text")) {
    return segments.map((segment, idx) => {
      if (segment.type === "text") {
        return <React.Fragment key={`text-${idx}`}>{segment.value}</React.Fragment>;
      }
      const Component = segment.type === "block" ? BlockMath : InlineMath;
      return (
        <Component
          key={`math-${idx}`}
          math={segment.value}
          errorColor="#dc2626"
          renderError={() => <span>{segment.value}</span>}
        />
      );
    });
  }

  if (!MATH_HINT_REGEX.test(text)) {
    return [<React.Fragment key="text">{text}</React.Fragment>];
  }

  const Component = block ? BlockMath : InlineMath;
  return [
    <Component
      key="math"
      math={text}
      errorColor="#dc2626"
      renderError={() => <span>{text}</span>}
    />,
  ];
};

function MathText({ value, block = false }) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return <span>—</span>;

  const decoded = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const normalized = decoded.replace(/\\\\/g, "\\").replace(/\r\n/g, "\n");

  const componentMatch = normalized.match(/<\s*(BlockMath|InlineMath)[^>]*math\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/i);
  if (componentMatch) {
    const [, tagName, mathContent] = componentMatch;
    const useBlock = block || tagName.toLowerCase() === "blockmath";
    const Component = useBlock ? BlockMath : InlineMath;
    return (
      <Component
        math={mathContent}
        errorColor="#dc2626"
        renderError={() => <span>{normalized}</span>}
      />
    );
  }

  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  if (tableRegex.test(normalized)) {
    const nodes = [];
    let lastIndex = 0;
    normalized.replace(tableRegex, (match, offset) => {
      if (offset > lastIndex) {
        const textPart = normalized.slice(lastIndex, offset);
        nodes.push(...renderMathSegments(textPart, block));
      }
      const sanitized = sanitizeTableHtml(match);
      nodes.push(
        <div
          key={`table-${nodes.length}`}
          style={{ overflowX: "auto" }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
      lastIndex = offset + match.length;
      return match;
    });
    if (lastIndex < normalized.length) {
      nodes.push(...renderMathSegments(normalized.slice(lastIndex), block));
    }
    return <>{nodes}</>;
  }

  return <>{renderMathSegments(normalized, block)}</>;
}

MathText.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  block: PropTypes.bool,
};

function firstWords(text, count = 3) {
  if (!text) return "—";
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return words.join(" ");
  return `${words.slice(0, count).join(" ")}...`;
}

function subjectLabel(value, lang) {
  const option = SUBJECT_OPTIONS.find((opt) => opt.value === value);
  if (!option) return value || "—";
  return option.label[lang] || option.label.EN;
}

function unitLabel(subject, value, lang) {
  if (subject === "math") {
    const option = MATH_UNIT_OPTIONS.find((opt) => opt.value === value);
    if (option) return option.label[lang] || option.label.EN;
  }
  return value || "—";
}

function lessonLabel(subject, unit, value, lang) {
  if (subject === "math") {
    const lessons = MATH_LESSON_OPTIONS[unit] || [];
    const option = lessons.find((opt) => opt.value === value);
    if (option) return option.label[lang] || option.label.EN;
  }
  return value || "—";
}

function hardnessLabel(value, lang) {
  const option = HARDNESS_OPTIONS.find((opt) => opt.value === value);
  if (!option) return value || "—";
  return option.label[lang] || option.label.EN;
}

function parseCSV(text) {
  if (!text) return [];
  const rows = [];
  const sanitized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let current = "";
  let insideQuotes = false;
  let row = [];

  const pushValue = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];
    if (char === '"') {
      const nextChar = sanitized[i + 1];
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      pushValue();
    } else if (char === "\n" && !insideQuotes) {
      pushValue();
      pushRow();
    } else {
      current += char;
    }
  }

  pushValue();
  pushRow();

  if (!rows.length) return [];
  const header = rows.shift()?.map((cell) => (cell || "").trim().toLowerCase()) || [];
  if (header.length === 0) return [];
  if (header[0] && header[0].startsWith("\ufeff")) {
    header[0] = header[0].replace("\ufeff", "");
  }

  return rows
    .filter((cells) => cells && cells.some((cell) => (cell || "").trim().length > 0))
    .map((cells) => {
      const entry = {};
      header.forEach((key, index) => {
        if (!key) return;
        entry[key] = (cells[index] ?? "").trim();
      });
      return entry;
    });
}

function normalizeCSVRow(record = {}) {
  const source = {};
  Object.keys(record).forEach((key) => {
    if (!key) return;
    const value = record[key];
    const normalized = key.trim().toLowerCase();
    if (!normalized) return;
    const variants = [
      normalized,
      normalized.replace(/\s+/g, "_"),
      normalized.replace(/_/g, " "),
      normalized.replace(/\s+/g, ""),
    ];
    variants.forEach((variant) => {
      if (!(variant in source)) {
        source[variant] = value;
      }
    });
  });

  const get = (...keys) => {
    for (const key of keys) {
      const normalizedKey = key.trim().toLowerCase();
      const value = source[normalizedKey];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const question = get("question", "prompt");
  if (!question) return null;

  const typeValue = get("question_type", "type");
  const question_type = typeValue.toLowerCase().startsWith("f") ? "fill" : "mcq";

  const answer_a = get("answer_a", "answer a", "a");
  const answer_b = get("answer_b", "answer b", "b");
  const answer_c = get("answer_c", "answer c", "c");
  const answer_d = get("answer_d", "answer d", "d");
  const correctRaw = get("correct_answer", "correct answer", "correct", "correctanswer");
  const fillRaw = get("fill_answer", "fillanswer", "answer", "response");

  let correct_answer;
  if (question_type === "fill") {
    correct_answer = fillRaw || correctRaw || "";
  } else {
    const letter = (correctRaw || "A").toUpperCase();
    correct_answer = ["A", "B", "C", "D"].includes(letter) ? letter : "A";
  }

  const rawSubject = get("subject");
  const subject = normalizeSubjectValue(rawSubject);

  return {
    question,
    question_type,
    answer_a,
    answer_b,
    answer_c,
    answer_d,
    correct_answer,
    subject,
    unit: get("unit"),
    lesson: get("lesson"),
    hardness: get("hardness", "difficulty"),
    skill: get("skill"),
    image_url: get("image_url", "image"),
    assignment_type: get("assignment_type") || "quiz",
  };
}



