import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import ClassStreamList from "./ClassStreamList.jsx";
import StreamPostComposer from "./StreamPostComposer.jsx";

export default function StudentClassChatCard({ className, refreshKey, onRefresh, userEmail }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Class Chat</h3>
      {className ? (
        <>
          <p style={{ color: "#6b7280", marginTop: 4 }}>Chat with classmates in {className}.</p>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              maxHeight: 240,
              overflowY: "auto",
              marginBottom: 12,
            }}
          >
            <ClassStreamList className={className} refreshKey={refreshKey} />
          </div>
          <StreamPostComposer className={className} userEmail={userEmail} onPosted={onRefresh} />
        </>
      ) : (
        <p style={{ color: "#6b7280" }}>Join a class to start chatting.</p>
      )}
    </Card>
  );
}

StudentClassChatCard.propTypes = {
  className: PropTypes.string,
  refreshKey: PropTypes.number.isRequired,
  onRefresh: PropTypes.func.isRequired,
  userEmail: PropTypes.string,
};

StudentClassChatCard.defaultProps = {
  className: "",
  userEmail: "",
};
