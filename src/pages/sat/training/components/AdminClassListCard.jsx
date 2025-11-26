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
  onOpenBulkAssign,
  onRefreshClasses,
  onSelectClass,
  onDeleteClass,
  onNavigateHome,
}) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Your Classes</h3>
          <span
            style={{
              fontSize: 12,
              color: "#0f172a",
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {classesLoading ? "Loading…" : `${classes.length} class${classes.length === 1 ? "" : "es"}`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={onRefreshClasses} style={{ minWidth: 140 }} disabled={classesLoading}>
            {classesLoading ? "Refreshing…" : "Refresh"}
          </Btn>
          <Btn variant="primary" onClick={onOpenBulkAssign} style={{ minWidth: 160 }}>
            Bulk add students
          </Btn>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
          background: "#f8fafc",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>Create or Assign a Class</div>
        <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
          Use <b>Bulk add students</b> to paste multiple emails and assign them to a class. New class names are created automatically.
        </p>
      </div>
      {classes.length === 0 ? (
        <p style={{ color: "#6b7280", marginTop: 12 }}>
          No classes found yet. Use bulk add to create your first class and roster.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
          {classes.map((cls) => {
            const canDelete = cls.name && cls.name !== "(Unassigned)";
            const busy = classDeleteBusy === cls.name;
            return (
              <div
                key={cls.name}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                  boxShadow: "0 2px 6px rgba(15,23,42,0.05)",
                  display: "grid",
                  gap: 8,
                }}
              >
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
  knownEmails: PropTypes.arrayOf(
    PropTypes.shape({
      email: PropTypes.string.isRequired,
      name: PropTypes.string,
      school: PropTypes.string,
    })
  ).isRequired,
  loadingEmails: PropTypes.bool.isRequired,
  savingAssign: PropTypes.bool.isRequired,
  classDeleteBusy: PropTypes.string.isRequired,
  onOpenBulkAssign: PropTypes.func.isRequired,
  onAssignChange: PropTypes.func.isRequired,
  onSaveAssignment: PropTypes.func.isRequired,
  onRefreshClasses: PropTypes.func.isRequired,
  onSelectClass: PropTypes.func.isRequired,
  onDeleteClass: PropTypes.func.isRequired,
  onNavigateHome: PropTypes.func.isRequired,
};
