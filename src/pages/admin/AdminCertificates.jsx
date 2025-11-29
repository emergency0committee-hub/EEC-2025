// src/pages/admin/AdminCertificates.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

const TABLE = import.meta.env.VITE_CERTIFICATES_TABLE || "cg_certificates";

const STATUS_OPTIONS = [
  { value: "valid", label: "Valid" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
];

const initialForm = () => ({
  code: "",
  certificateNumber: "",
  studentName: "",
  program: "",
  score: "",
  advisor: "",
  status: "valid",
  issuedAt: new Date().toISOString().slice(0, 16),
});

export default function AdminCertificates({ onNavigate }) {
  AdminCertificates.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadCertificates = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: queryError } = await supabase
        .from(TABLE)
        .select("*")
        .order("issued_at", { ascending: false });
      if (queryError) throw queryError;
      setRecords(data || []);
    } catch (err) {
      console.error("load certificates", err);
      setError(err?.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generateCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    handleChange("code", `EEC-${year}-${suffix}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccess("");
    setError("");

    if (!form.code.trim()) {
      setError("Certificate code is required.");
      return;
    }
    if (!form.studentName.trim()) {
      setError("Student name is required.");
      return;
    }
    if (!form.status) {
      setError("Please select a status.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        certificate_number: form.certificateNumber.trim() || null,
        student_name: form.studentName.trim(),
        program: form.program.trim() || null,
        advisor: form.advisor.trim() || null,
        status: form.status,
        issued_at: form.issuedAt ? new Date(form.issuedAt).toISOString() : null,
      };
      if (form.score !== "") {
        const numericScore = Number(form.score);
        payload.score = Number.isFinite(numericScore) ? numericScore : null;
      }

      const { data, error: insertError } = await supabase
        .from(TABLE)
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;
      setRecords((prev) => [data, ...prev]);
      setForm(initialForm());
      setSuccess("Certificate saved.");
    } catch (err) {
      console.error("save certificate", err);
      setError(err?.message || "Failed to save certificate.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Delete this certificate?")) return;
    setDeletingId(record.id);
    try {
      const { error: deleteError } = await supabase.from(TABLE).delete().eq("id", record.id);
      if (deleteError) throw deleteError;
      setRecords((prev) => prev.filter((item) => item.id !== record.id));
    } catch (err) {
      console.error("delete certificate", err);
      alert(err?.message || "Failed to delete certificate.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status) => {
    if (!status) return null;
    const clean = String(status).toLowerCase();
    const meta = {
      valid: "#16a34a",
      revoked: "#dc2626",
      expired: "#d97706",
    }[clean] || "#0f172a";
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: `${meta}1a`,
          color: meta,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {status}
      </span>
    );
  };

  const formattedRecords = useMemo(() => {
    return (records || []).map((item) => ({
      ...item,
      issuedLabel: item.issued_at ? new Date(item.issued_at).toLocaleString() : "—",
    }));
  }, [records]);

  return (
    <PageWrap>
      <HeaderBar
        title="Certificates"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
            <Btn variant="secondary" onClick={loadCertificates}>
              Refresh
            </Btn>
            <Btn variant="back" onClick={() => onNavigate("admin-dashboard")}>
              Back to Admin
            </Btn>
          </div>
        }
      />

      <Card>
        <h3 style={{ marginTop: 0, color: "#111827" }}>Add Certificate</h3>
        <p style={{ margin: "4px 0 16px", color: "#6b7280" }}>
          Store a certificate record that students can verify by ID.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Certificate Code</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="EEC-2025-001ABC"
                style={inputStyle}
                required
              />
              <Btn variant="secondary" onClick={(e) => { e.preventDefault(); generateCode(); }}>
                Auto-generate
              </Btn>
            </div>
          </div>

          <div style={gridTwoCols}>
            <FieldInput
              label="Certificate Number"
              value={form.certificateNumber}
              onChange={(e) => handleChange("certificateNumber", e.target.value)}
              placeholder="Internal number (optional)"
            />
            <FieldInput
              label="Student Name"
              value={form.studentName}
              onChange={(e) => handleChange("studentName", e.target.value)}
              required
            />
          </div>

          <div style={gridTwoCols}>
            <FieldInput
              label="Program / Track"
              value={form.program}
              onChange={(e) => handleChange("program", e.target.value)}
              placeholder="e.g., Career Guidance"
            />
            <FieldInput
              label="Advisor / Coach"
              value={form.advisor}
              onChange={(e) => handleChange("advisor", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div style={gridTwoCols}>
            <FieldInput
              label="Score"
              type="number"
              value={form.score}
              onChange={(e) => handleChange("score", e.target.value)}
              placeholder="Optional"
            />
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 600 }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                style={inputStyle}
                required
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Issued On</label>
            <input
              type="datetime-local"
              value={form.issuedAt}
              onChange={(e) => handleChange("issuedAt", e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={alertStyle("error")}>{error}</div>
          )}
          {success && (
            <div style={alertStyle("success")}>{success}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: saving ? "#c7d2fe" : "#4f46e5",
              color: "#fff",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Certificate"}
          </button>
        </form>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Recent Certificates</h3>
          <Btn variant="secondary" onClick={loadCertificates}>
            Refresh
          </Btn>
        </div>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading...</p>
        ) : formattedRecords.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No certificates yet.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Program</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Issued</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formattedRecords.map((record) => (
                  <tr key={record.id} style={tbodyRowStyle}>
                    <td style={tdStyle}>{record.code || record.certificate_number}</td>
                    <td style={tdStyle}>{record.student_name || "—"}</td>
                    <td style={tdStyle}>{record.program || "—"}</td>
                    <td style={tdStyle}>{statusBadge(record.status)}</td>
                    <td style={tdStyle}>{record.issuedLabel}</td>
                    <td style={tdStyle}>{record.score != null ? record.score : "—"}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        disabled={deletingId === record.id}
                        style={dangerButtonStyle}
                      >
                        {deletingId === record.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
};

const gridTwoCols = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
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

const dangerButtonStyle = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #ef4444",
  background: "#fee2e2",
  color: "#b91c1c",
  fontWeight: 600,
  cursor: "pointer",
};

const alertStyle = (type) => ({
  border: type === "error" ? "1px solid #fecaca" : "1px solid #bbf7d0",
  background: type === "error" ? "#fee2e2" : "#ecfdf5",
  borderRadius: 8,
  padding: "8px 12px",
  color: type === "error" ? "#b91c1c" : "#15803d",
});

function FieldInput({ label, value, onChange, placeholder, type = "text", required = false }) {
  FieldInput.propTypes = {
    label: PropTypes.node.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    type: PropTypes.string,
    required: PropTypes.bool,
  };

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
        required={required}
      />
    </label>
  );
}
