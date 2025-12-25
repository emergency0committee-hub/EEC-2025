import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../components/Btn.jsx";
import StreamAnnouncementCard from "./StreamAnnouncementCard.jsx";
import StudentClassChatCard from "./StudentClassChatCard.jsx";
import StudentClassworkPanel from "./StudentClassworkPanel.jsx";
import StudentResourceCard from "./StudentResourceCard.jsx";
import PeopleCard from "./PeopleCard.jsx";

const STUDENT_TABS = [
  { id: "stream", label: "Stream" },
  { id: "live", label: "Live" },
  { id: "classwork", label: "Classwork" },
  { id: "lessons", label: "Resources" },
  { id: "people", label: "People" },
];

export default function StudentTabsPanel({
  tab,
  setTab,
  streamPosts,
  studentClass,
  studentChatRefresh,
  onRefreshChat,
  userEmail,
  onNavigateHome,
  liveActive,
  renderLiveTab,
  studentResLoading,
  resourceGroupOrder,
  groupedStudentResources,
  hasAnyStudentResource,
  renderResourceCard,
  people,
}) {
  const renderLessonsTab = () => (
    <StudentClassworkPanel
      isLoading={studentResLoading}
      resourceGroupOrder={[{ key: "lesson", title: "Resources", subtitle: "PDF lessons or readings shared by your teacher." }]}
      groupedResources={groupedStudentResources}
      renderResourceCard={(resource) => renderResourceCard(resource)}
      hasAnyResource={(groupedStudentResources.lesson || []).length > 0}
      onBackHome={onNavigateHome}
    />
  );

  const renderStreamTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {streamPosts.map((post) => (
        <StreamAnnouncementCard key={post.id} title={post.title} timestamp={post.ts} body={post.body} />
      ))}
      <StudentClassChatCard
        className={studentClass}
        refreshKey={studentChatRefresh}
        userEmail={userEmail}
        onRefresh={onRefreshChat}
      />
      <div>
        <Btn variant="back" onClick={onNavigateHome}>Back Home</Btn>
      </div>
    </div>
  );

  const renderPeopleTab = () => <PeopleCard people={people} onNavigateHome={onNavigateHome} />;

  return (
    <div>
      <div
        style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
          color: "#fff",
          padding: 20,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>SAT Training</div>
        <div style={{ opacity: 0.9 }}>Practice by section and skill</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {STUDENT_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                border: "none",
                background: tab === id ? "#111827" : "#fff",
                color: tab === id ? "#fff" : "#374151",
                borderRadius: 999,
                padding: "8px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{label}</span>
              {id === "live" && liveActive && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#fff",
                  }}
                >
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "stream" && renderStreamTab()}

      {tab === "live" && renderLiveTab && renderLiveTab()}

      {tab === "classwork" && (
        <StudentClassworkPanel
          isLoading={studentResLoading}
          resourceGroupOrder={resourceGroupOrder}
          groupedResources={groupedStudentResources}
          renderResourceCard={(resource) => renderResourceCard(resource)}
          hasAnyResource={hasAnyStudentResource}
          onBackHome={onNavigateHome}
        />
      )}

      {tab === "lessons" && renderLessonsTab()}

      {tab === "people" && renderPeopleTab()}
    </div>
  );
}

StudentTabsPanel.propTypes = {
  tab: PropTypes.string.isRequired,
  setTab: PropTypes.func.isRequired,
  streamPosts: PropTypes.arrayOf(PropTypes.object).isRequired,
  studentClass: PropTypes.string.isRequired,
  studentChatRefresh: PropTypes.number.isRequired,
  onRefreshChat: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired,
  onNavigateHome: PropTypes.func.isRequired,
  liveActive: PropTypes.bool,
  renderLiveTab: PropTypes.func.isRequired,
  studentResLoading: PropTypes.bool.isRequired,
  resourceGroupOrder: PropTypes.array.isRequired,
  groupedStudentResources: PropTypes.object.isRequired,
  hasAnyStudentResource: PropTypes.bool.isRequired,
  renderResourceCard: PropTypes.func.isRequired,
  people: PropTypes.array.isRequired,
};

StudentTabsPanel.defaultProps = {
  liveActive: false,
};
