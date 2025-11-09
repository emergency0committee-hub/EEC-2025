import React from "react";
import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

export default function StudentClassworkPanel({
  isLoading,
  resourceGroupOrder,
  groupedResources,
  renderResourceCard,
  hasAnyResource,
  onBackHome,
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isLoading ? (
        <Card>
          <p style={{ color: "#6b7280" }}>Loading assignments...</p>
        </Card>
      ) : (
        <>
          {resourceGroupOrder.map((group) => {
            const list = groupedResources[group.key] || [];
            if (!list.length) return null;
            return (
              <Card key={group.key}>
                <h3 style={{ marginTop: 0 }}>{group.title}</h3>
                {group.subtitle && <p style={{ color: "#6b7280", marginTop: 4 }}>{group.subtitle}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                  {list.map((resource) => renderResourceCard(resource))}
                </div>
              </Card>
            );
          })}
          {!hasAnyResource && (
            <Card>
              <p style={{ color: "#6b7280" }}>No assignments yet. Check back soon!</p>
            </Card>
          )}
        </>
      )}

      <div>
        <Btn variant="back" onClick={onBackHome}>
          Back Home
        </Btn>
      </div>
    </div>
  );
}

StudentClassworkPanel.propTypes = {
  isLoading: PropTypes.bool,
  resourceGroupOrder: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string,
    }),
  ).isRequired,
  groupedResources: PropTypes.shape({
    exam: PropTypes.array,
    quiz: PropTypes.array,
    classwork: PropTypes.array,
    homework: PropTypes.array,
    other: PropTypes.array,
  }).isRequired,
  renderResourceCard: PropTypes.func.isRequired,
  hasAnyResource: PropTypes.bool,
  onBackHome: PropTypes.func.isRequired,
};

StudentClassworkPanel.defaultProps = {
  isLoading: false,
  hasAnyResource: false,
};
