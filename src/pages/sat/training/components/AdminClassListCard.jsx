import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

export default function AdminClassListCard({
  classes,
  classesLoading,
  assignForm,
  knownEmails,
  loadingEmails,
  savingAssign,
  classDeleteBusy,
  onAssignChange,
  onSaveAssignment,
  onRefreshClasses,
  onSelectClass,
  onDeleteClass,
  onNavigateHome,
}) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0 }}>Your Classes</h3>
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          {classesLoading ? "Loading…" : `${classes.length} class${classes.length === 1 ? "" : "es"}`}
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          border: "1px dashed #dbeafe",
          borderRadius: 12,
          padding: 16,
          background: "#f8fafc",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Create or Assign a Class</div>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
              Add a student email and class name. New names create classes automatically.
            </p>
          </div>
          <Btn variant="secondary" onClick={onRefreshClasses} style={{ minWidth: 150 }} disabled={classesLoading}>
            {classesLoading ? "Refreshing…" : "Refresh list"}
          </Btn>
        </div>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Student Email</label>
            <input
              type="email"
              list="sat-training-email-options"
              placeholder="student@example.com"
              value={assignForm.email}
              onChange={(event) => onAssignChange("email", event.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Class Name</label>
            <input
              type="text"
              placeholder="e.g., Cohort A"
              value={assignForm.className}
              onChange={(event) => onAssignChange("className", event.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Btn variant="primary" onClick={onSaveAssignment} disabled={savingAssign} style={{ width: "100%" }}>
              {savingAssign ? "Saving…" : "Save Assignment"}
            </Btn>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {loadingEmails ? "Loading known student emails…" : "Suggestions appear as you type."}
        </div>
        <datalist id="sat-training-email-options">
          {knownEmails.map((email) => (
            <option key={email} value={email} />
          ))}
        </datalist>
      </div>
      {classes.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No classes found yet. Use the form above to create your first class.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {classes.map((cls) => {
            const canDelete = cls.name && cls.name !== "(Unassigned)";
            const busy = classDeleteBusy === cls.name;
            return (
              <div key={cls.name} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{cls.name}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{cls.count} student{cls.count === 1 ? "" : "s"}</div>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDeleteClass(cls.name)}
                      disabled={busy}
                      aria-label={`Delete ${cls.name}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#dc2626",
                        cursor: busy ? "not-allowed" : "pointer",
                        padding: 4,
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Btn variant="secondary" onClick={() => onSelectClass(cls.name)}>
                    Open
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <Btn variant="back" onClick={onNavigateHome}>
          Back Home
        </Btn>
      </div>
    </Card>
  );
}

AdminClassListCard.propTypes = {
  classes: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
  classesLoading: PropTypes.bool.isRequired,
  assignForm: PropTypes.shape({
    email: PropTypes.string,
    className: PropTypes.string,
  }).isRequired,
  knownEmails: PropTypes.arrayOf(PropTypes.string).isRequired,
  loadingEmails: PropTypes.bool.isRequired,
  savingAssign: PropTypes.bool.isRequired,
  classDeleteBusy: PropTypes.string.isRequired,
  onAssignChange: PropTypes.func.isRequired,
  onSaveAssignment: PropTypes.func.isRequired,
  onRefreshClasses: PropTypes.func.isRequired,
  onSelectClass: PropTypes.func.isRequired,
  onDeleteClass: PropTypes.func.isRequired,
  onNavigateHome: PropTypes.func.isRequired,
};
