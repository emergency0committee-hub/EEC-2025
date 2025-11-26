import React from "react";
import PropTypes from "prop-types";
import AdminClassStreamCard from "./AdminClassStreamCard.jsx";
import AdminClassworkPanel from "./AdminClassworkPanel.jsx";

const TAB_LABELS = [
  { id: "stream", label: "Stream" },
  { id: "classwork", label: "Classwork" },
  { id: "people", label: "People" },
];

export default function AdminTabsPanel({
  selectedClass = "",
  adminViewTab,
  onChangeTab,
  adminChatRefresh,
  onRefreshStream,
  userEmail,
  renderPeopleTab,
  classworkPanelProps,
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {selectedClass && (
        <div style={{ marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "6px 12px",
                cursor: "pointer",
                background: adminViewTab === id ? "#111827" : "#fff",
                color: adminViewTab === id ? "#fff" : "#374151",
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {adminViewTab === "stream" && selectedClass && (
        <div style={{ display: "grid", gap: 12 }}>
          <AdminClassStreamCard
            className={selectedClass}
            refreshKey={adminChatRefresh}
            userEmail={userEmail}
            onRefresh={onRefreshStream}
          />
        </div>
      )}

      {adminViewTab === "people" && renderPeopleTab()}

      {adminViewTab === "classwork" && (
        <AdminClassworkPanel
          selectedClass={selectedClass}
          classListProps={classworkPanelProps.classListProps}
          classDetailProps={classworkPanelProps.classDetailProps}
        />
      )}
    </div>
  );
}

AdminTabsPanel.propTypes = {
  selectedClass: PropTypes.string,
  adminViewTab: PropTypes.oneOf(["stream", "classwork", "people"]).isRequired,
  onChangeTab: PropTypes.func.isRequired,
  adminChatRefresh: PropTypes.number.isRequired,
  onRefreshStream: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired,
  renderPeopleTab: PropTypes.func.isRequired,
  classworkPanelProps: PropTypes.shape({
    classListProps: PropTypes.object.isRequired,
    classDetailProps: PropTypes.object.isRequired,
  }).isRequired,
};
