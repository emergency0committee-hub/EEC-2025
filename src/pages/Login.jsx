import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import { supabase } from "../lib/supabase.js";
import logoPng from "../assets/logo.png";
import studentRoleSvg from "../assets/role-student.svg";
import educatorRoleSvg from "../assets/role-educator.svg";
import ModalPortal from "../components/ModalPortal.jsx";

const ROLE_OPTIONS = [
  {
    value: "student",
    label: "Student",
    description: "Access practice tests, class materials, and track your results.",
  },
  {
    value: "educator",
    label: "Educator",
    description: "Create classes, assign quizzes, and review student performance.",
  },
];


const SIGNUP_GRADE_OPTIONS = [
  { value: "", label: "Select grade" },
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_MB = 3;
const AVATAR_PREVIEW_SIZE = 88;
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_EDITOR_SIZE = 240;
const AVATAR_EMPTY_OFFSET_RATIO = 0.5;

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));
const hasNonEnglishChars = (value) => /[^\x20-\x7E]/.test(value);
const isEnglishInput = (value) => !hasNonEnglishChars(value);
const getCoverMetrics = (sourceWidth, sourceHeight, targetSize) => {
  const scale = Math.max(targetSize / sourceWidth, targetSize / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const maxOffsetX = Math.max(0, (width - targetSize) / 2);
  const maxOffsetY = Math.max(0, (height - targetSize) / 2);
  return { width, height, maxOffsetX, maxOffsetY };
};

const LOGIN_COPY = {
    isRTL: false,
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    signInSubtitle: "Enter your credentials to continue.",
    signUpSubtitle: "Create an account to access results.",
    stepLabel: "Step {current} of {total}",
    stepProfile: "Profile",
    stepSchool: "School",
    stepAccount: "Account",
    nextStep: "Next",
    backStep: "Back",
    roleSelectHeading: "Choose an account type",
    roleSelectBody: "Tell us if you're signing up as a student or an educator.",
    backToSignIn: "Back to sign in",
    signingUpAsLabel: "Signing up as",
    changeRole: "Change role",
    studentRole: "Student",
    educatorRole: "Educator",
    emailOrUsername: "Email or Username",
    emailOrUsernamePlaceholder: "Enter your email or username",
    schoolLabel: "School",
    schoolPlaceholder: "Your school",
    classLabel: "Class",
    classPlaceholder: "e.g., Grade 11",
    certificationLabel: "University Certification",
    certificationPlaceholder: "e.g., M.Ed., Teaching License #12345",
    usernameLabel: "Username",
    usernamePlaceholder: "Auto-generated",
    phoneLabel: "Phone",
    phonePlaceholder: "e.g., 555 123 4567",
    dobLabel: "Date of Birth",
    dobPlaceholder: "YYYY-MM-DD",
    dobRequired: "Date of birth is required",
    dobInvalid: "Date of birth must be in the past",
    profilePhotoLabel: "Profile Photo",
    profilePhotoHelper: "Upload a clear photo. Max {max}MB.",
    profilePhotoRequired: "Profile photo is required",
    profilePhotoInvalid: "Please choose an image file",
    profilePhotoTooLarge: "Image must be {max}MB or smaller",
    loginIdRequired: "Email or username is required",
    loginIdInvalid: "Please enter a valid email address or username",
    usernameRequired: "Username is required",
    usernameInvalid: "Usernames must be 3-30 characters (letters, digits, _ - .)",
    accountTypeRequired: "Please choose Student or Educator",
    schoolRequired: "School is required",
    classRequired: "Class is required",
    certificationRequired: "Certification is required",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Please enter a valid phone number",
    englishOnly: "Please use English letters, numbers, and symbols only",
    firstName: "First Name",
    enterFirstName: "e.g., Amina",
    lastName: "Last Name",
    enterLastName: "e.g., Khalil",
    fullName: "Full Name",
    enterFullName: "e.g., Amina Khalil",
    email: "Email",
    enterEmail: "e.g., name@example.com",
    password: "Password",
    enterPassword: "Enter your password",
    confirmPassword: "Confirm Password",
    confirmYourPassword: "Re-enter your password",
    signIn: "Sign In",
    signUp: "Sign Up",
    signingIn: "Signing in...",
    signingUp: "Signing up...",
    backToHome: "Back to Home",
    alreadyHaveAccount: "Already have an account? Sign in",
    dontHaveAccount: "Don't have an account? Sign up",
    emailRequired: "Email is required",
    emailInvalid: "Please enter a valid email",
    emailInUse: "Email is already in use",
    passwordRequired: "Password is required",
    passwordTooShort: "Password must be at least 6 characters",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    nameRequired: "Full name is required",
    confirmPasswordRequired: "Please confirm your password",
    passwordsDontMatch: "Passwords do not match",
    showPassword: "Show password",
    hidePassword: "Hide password",
    showConfirmPassword: "Show confirmation password",
    hideConfirmPassword: "Hide confirmation password",
    confirmEmailNotice: "Check your email to confirm your account, then sign in.",
  };


function EyeIcon({ size = 18, stroke = "#4b5563" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.458 12C3.732 7.943 7.522 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.542-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 18, stroke = "#4b5563" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
      <path d="M7.11 7.11C4.88 8.57 3.34 10.64 2.46 13c1.73 4.5 6 7 9.54 7 1.52 0 3.02-.36 4.38-1.03" />
      <path d="M14.53 5.47C13.72 5.17 12.87 5 12 5 8.46 5 4.19 7.5 2.46 12a12.2 12.2 0 0 0 2.29 3.62" />
      <path d="M17.94 6.06A11.9 11.9 0 0 1 21.54 12a12.16 12.16 0 0 1-2.53 3.66" />
    </svg>
  );
}

function CalendarIcon({ size = 18, stroke = "#64748b" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

export default function Login({ onNavigate }) {
  Login.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };
  const copy = LOGIN_COPY;
  const roleOptions = ROLE_OPTIONS;
  const isRTL = copy.isRTL;
  const photoHelper = (copy.profilePhotoHelper || "").replace("{max}", MAX_AVATAR_MB);
  const avatarInputId = "signup-avatar-upload";

  const [isSignUp, setIsSignUp] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [pendingRole, setPendingRole] = useState("");
  const [formData, setFormData] = useState({
    loginId: "",      // email or username (for sign-in)
    email: "",        // email (for sign-up)
    username: "",     // username (for sign-up)
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",        // phone (for sign-up, stored in auth metadata)
    school: "",
    className: "",
    certification: "",
    accountType: "",
  });
  const [dobOpen, setDobOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState({ year: "", month: "", day: "" });
  const [schoolNames, setSchoolNames] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const avatarInputRef = useRef(null);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarNatural, setAvatarNatural] = useState(null);
  const dragStartRef = useRef(null);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const avatarMetrics = useMemo(() => {
    if (!avatarNatural?.width || !avatarNatural?.height) return null;
    return getCoverMetrics(avatarNatural.width, avatarNatural.height, AVATAR_PREVIEW_SIZE);
  }, [avatarNatural]);
  const avatarEditorMetrics = useMemo(() => {
    if (!avatarNatural?.width || !avatarNatural?.height) return null;
    return getCoverMetrics(avatarNatural.width, avatarNatural.height, AVATAR_EDITOR_SIZE);
  }, [avatarNatural]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = currentYear; year >= 1900; year -= 1) {
      const value = String(year);
      years.push({ value, label: value });
    }
    return years;
  }, [currentYear]);
  const monthOptions = useMemo(
    () => ([
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ]),
    []
  );
  const dayOptions = useMemo(() => {
    const year = Number(dobDraft.year);
    const month = Number(dobDraft.month);
    const maxDay = year && month ? new Date(year, month, 0).getDate() : 31;
    return Array.from({ length: maxDay }, (_, idx) => {
      const value = String(idx + 1).padStart(2, "0");
      return { value, label: String(idx + 1) };
    });
  }, [dobDraft.year, dobDraft.month]);

  const activeRoleLabel =
    formData.accountType === "educator"
      ? copy.educatorRole
      : formData.accountType === "student"
        ? copy.studentRole
        : "";
  const fieldStyle = isRTL ? { direction: "rtl", textAlign: "right" } : undefined;
  const selectBaseStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    background: "#ffffff",
  };
  const dateInputStyle = {
    background: "rgba(255, 255, 255, 0.9)",
    color: "#0f172a",
    fontVariantNumeric: "tabular-nums",
  };
  const dobDropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
    backdropFilter: "blur(10px)",
    zIndex: 30,
  };
  const dobGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
  };
  const dobSelectStyle = {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.45)",
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  };
  const errorStyle = {
    color: "#dc2626",
    fontSize: 14,
    margin: "4px 0 0",
    textAlign: isRTL ? "right" : "left",
  };
  const submitErrorStyle = { ...errorStyle, margin: "8px 0 0" };
  const accountTypeErrorStyle = { ...errorStyle, margin: "0 0 12px" };

  const canUseCredentials =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    navigator.credentials &&
    typeof navigator.credentials.get === "function" &&
    typeof navigator.credentials.store === "function";
  const needsRoleSelection = isSignUp && !formData.accountType;
  const totalSteps = 3;
  const stepLabels = [copy.stepProfile, copy.stepSchool, copy.stepAccount];
  const stepLabelText = (copy.stepLabel || "")
    .replace("{current}", String(signupStep + 1))
    .replace("{total}", String(totalSteps));
  const currentStepLabel = stepLabels[signupStep] || "";
  const isFinalStep = signupStep >= totalSteps - 1;
  const schoolOptions = useMemo(() => {
    const placeholderLabel = copy.schoolPlaceholder || "Select School";
    const uniqueNames = new Map();
    for (const name of schoolNames) {
      const trimmed = (name || "").trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!uniqueNames.has(key)) uniqueNames.set(key, trimmed);
    }
    const sortedNames = Array.from(uniqueNames.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    return [{ value: "", label: placeholderLabel }, ...sortedNames.map((name) => ({ value: name, label: name }))];
  }, [schoolNames, copy.schoolPlaceholder]);

  const toggleAuthMode = () => {
    setSignupStep(0);
    setPendingRole("");
    setErrors({});
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAvatarError("");
    setAvatarFile(null);
    setDobOpen(false);
    setDobDraft({ year: "", month: "", day: "" });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview("");
    setShowAvatarPreview(false);
    setAvatarOffset({ x: 0, y: 0 });
    setAvatarNatural(null);
    setIsSignUp((prev) => {
      const next = !prev;
      setFormData((f) => ({
        ...f,
        loginId: next ? "" : f.loginId,
        password: "",
        confirmPassword: "",
        accountType: next ? "" : f.accountType,
        className: next ? "" : f.className,
        certification: next ? "" : f.certification,
      }));
      return next;
    });
  };

  const handleAccountTypeSelect = (value) => {
    setSignupStep(0);
    setPendingRole("");
    setFormData((prev) => ({
      ...prev,
      accountType: value,
      className: value === "student" ? prev.className : "",
      certification: value === "educator" ? prev.certification : "",
    }));
    setErrors((prev) => ({
      ...prev,
      accountType: "",
      ...(value === "student" ? { certification: "" } : { className: "" }),
    }));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleAccountTypeReset = () => {
    setSignupStep(0);
    setPendingRole("");
    setFormData((prev) => ({ ...prev, accountType: "", className: "", certification: "" }));
    setErrors((prev) => ({ ...prev, accountType: "", className: "", certification: "" }));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!avatarPreview) {
      setAvatarNatural(null);
      setAvatarOffset({ x: 0, y: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => setAvatarNatural({ width: img.width, height: img.height });
    img.src = avatarPreview;
  }, [avatarPreview]);


  useEffect(() => {
    let active = true;
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("name")
        .order("name", { ascending: true });
      if (!active) return;
      if (error) {
        if (import.meta?.env?.DEV) {
          console.info("School list fetch failed.", error);
        }
        return;
      }
      const names = (data || []).map((row) => row?.name).filter(Boolean);
      if (names.length) setSchoolNames(names);
    };
    loadSchools();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!canUseCredentials || isSignUp) return undefined;
    (async () => {
      try {
        const cred = await navigator.credentials.get({
          password: true,
          mediation: "silent",
        });
        if (!active || !cred || cred.type !== "password") return;
        setFormData((prev) => ({
          ...prev,
          loginId: cred.id || "",
          password: cred.password || "",
        }));
        setShowPassword(false);
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.info("Credential autofill skipped", err);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [canUseCredentials, isSignUp]);

  const storeCredential = useCallback(
    async (id, pwd, nameHint) => {
      if (!canUseCredentials || !id || !pwd) return;
      try {
        if (window.PasswordCredential) {
          const cred = new window.PasswordCredential({
            id,
            password: pwd,
            name: nameHint || undefined,
          });
          await navigator.credentials.store(cred);
        } else {
          await navigator.credentials.store({
            id,
            password: pwd,
            name: nameHint || undefined,
            type: "password",
          });
        }
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.info("Credential store skipped", err);
        }
      }
    },
    [canUseCredentials]
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const normalizeUsername = useCallback((value) => {
    const normalized = (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/[._-]{2,}/g, ".")
      .replace(/^[._-]+|[._-]+$/g, "");
    if (!normalized) return "";
    const padded = normalized.length < 3 ? normalized.padEnd(3, "0") : normalized;
    return padded.slice(0, 30);
  }, []);

  const buildUsernameFromName = useCallback(
    (firstName, lastName) => {
      const raw = [firstName, lastName].filter(Boolean).join(".");
      return normalizeUsername(raw);
    },
    [normalizeUsername]
  );

  const ensureUniqueUsername = useCallback(
    async (base) => {
      const normalized = normalizeUsername(base);
      if (!normalized) return "";
      let candidate = normalized;
      for (let i = 0; i < 12; i += 1) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", candidate)
          .limit(1);
        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) return candidate;
        const suffix = `.${i + 1}`;
        const trimmed = normalized.slice(0, 30 - suffix.length);
        candidate = `${trimmed}${suffix}`;
      }
      const randomSuffix = `.${Math.floor(1000 + Math.random() * 9000)}`;
      const trimmed = normalized.slice(0, 30 - randomSuffix.length);
      return `${trimmed}${randomSuffix}`;
    },
    [normalizeUsername]
  );

  useEffect(() => {
    if (!isSignUp) return;
    const first = (formData.firstName || "").trim();
    const last = (formData.lastName || "").trim();
    if (!first && !last) return;
    const candidate = buildUsernameFromName(first, last);
    if (!candidate) return;
    setFormData((prev) => (prev.username === candidate ? prev : { ...prev, username: candidate }));
  }, [formData.firstName, formData.lastName, isSignUp, buildUsernameFromName]);

  const dobRootRef = useRef(null);

  const updateDobDraft = useCallback(
    (patch) => {
      setDobDraft((prev) => {
        const next = { ...prev, ...patch };
        let day = next.day;
        if (next.year && next.month && day) {
          const maxDay = new Date(Number(next.year), Number(next.month), 0).getDate();
          if (Number(day) > maxDay) {
            day = String(maxDay).padStart(2, "0");
          }
        }
        const normalized = { ...next, day };
        if (normalized.year && normalized.month && normalized.day) {
          handleInputChange("dateOfBirth", `${normalized.year}-${normalized.month}-${normalized.day}`);
        } else if (!normalized.year && !normalized.month && !normalized.day) {
          handleInputChange("dateOfBirth", "");
        }
        return normalized;
      });
    },
    [handleInputChange]
  );

  const openDobPanel = useCallback(() => {
    const [year = "", month = "", day = ""] = (formData.dateOfBirth || "").split("-");
    setDobDraft({ year, month, day });
    setDobOpen(true);
  }, [formData.dateOfBirth]);

  useEffect(() => {
    if (!dobOpen) return undefined;
    const handlePointer = (event) => {
      const root = dobRootRef.current;
      if (root && !root.contains(event.target)) setDobOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setDobOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [dobOpen]);


  const handleAvatarClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (avatarPreview) {
      setShowAvatarPreview(true);
      return;
    }
    avatarInputRef.current?.click();
  };

  const clampAvatarOffset = useCallback(
    (next) => {
      if (!avatarMetrics) return { x: 0, y: 0 };
      const extraOffset = AVATAR_PREVIEW_SIZE * AVATAR_EMPTY_OFFSET_RATIO;
      return {
        x: clampValue(next.x, -(avatarMetrics.maxOffsetX + extraOffset), avatarMetrics.maxOffsetX + extraOffset),
        y: clampValue(next.y, -(avatarMetrics.maxOffsetY + extraOffset), avatarMetrics.maxOffsetY + extraOffset),
      };
    },
    [avatarMetrics]
  );

  const startAvatarDrag = (event, size) => {
    if (!avatarPreview || !avatarMetrics) return;
    suppressClickRef.current = false;
    dragStartRef.current = { x: event.clientX, y: event.clientY, size };
    dragStartOffsetRef.current = avatarOffset;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleAvatarPointerDown = (event) => startAvatarDrag(event, AVATAR_PREVIEW_SIZE);

  const handleAvatarEditorPointerDown = (event) => startAvatarDrag(event, AVATAR_EDITOR_SIZE);

  const handleAvatarPointerMove = (event) => {
    if (!dragStartRef.current || !avatarMetrics) return;
    const { x: startX, y: startY, size } = dragStartRef.current;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) suppressClickRef.current = true;
    const scale = AVATAR_PREVIEW_SIZE / (size || AVATAR_PREVIEW_SIZE);
    const next = clampAvatarOffset({
      x: dragStartOffsetRef.current.x + dx * scale,
      y: dragStartOffsetRef.current.y + dy * scale,
    });
    setAvatarOffset(next);
  };

  const handleAvatarPointerUp = (event) => {
    if (!dragStartRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragStartRef.current = null;
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError(copy.profilePhotoInvalid);
      setErrors((prev) => ({ ...prev, avatar: copy.profilePhotoInvalid }));
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      const msg = copy.profilePhotoTooLarge.replace("{max}", MAX_AVATAR_MB);
      setAvatarError(msg);
      setErrors((prev) => ({ ...prev, avatar: msg }));
      return;
    }
    setAvatarError("");
    setErrors((prev) => ({ ...prev, avatar: "" }));
    setShowAvatarPreview(false);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarOffset({ x: 0, y: 0 });
  };

  const buildAvatarBlob = useCallback(async () => {
    if (!avatarPreview || !avatarNatural?.width || !avatarNatural?.height) return null;
    const img = new Image();
    img.src = avatarPreview;
    if (img.decode) {
      try {
        await img.decode();
      } catch {
        await new Promise((resolve) => { img.onload = resolve; });
      }
    } else {
      await new Promise((resolve) => { img.onload = resolve; });
    }
    const metrics = getCoverMetrics(avatarNatural.width, avatarNatural.height, AVATAR_OUTPUT_SIZE);
    const offsetScale = AVATAR_OUTPUT_SIZE / AVATAR_PREVIEW_SIZE;
    const extraOffset = AVATAR_OUTPUT_SIZE * AVATAR_EMPTY_OFFSET_RATIO;
    const offsetX = clampValue(
      avatarOffset.x * offsetScale,
      -(metrics.maxOffsetX + extraOffset),
      metrics.maxOffsetX + extraOffset
    );
    const offsetY = clampValue(
      avatarOffset.y * offsetScale,
      -(metrics.maxOffsetY + extraOffset),
      metrics.maxOffsetY + extraOffset
    );
    const drawX = (AVATAR_OUTPUT_SIZE - metrics.width) / 2 + offsetX;
    const drawY = (AVATAR_OUTPUT_SIZE - metrics.height) / 2 + offsetY;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, drawX, drawY, metrics.width, metrics.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  }, [avatarPreview, avatarNatural, avatarOffset]);

  const validateStep = (step) => {
    const newErrors = {};
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const firstName = (formData.firstName || "").trim();
    const lastName = (formData.lastName || "").trim();
    const phone = (formData.phone || "").trim();
    const dateOfBirth = (formData.dateOfBirth || "").trim();
    let username = formData.username.trim();
    const school = formData.school.trim();
    const className = formData.className.trim();
    const certification = formData.certification.trim();
    const accountType = (formData.accountType || "").toLowerCase();
    const usernamePattern = /^[a-zA-Z0-9_\-\.]{3,30}$/;
    const phoneDigits = phone.replace(/\D/g, "");

    if (step === 0) {
      if (avatarError) newErrors.avatar = avatarError;
      else if (!avatarFile) newErrors.avatar = copy.profilePhotoRequired;
      if (!firstName) newErrors.firstName = copy.firstNameRequired;
      else if (!isEnglishInput(firstName)) newErrors.firstName = copy.englishOnly;
      if (!lastName) newErrors.lastName = copy.lastNameRequired;
      else if (!isEnglishInput(lastName)) newErrors.lastName = copy.englishOnly;
      if (!dateOfBirth) newErrors.dateOfBirth = copy.dobRequired;
      else {
        const dobDate = new Date(dateOfBirth);
        if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
          newErrors.dateOfBirth = copy.dobInvalid;
        }
      }
      const generatedUsername = buildUsernameFromName(firstName, lastName);
      const effectiveUsername = username || generatedUsername;
      if (!effectiveUsername) newErrors.username = copy.usernameRequired;
      else if (!usernamePattern.test(effectiveUsername)) newErrors.username = copy.usernameInvalid;
      if (!username && generatedUsername) {
        setFormData((prev) => (prev.username === generatedUsername ? prev : { ...prev, username: generatedUsername }));
      }
      if (!phone) newErrors.phone = copy.phoneRequired;
      else if (!isEnglishInput(phone)) newErrors.phone = copy.englishOnly;
      else if (phoneDigits.length < 6) newErrors.phone = copy.phoneInvalid;
    }

    if (step === 1) {
      if (!["student", "educator"].includes(accountType)) newErrors.accountType = copy.accountTypeRequired;
      if (!school) newErrors.school = copy.schoolRequired;
      if (accountType === "student") {
        if (!className) newErrors.className = copy.classRequired;
      } else if (accountType === "educator") {
        if (!certification) newErrors.certification = copy.certificationRequired;
        else if (!isEnglishInput(certification)) newErrors.certification = copy.englishOnly;
      }
    }

    if (step === 2) {
      if (!email) newErrors.email = copy.emailRequired;
      else if (!isEnglishInput(email)) newErrors.email = copy.englishOnly;
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = copy.emailInvalid;
      if (!password) newErrors.password = copy.passwordRequired;
      else if (password.length < 6) newErrors.password = copy.passwordTooShort;
      if (!confirmPassword) newErrors.confirmPassword = copy.confirmPasswordRequired;
      else if (password !== confirmPassword) newErrors.confirmPassword = copy.passwordsDontMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors = {};
    const loginId = formData.loginId.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const firstName = (formData.firstName || "").trim();
    const lastName = (formData.lastName || "").trim();
    const phone = (formData.phone || "").trim();
    const dateOfBirth = (formData.dateOfBirth || "").trim();
    const username = formData.username.trim();
    const school = formData.school.trim();
    const className = formData.className.trim();
    const certification = formData.certification.trim();
    const accountType = (formData.accountType || "").toLowerCase();
    const usernamePattern = /^[a-zA-Z0-9_\-\.]{3,30}$/;
    const phoneDigits = phone.replace(/\D/g, "");

    // Sign-in requires email or username
    if (!isSignUp) {
      if (!loginId) newErrors.loginId = copy.loginIdRequired;
      else if (loginId.includes("@")) {
        if (!/\S+@\S+\.\S+/.test(loginId)) newErrors.loginId = copy.emailInvalid;
      } else if (!usernamePattern.test(loginId)) {
        newErrors.loginId = copy.loginIdInvalid;
      }
    }

    // Sign-up requires email, username, password, confirm, first/last name
    if (isSignUp) {
      if (!email) newErrors.email = copy.emailRequired;
      else if (!isEnglishInput(email)) newErrors.email = copy.englishOnly;
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = copy.emailInvalid;
      const generatedUsername = buildUsernameFromName(firstName, lastName);
      const effectiveUsername = username || generatedUsername;
      if (!effectiveUsername) newErrors.username = copy.usernameRequired;
      else if (!usernamePattern.test(effectiveUsername)) newErrors.username = copy.usernameInvalid;
      if (!username && generatedUsername) {
        setFormData((prev) => (prev.username === generatedUsername ? prev : { ...prev, username: generatedUsername }));
      }
      if (!phone) newErrors.phone = copy.phoneRequired;
      else if (!isEnglishInput(phone)) newErrors.phone = copy.englishOnly;
      else if (phoneDigits.length < 6) newErrors.phone = copy.phoneInvalid;
      if (!dateOfBirth) newErrors.dateOfBirth = copy.dobRequired;
      else {
        const dobDate = new Date(dateOfBirth);
        if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
          newErrors.dateOfBirth = copy.dobInvalid;
        }
      }
      if (!["student", "educator"].includes(accountType)) newErrors.accountType = copy.accountTypeRequired;
      if (!school) newErrors.school = copy.schoolRequired;
      if (accountType === "student") {
        if (!className) newErrors.className = copy.classRequired;
      } else if (accountType === "educator") {
        if (!certification) newErrors.certification = copy.certificationRequired;
        else if (!isEnglishInput(certification)) newErrors.certification = copy.englishOnly;
      }
      if (!avatarFile) newErrors.avatar = copy.profilePhotoRequired;
      else if (avatarError) newErrors.avatar = avatarError;
    }

    if (!password) newErrors.password = copy.passwordRequired;
    else if (password.length < 6) newErrors.password = copy.passwordTooShort;
    if (isSignUp) {
      if (!firstName) newErrors.firstName = copy.firstNameRequired;
      else if (!isEnglishInput(firstName)) newErrors.firstName = copy.englishOnly;
      if (!lastName) newErrors.lastName = copy.lastNameRequired;
      else if (!isEnglishInput(lastName)) newErrors.lastName = copy.englishOnly;
      if (!confirmPassword) newErrors.confirmPassword = copy.confirmPasswordRequired;
      else if (password !== confirmPassword) newErrors.confirmPassword = copy.passwordsDontMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsRoleSelection) {
      setErrors((prev) => ({ ...prev, accountType: copy.accountTypeRequired }));
      return;
    }
    if (isSignUp && !isFinalStep) {
      const okStep = validateStep(signupStep);
      if (!okStep) return;
      setSignupStep((prev) => Math.min(prev + 1, totalSteps - 1));
      return;
    }
    const ok = validateForm();
    if (!ok) return;
    setLoading(true);
    const loginId = formData.loginId.trim();
    const email = formData.email.trim().toLowerCase();
    let username = formData.username.trim();
    const phone = (formData.phone || "").trim();
    const dateOfBirth = (formData.dateOfBirth || "").trim();
    const password = formData.password;
    const firstName = (formData.firstName || "").trim();
    const lastName = (formData.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const accountTypeSelection = (formData.accountType || "").toLowerCase();
    const normalizedAccountType = accountTypeSelection === "educator" ? "educator" : "student";
    const school = formData.school.trim();
    const className = formData.className.trim();
    const certification = formData.certification.trim();
    try {
      let isAdminUser = false;
      if (isSignUp) {
        try {
          const { data: existingEmail, error: emailError } = await supabase
            .from("profiles")
            .select("id")
            .ilike("email", email)
            .limit(1);
          if (emailError) {
            console.warn("Email availability check failed", emailError);
          } else if (Array.isArray(existingEmail) && existingEmail.length > 0) {
            setErrors((prev) => ({ ...prev, email: copy.emailInUse }));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("Email availability check failed", err);
        }
        const generatedUsername = buildUsernameFromName(firstName, lastName);
        const baseUsername = normalizeUsername(username || generatedUsername);
        if (!baseUsername) {
          setErrors((prev) => ({ ...prev, username: copy.usernameRequired }));
          setLoading(false);
          return;
        }
        try {
          const uniqueUsername = await ensureUniqueUsername(baseUsername);
          if (uniqueUsername && uniqueUsername !== username) {
            username = uniqueUsername;
            setFormData((prev) => (prev.username === uniqueUsername ? prev : { ...prev, username: uniqueUsername }));
          } else {
            username = uniqueUsername || baseUsername;
          }
        } catch (err) {
          console.error("Username availability check failed", err);
          setErrors((prev) => ({ ...prev, username: copy.usernameInvalid }));
          setLoading(false);
          return;
        }
        // Supabase Auth: sign up with email/password
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName || username,
              first_name: firstName || undefined,
              last_name: lastName || undefined,
              date_of_birth: dateOfBirth || undefined,
              username,
              phone,
              school,
              class: normalizedAccountType === "student" ? className : "",
              className: normalizedAccountType === "student" ? className : "",
              certification: normalizedAccountType === "educator" ? certification : "",
              accountType: normalizedAccountType,
              role: normalizedAccountType,
            },
          },
        });
        if (error) {
          if (/already registered|already exists|email/i.test(error.message || "")) {
            setErrors((prev) => ({ ...prev, email: copy.emailInUse }));
            setLoading(false);
            return;
          }
          throw error;
        }

        const user = data.user;
        const session = data.session;
        // If confirmations are enabled, session may be null
        if (!session || !user) {
          setErrors((prev) => ({ ...prev, submit: copy.confirmEmailNotice }));
          setLoading(false);
          return;
        }
        let avatarUrl = "";
        if (avatarFile) {
          let uploadFile = avatarFile;
          const cropped = await buildAvatarBlob();
          if (cropped) {
            uploadFile = new File([cropped], "avatar.jpg", { type: cropped.type || "image/jpeg" });
          }
          const path = `${user.id}/avatar`;
          const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, uploadFile, {
            upsert: true,
            cacheControl: "3600",
            contentType: uploadFile.type || avatarFile.type || "image/*",
          });
          if (uploadError) {
            console.error("avatar upload failed", uploadError);
          } else {
            const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
            avatarUrl = publicData?.publicUrl || "";
          }
        }
        // Upsert profile with default role
        let role = email.toLowerCase() === "anasitani186@gmail.com" ? "admin" : normalizedAccountType;
        const profileRow = {
          id: user.id,
          email,
          username,
          name: fullName || username,
          role,
          avatar_url: avatarUrl || null,
          school: school || null,
          class_name: normalizedAccountType === "student" ? (className || null) : null,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          ai_access: false,
        };
        await supabase.from("profiles").upsert(profileRow);
        const current = {
          id: user.id,
          email,
          username,
          name: profileRow.name,
          role,
          avatar_url: avatarUrl || "",
          school: profileRow.school || "",
          class_name: profileRow.class_name || "",
          phone: profileRow.phone || "",
          date_of_birth: profileRow.date_of_birth || "",
          ai_access: false,
        };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = role === "admin";
        await storeCredential(email, password, username || fullName || email);
      } else {
        // Supabase Auth: sign in using email/password (lookup by username if needed)
        let signInEmail = loginId;
        if (!loginId.includes("@")) {
          const { data: usernameRows, error: usernameErr } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", loginId)
            .limit(1);
          if (usernameErr) throw usernameErr;
          const match = Array.isArray(usernameRows) ? usernameRows[0] : null;
          if (!match?.email) throw new Error("Invalid email or password");
          signInEmail = match.email;
        } else {
          signInEmail = loginId;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email: signInEmail, password });
        if (error) throw new Error("Invalid email or password");
        const user = data.user;
        // Get or create profile
        let profile = null;
        const { data: profRows } = await supabase.from("profiles").select("*").eq("id", user.id).limit(1);
        profile = profRows && profRows[0];
        const metaType = (user.user_metadata?.accountType || user.user_metadata?.role || "").toLowerCase();
        const metaRole = metaType === "educator" ? "educator" : metaType === "student" ? "student" : "";
        const isAdminEmail = user.email?.toLowerCase() === "anasitani186@gmail.com";

        if (profile) {
          const currentRole = (profile.role || "").toLowerCase();
          const shouldBackfill = isAdminEmail || !currentRole || currentRole === "user";
          if (shouldBackfill) {
            const desiredRole = isAdminEmail ? "admin" : metaRole || "student";
            if (desiredRole && desiredRole !== profile.role) {
              const { error: roleUpdateError } = await supabase
                .from("profiles")
                .update({ role: desiredRole })
                .eq("id", user.id);
              if (!roleUpdateError) profile = { ...profile, role: desiredRole };
            }
          }
        }

        if (!profile) {
          let inferredRole = metaRole === "educator" ? "educator" : "student";
          if (isAdminEmail) inferredRole = "admin";
          const meta = user.user_metadata || {};
          const uname = meta.username || (user.email ? user.email.split("@")[0] : "");
          const inferredName =
            meta.name ||
            [meta.first_name || meta.firstName, meta.last_name || meta.lastName].filter(Boolean).join(" ").trim();
          const fallbackSchool = meta.school || meta.organization || null;
          const fallbackClass = meta.className || meta.class || null;
          const fallbackPhone = meta.phone || meta.phoneNumber || null;
          const insertRow = {
            id: user.id,
            email: user.email,
            username: uname,
            name: inferredName || uname,
            role: inferredRole,
            ai_access: false,
            school: fallbackSchool,
            class_name: fallbackClass,
            phone: fallbackPhone,
          };
          await supabase.from("profiles").insert(insertRow);
          profile = { ...insertRow };
        }
        const current = {
          id: user.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role,
          ai_access: profile.ai_access ?? false,
          school: profile.school || "",
          class_name: profile.class_name || "",
          phone: profile.phone || "",
        };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (profile.role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = profile.role === "admin";
        await storeCredential(signInEmail, password, profile?.name || profile?.username || signInEmail);
      }
      // Navigate back to home for all users
      onNavigate("home");
    } catch (err) {
      const msg = err?.message || String(err);
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  // no email confirmation flow

  return (
    <PageWrap>
      <HeaderBar title={isSignUp ? copy.signUpTitle : copy.signInTitle} right={null} />

      <Card style={{ direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left" }}>
        {needsRoleSelection ? (
          <>
            <div style={{ marginBottom: 24, textAlign: isRTL ? "right" : "center" }}>
              <h2 style={{ margin: 0, color: "#111827" }}>{copy.roleSelectHeading}</h2>
              <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
                {copy.roleSelectBody}
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                alignItems: "stretch",
              }}
            >
              {roleOptions.map((role) => {
                const isStudent = role.value === "student";
                const isSelected = pendingRole === role.value;
                const accentBorder = isStudent ? "#2563eb" : "#16a34a";
                const accentBg = isStudent ? "#eff6ff" : "#f0fdf4";
                const accentShadow = isStudent ? "rgba(37,99,235,0.2)" : "rgba(22,163,74,0.2)";
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      setPendingRole(role.value);
                      setErrors((prev) => ({ ...prev, accountType: "" }));
                    }}
                    style={{
                      textAlign: "center",
                      border: isSelected ? `2px solid ${accentBorder}` : "2px solid #d1d5db",
                      borderRadius: 12,
                      padding: "16px 18px",
                      background: isSelected ? accentBg : "#ffffff",
                      cursor: "pointer",
                      transition: "border 120ms ease, box-shadow 120ms ease, background 120ms ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      flexDirection: "column",
                      aspectRatio: "1 / 1",
                      boxShadow: isSelected ? `0 8px 22px ${accentShadow}` : "none",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      if (isSelected) return;
                      e.currentTarget.style.border = `2px solid ${accentBorder}`;
                      e.currentTarget.style.boxShadow = `0 6px 18px ${accentShadow}`;
                    }}
                    onMouseLeave={(e) => {
                      if (isSelected) {
                        e.currentTarget.style.border = `2px solid ${accentBorder}`;
                        e.currentTarget.style.boxShadow = `0 8px 22px ${accentShadow}`;
                        e.currentTarget.style.background = accentBg;
                        return;
                      }
                      e.currentTarget.style.border = "2px solid #d1d5db";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = `2px solid ${accentBorder}`;
                      e.currentTarget.style.boxShadow = `0 6px 18px ${accentShadow}`;
                    }}
                    onBlur={(e) => {
                      if (isSelected) {
                        e.currentTarget.style.border = `2px solid ${accentBorder}`;
                        e.currentTarget.style.boxShadow = `0 8px 22px ${accentShadow}`;
                        e.currentTarget.style.background = accentBg;
                        return;
                      }
                      e.currentTarget.style.border = "2px solid #d1d5db";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <img
                      src={isStudent ? studentRoleSvg : educatorRoleSvg}
                      alt={role.label}
                      style={{ width: 96, height: 96 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: 16 }}>{role.label}</div>
                      <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>{role.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
              <Btn
                variant="primary"
                onClick={() => {
                  if (!pendingRole) {
                    setErrors((prev) => ({ ...prev, accountType: copy.accountTypeRequired }));
                    return;
                  }
                  handleAccountTypeSelect(pendingRole);
                }}
                style={{ width: "100%" }}
              >
                {copy.nextStep}
              </Btn>
              <Btn variant="secondary" onClick={toggleAuthMode} style={{ width: "100%" }}>
                {copy.backToSignIn}
              </Btn>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate autoComplete="on">
            {!isSignUp && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <img
                  src={logoPng}
                  alt="EEC logo"
                  style={{ width: 120, height: 120, objectFit: "contain" }}
                />
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "#111827", textAlign: "center" }}>
                {isSignUp ? copy.createAccount : copy.welcomeBack}
              </h2>
              <p style={{ margin: "8px 0 0", color: "#6b7280", textAlign: "center" }}>
                {isSignUp ? copy.signUpSubtitle : copy.signInSubtitle}
              </p>
            </div>

            {isSignUp && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                  flexDirection: isRTL ? "row-reverse" : "row",
                }}
              >
                <span style={{ fontSize: 12, color: "#6b7280" }}>{stepLabelText}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{currentStepLabel}</span>
              </div>
            )}

            {isSignUp && formData.accountType && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#374151", fontSize: 14 }}>
                  {copy.signingUpAsLabel}{" "}
                  <strong style={{ color: "#111827" }}>{activeRoleLabel}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAccountTypeReset}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "underline",
                  }}
                >
                  {copy.changeRole}
                </button>
              </div>
            )}
            {errors.accountType && (
              <p style={accountTypeErrorStyle}>{errors.accountType}</p>
            )}

            {isSignUp && signupStep === 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    onPointerDown={handleAvatarPointerDown}
                    onPointerMove={handleAvatarPointerMove}
                    onPointerUp={handleAvatarPointerUp}
                    onPointerCancel={handleAvatarPointerUp}
                    style={{
                      width: AVATAR_PREVIEW_SIZE,
                      height: AVATAR_PREVIEW_SIZE,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      color: "#94a3b8",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                      position: "relative",
                      touchAction: "none",
                    }}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={copy.profilePhotoLabel}
                        style={{
                          width: avatarMetrics?.width || "100%",
                          height: avatarMetrics?.height || "100%",
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: `translate(-50%, -50%) translate(${avatarOffset.x}px, ${avatarOffset.y}px)`,
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      />
                    ) : (
                      "No photo"
                    )}
                  </button>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                      {copy.profilePhotoLabel}
                    </label>
                    <input
                      id={avatarInputId}
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ cursor: "pointer" }}
                    />
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{photoHelper}</div>
                    {errors.avatar && <p style={errorStyle}>{errors.avatar}</p>}
                  </div>
                </div>
                {showAvatarPreview && avatarPreview ? (
                  <ModalPortal>
                    <div
                      role="dialog"
                      aria-modal="true"
                      onClick={() => setShowAvatarPreview(false)}
                      style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.78)",
                        display: "grid",
                        placeItems: "center",
                        zIndex: 2000,
                      }}
                    >
                      <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#ffffff",
                        borderRadius: 12,
                        padding: 12,
                        maxWidth: "90vw",
                        maxHeight: "90vh",
                        display: "grid",
                        gap: 10,
                        justifyItems: "center",
                      }}
                    >
                      <div
                        onPointerDown={handleAvatarEditorPointerDown}
                        onPointerMove={handleAvatarPointerMove}
                        onPointerUp={handleAvatarPointerUp}
                        onPointerCancel={handleAvatarPointerUp}
                        style={{
                          width: AVATAR_EDITOR_SIZE,
                          height: AVATAR_EDITOR_SIZE,
                          borderRadius: 16,
                          overflow: "hidden",
                          position: "relative",
                          background: "#ffffff",
                          touchAction: "none",
                          cursor: "grab",
                        }}
                      >
                        <img
                          src={avatarPreview}
                          alt={copy.profilePhotoLabel}
                          style={{
                            width: avatarEditorMetrics?.width || "100%",
                            height: avatarEditorMetrics?.height || "100%",
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: `translate(-50%, -50%) translate(${avatarOffset.x * (AVATAR_EDITOR_SIZE / AVATAR_PREVIEW_SIZE)}px, ${avatarOffset.y * (AVATAR_EDITOR_SIZE / AVATAR_PREVIEW_SIZE)}px)`,
                            userSelect: "none",
                            pointerEvents: "none",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.5)",
                            border: "2px solid #f8fafc",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAvatarPreview(false)}
                        style={{
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#374151",
                          padding: "6px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Close
                      </button>
                    </div>
                    </div>
                  </ModalPortal>
                ) : null}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <Field
                      label={copy.firstName}
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder={copy.enterFirstName}
                      invalid={!!errors.firstName}
                      autoComplete="given-name"
                      name="firstName"
                      style={fieldStyle}
                    />
                    {errors.firstName && (
                      <p style={errorStyle}>{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Field
                      label={copy.lastName}
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder={copy.enterLastName}
                      invalid={!!errors.lastName}
                      autoComplete="family-name"
                      name="lastName"
                      style={fieldStyle}
                    />
                    {errors.lastName && (
                      <p style={errorStyle}>{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div ref={dobRootRef} style={{ position: "relative" }}>
                  <Field
                    label={copy.dobLabel}
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    placeholder={copy.dobPlaceholder}
                    invalid={!!errors.dateOfBirth}
                    autoComplete="bday"
                    name="dateOfBirth"
                    readOnly
                    onClick={openDobPanel}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDobPanel();
                      }
                    }}
                    style={{
                      ...(fieldStyle || {}),
                      ...dateInputStyle,
                      cursor: "pointer",
                      borderColor: dobOpen ? "#2563eb" : undefined,
                      boxShadow: dobOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
                    }}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => (dobOpen ? setDobOpen(false) : openDobPanel())}
                        aria-label="Toggle date picker"
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          margin: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          color: "#64748b",
                        }}
                      >
                        <CalendarIcon />
                      </button>
                    }
                  />
                  {dobOpen && (
                    <div style={dobDropdownStyle}>
                      <div style={dobGridStyle}>
                        <select
                          value={dobDraft.month}
                          onChange={(e) => updateDobDraft({ month: e.target.value })}
                          style={dobSelectStyle}
                        >
                          <option value="">Month</option>
                          {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={dobDraft.day}
                          onChange={(e) => updateDobDraft({ day: e.target.value })}
                          style={dobSelectStyle}
                        >
                          <option value="">Day</option>
                          {dayOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={dobDraft.year}
                          onChange={(e) => updateDobDraft({ year: e.target.value })}
                          style={dobSelectStyle}
                        >
                          <option value="">Year</option>
                          {yearOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                {errors.dateOfBirth && (
                  <p style={errorStyle}>{errors.dateOfBirth}</p>
                )}
                <Field
                  label={copy.usernameLabel}
                  value={formData.username}
                  onChange={() => {}}
                  placeholder={copy.usernamePlaceholder}
                  invalid={!!errors.username}
                  autoComplete="username"
                  name="username"
                  readOnly
                  style={{ ...(fieldStyle || {}), background: "rgba(241, 245, 249, 0.7)" }}
                />
                {errors.username && (
                  <p style={errorStyle}>{errors.username}</p>
                )}
                <Field
                  label={copy.phoneLabel}
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder={copy.phonePlaceholder}
                  invalid={!!errors.phone}
                  autoComplete="tel"
                  name="phone"
                  style={fieldStyle}
                />
                {errors.phone && (
                  <p style={errorStyle}>{errors.phone}</p>
                )}
              </>
            )}

            {isSignUp && signupStep === 1 && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>
                    {copy.schoolLabel}
                  </label>
                  <select
                    value={formData.school}
                    onChange={(e) => handleInputChange("school", e.target.value)}
                    style={{ ...selectBaseStyle, ...(fieldStyle || {}), paddingRight: 30 }}
                  >
                    {schoolOptions.map((opt) => (
                      <option key={opt.value || "blank"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.school && (
                  <p style={errorStyle}>{errors.school}</p>
                )}
                {formData.accountType === "student" && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>
                        {copy.classLabel}
                      </label>
                      <select
                        value={formData.className}
                        onChange={(e) => handleInputChange("className", e.target.value)}
                        style={{ ...selectBaseStyle, ...(fieldStyle || {}), paddingRight: 30 }}
                      >
                        {SIGNUP_GRADE_OPTIONS.map((opt) => (
                          <option key={opt.value || "blank"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.className && (
                      <p style={errorStyle}>{errors.className}</p>
                    )}
                  </>
                )}
                {formData.accountType === "educator" && (
                  <>
                    <Field
                      label={copy.certificationLabel}
                      value={formData.certification}
                      onChange={(e) => handleInputChange("certification", e.target.value)}
                      placeholder={copy.certificationPlaceholder}
                      invalid={!!errors.certification}
                      autoComplete="off"
                      name="certification"
                      style={fieldStyle}
                    />
                    {errors.certification && (
                      <p style={errorStyle}>{errors.certification}</p>
                    )}
                  </>
                )}
              </>
            )}

            {!isSignUp && (
              <>
                <Field
                  label={copy.emailOrUsername}
                  value={formData.loginId}
                  onChange={(e) => handleInputChange("loginId", e.target.value)}
                  placeholder={copy.emailOrUsernamePlaceholder}
                  invalid={!!errors.loginId}
                  type="text"
                  autoComplete="username"
                  name="username"
                  style={fieldStyle}
                />
                {errors.loginId && (
                  <p style={errorStyle}>{errors.loginId}</p>
                )}
              </>
            )}

            {isSignUp && signupStep === 2 && (
              <>
                <Field
                  label={copy.email}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder={copy.enterEmail}
                  invalid={!!errors.email}
                  type="email"
                  autoComplete="email"
                  name="email"
                  style={fieldStyle}
                />
                {errors.email && (
                  <p style={errorStyle}>{errors.email}</p>
                )}
              </>
            )}

            {(!isSignUp || signupStep === 2) && (
              <>
                <Field
                  label={copy.password}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder={copy.enterPassword}
                  invalid={!!errors.password}
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  name={isSignUp ? "new-password" : "password"}
                  style={fieldStyle}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                      title={showPassword ? copy.hidePassword : copy.showPassword}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        margin: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        color: "#4b5563",
                      }}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                {errors.password && (
                  <p style={errorStyle}>{errors.password}</p>
                )}

                {isSignUp && (
                  <>
                    <Field
                      label={copy.confirmPassword}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder={copy.confirmYourPassword}
                      invalid={!!errors.confirmPassword}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      name="new-password-confirm"
                      style={fieldStyle}
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={showConfirmPassword ? copy.hideConfirmPassword : copy.showConfirmPassword}
                          title={showConfirmPassword ? copy.hideConfirmPassword : copy.showConfirmPassword}
                          style={{
                            border: "none",
                            background: "none",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            color: "#4b5563",
                          }}
                        >
                          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      }
                    />
                    {errors.confirmPassword && (
                      <p style={errorStyle}>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {errors.submit && (!isSignUp || isFinalStep) && (
              <p style={submitErrorStyle}>{errors.submit}</p>
            )}

            <div style={{ marginTop: 24 }}>
              {isSignUp ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {signupStep > 0 && (
                    <Btn
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setSignupStep((prev) => Math.max(prev - 1, 0));
                      }}
                      style={{ flex: 1 }}
                      disabled={loading}
                    >
                      {copy.backStep}
                    </Btn>
                  )}
                  <Btn
                    variant="primary"
                    type="submit"
                    style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                  >
                    {loading ? copy.signingUp : isFinalStep ? copy.signUp : copy.nextStep}
                  </Btn>
                </div>
              ) : (
                <Btn
                  variant="primary"
                  type="submit"
                  style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                >
                  {loading ? copy.signingIn : copy.signIn}
                </Btn>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <Btn variant="secondary" onClick={() => onNavigate("home")} style={{ width: "100%" }}>
                {copy.backToHome}
              </Btn>
            </div>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={toggleAuthMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  cursor: "pointer",
                  fontSize: 14,
                  textDecoration: "underline",
                }}
              >
                {isSignUp ? copy.alreadyHaveAccount : copy.dontHaveAccount}
              </button>
            </div>
          </form>
        )}
      </Card>
    </PageWrap>
  );
}
