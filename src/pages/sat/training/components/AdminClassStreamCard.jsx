import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import ClassStreamList from "./ClassStreamList.jsx";
import StreamPostComposer from "./StreamPostComposer.jsx";

export default function AdminClassStreamCard({ className, refreshKey, onRefresh, userEmail }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Class Stream</h3>
      <p style={{ color: "#6b7280", marginTop: 4 }}>Chat with {className}.</p>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          maxHeight: 260,
          overflowY: "auto",
          marginBottom: 12,
        }}
      >
        <ClassStreamList className={className} refreshKey={refreshKey} />
      </div>
      <StreamPostComposer className={className} userEmail={userEmail} onPosted={onRefresh} />
    </Card>
  );
}

AdminClassStreamCard.propTypes = {
  className: PropTypes.string.isRequired,
  refreshKey: PropTypes.number.isRequired,
  onRefresh: PropTypes.func.isRequired,
  userEmail: PropTypes.string,
};

AdminClassStreamCard.defaultProps = {
  userEmail: "",
};
