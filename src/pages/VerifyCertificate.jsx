// src/pages/VerifyCertificate.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import UserMenu from "../components/UserMenu.jsx";
import Btn from "../components/Btn.jsx";
import { supabase } from "../lib/supabase.js";

const COPY = {
  EN: {
    title: "Verify Certificate",
    subtitle: "Enter the certificate ID to confirm that it was issued by EEC.",
    inputLabel: "Certificate Number",
    placeholder: "e.g., EEC-2025-000123",
    verify: "Verify Certificate",
    verifying: "Verifying…",
    emptyError: "Please enter a certificate number.",
    notFound: "No certificate matched that number. Please double-check and try again.",
    errorGeneric: "Something went wrong. Please try again later.",
    resultTitle: "Certificate Details",
    issuedTo: "Issued To",
    program: "Program",
    issuedOn: "Issued On",
    status: "Status",
    score: "Score",
    advisor: "Advisor / Coach",
    downloadHint: "Keep this ID for future verification requests.",
    statusValid: "Valid",
    statusRevoked: "Revoked",
    statusExpired: "Expired",
    backHome: "Back to Home",
  },
  AR: {
    title: "التحقق من الشهادة",
    subtitle: "أدخل رقم الشهادة للتأكد من أنها صادرة عن لجنة التطوير التربوي.",
    inputLabel: "رقم الشهادة",
    placeholder: "مثال: EEC-2025-000123",
    verify: "تحقق من الشهادة",
    verifying: "جاري التحقق…",
    emptyError: "يرجى إدخال رقم الشهادة.",
    notFound: "لم يتم العثور على شهادة بهذا الرقم. تحقق مرة أخرى وحاول مجددًا.",
    errorGeneric: "حدث خطأ غير متوقع. حاول لاحقًا.",
    resultTitle: "بيانات الشهادة",
    issuedTo: "صادرة لصالح",
    program: "البرنامج",
    issuedOn: "تاريخ الإصدار",
    status: "الحالة",
    score: "النتيجة",
    advisor: "المرشد / المدرب",
    downloadHint: "احتفظ بهذا الرقم لطلبات التحقق المستقبلية.",
    statusValid: "سارية",
    statusRevoked: "ملغاة",
    statusExpired: "منتهية",
    backHome: "العودة للصفحة الرئيسية",
  },
  FR: {
    title: "Vérifier un certificat",
    subtitle: "Saisissez l'identifiant pour confirmer qu'il a été délivré par l'EEC.",
    inputLabel: "Numéro de certificat",
    placeholder: "ex. EEC-2025-000123",
    verify: "Vérifier le certificat",
    verifying: "Vérification…",
    emptyError: "Veuillez saisir un numéro de certificat.",
    notFound: "Aucun certificat ne correspond à ce numéro. Merci de vérifier et réessayer.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer plus tard.",
    resultTitle: "Détails du certificat",
    issuedTo: "Délivré à",
    program: "Programme",
    issuedOn: "Date d'émission",
    status: "Statut",
    score: "Score",
    advisor: "Conseiller / Coach",
    downloadHint: "Conservez cet identifiant pour de futures vérifications.",
    statusValid: "Valide",
    statusRevoked: "Révoqué",
    statusExpired: "Expiré",
    backHome: "Retour à l'accueil",
  },
};

const CERT_TABLE = import.meta.env.VITE_CERTIFICATES_TABLE || "cg_certificates";

const STATUS_COLORS = {
  valid: "#16a34a",
  revoked: "#dc2626",
  expired: "#d97706",
};

export default function VerifyCertificate({ onNavigate }) {
  VerifyCertificate.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const copy = COPY.EN;
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const hasResult = useMemo(() => Boolean(result && result.id), [result]);

  const normalizeCode = (value) =>
    value
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotFound(false);
    setResult(null);

    const normalized = normalizeCode(code);
    if (!normalized) {
      setError(copy.emptyError);
      return;
    }

    setPending(true);
    try {
      let query = supabase
        .from(CERT_TABLE)
        .select("*")
        .or(`code.eq.${normalized},certificate_number.eq.${normalized}`)
        .maybeSingle();

      let { data, error: queryError } = await query;
      if (queryError) {
        if (queryError.code === "PGRST116") {
          setNotFound(true);
        } else {
          console.error("verify certificate", queryError);
          setError(copy.errorGeneric);
        }
        return;
      }

      if (!data) {
        setNotFound(true);
        return;
      }

      setResult({
        ...data,
        code: data.code || data.certificate_number || normalized,
      });
    } catch (err) {
      console.error("verify certificate unexpected", err);
      setError(copy.errorGeneric);
    } finally {
      setPending(false);
    }
  };

  const statusChip = (statusRaw) => {
    if (!statusRaw) return null;
    const clean = String(statusRaw).toLowerCase();
    const color = STATUS_COLORS[clean] || "#0f172a";
    let label = statusRaw;
    if (clean.includes("revoke")) label = copy.statusRevoked;
    else if (clean.includes("expire")) label = copy.statusExpired;
    else if (clean.includes("valid") || clean.includes("active")) label = copy.statusValid;

    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: `${color}1a`,
          color,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {label}
      </span>
    );
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const detailRows = [
    { label: copy.issuedTo, value: result?.student_name || result?.name || "—" },
    { label: copy.program, value: result?.program || result?.track || "—" },
    { label: copy.issuedOn, value: formatDate(result?.issued_at || result?.created_at) },
    { label: copy.score, value: result?.score != null ? result.score : "—" },
    { label: copy.advisor, value: result?.advisor || result?.coach || "—" },
  ];

  return (
    <PageWrap>
      <HeaderBar
        title={copy.title}
        right={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <UserMenu onNavigate={onNavigate} />
          </div>
        }
      />

      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>{copy.subtitle}</p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{copy.inputLabel}</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={copy.placeholder}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
                textTransform: "uppercase",
                boxSizing: "border-box",
              }}
            />
          </label>
          {error && (
            <div style={{ border: "1px solid #fecaca", background: "#fee2e2", borderRadius: 8, padding: "8px 12px", color: "#b91c1c" }}>
              {error}
            </div>
          )}
          {notFound && (
            <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, padding: "8px 12px", color: "#1d4ed8" }}>
              {copy.notFound}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              background: pending ? "#c7d2fe" : "#4f46e5",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? copy.verifying : copy.verify}
          </button>
        </form>
      </Card>

      {hasResult && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{copy.resultTitle}</h3>
              <p style={{ margin: "4px 0 0", color: "#6b7280" }}>{copy.downloadHint}</p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {statusChip(result.status)}
              <span style={{ fontFamily: "monospace", fontSize: 14 }}>{result.code}</span>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {detailRows.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ color: "#6b7280" }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{row.value || "—"}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => window.print?.()}>
              Print / Save
            </Btn>
          </div>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Btn variant="link" to="home" onClick={(e) => onNavigate("home", null, e)}>
          {copy.backHome}
        </Btn>
      </div>
    </PageWrap>
  );
}
