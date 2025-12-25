import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

export default function PeopleCard({
  people,
  onNavigateHome,
  className = "",
  canManage = false,
  knownEmails = [],
  onOpenBulkAdd = null,
  onAddStudent = null,
  addBusy = false,
}) {
  const [emailInput, setEmailInput] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const addDisabled = addBusy || localBusy;
  const showRosterTools = Boolean(canManage && className);

  const datalistId = useMemo(() => {
    const safe = String(className || "general")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `people_email_suggestions_${safe || "general"}`;
  }, [className]);
  const suggestions = useMemo(() => {
    if (!Array.isArray(knownEmails) || knownEmails.length === 0) return [];
    return knownEmails
      .map((entry) => (typeof entry === "string" ? { email: entry, name: "" } : entry))
      .map((entry) => ({
        email: String(entry?.email || "").trim(),
        name: String(entry?.name || "").trim(),
      }))
      .filter((entry) => entry.email);
  }, [knownEmails]);

  const handleAdd = async () => {
    if (!onAddStudent) return;
    const email = String(emailInput || "").trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Enter a valid student email.");
      return;
    }
    try {
      setLocalBusy(true);
      await onAddStudent(email);
      setEmailInput("");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to add student.");
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>People</h3>
      {showRosterTools && (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
            background: "#f8fafc",
            marginBottom: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>Manage roster: {className}</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Add student email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="student@example.com"
                list={suggestions.length ? datalistId : undefined}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  outline: "none",
                }}
                disabled={addDisabled}
              />
              {suggestions.length > 0 && (
                <datalist id={datalistId}>
                  {suggestions.map((entry) => (
                    <option key={entry.email} value={entry.email}>
                      {entry.name}
                    </option>
                  ))}
                </datalist>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="primary" onClick={handleAdd} disabled={addDisabled || !onAddStudent} style={{ minWidth: 140 }}>
                {addDisabled ? "Adding..." : "Add"}
              </Btn>
              {onOpenBulkAdd && (
                <Btn variant="secondary" onClick={onOpenBulkAdd} disabled={addDisabled} style={{ minWidth: 160 }}>
                  Bulk add
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {people.map((person) => (
          <div key={`${person.email || ""}-${person.role}-${person.name}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{person.name}</div>
            <div style={{ color: "#6b7280" }}>{person.role}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Btn variant="back" onClick={onNavigateHome}>
          Back Home
        </Btn>
      </div>
    </Card>
  );
}

PeopleCard.propTypes = {
  people: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string,
    })
  ).isRequired,
  onNavigateHome: PropTypes.func.isRequired,
  className: PropTypes.string,
  canManage: PropTypes.bool,
  knownEmails: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        email: PropTypes.string.isRequired,
        name: PropTypes.string,
        school: PropTypes.string,
      }),
    ])
  ),
  onOpenBulkAdd: PropTypes.func,
  onAddStudent: PropTypes.func,
  addBusy: PropTypes.bool,
};
