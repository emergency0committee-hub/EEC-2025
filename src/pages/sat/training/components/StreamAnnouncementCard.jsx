import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";

export default function StreamAnnouncementCard({ title, timestamp, body }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <div style={{ color: "#6b7280", fontSize: 12 }}>{timestamp}</div>
      </div>
      <p style={{ color: "#374151" }}>{body}</p>
    </Card>
  );
}

StreamAnnouncementCard.propTypes = {
  title: PropTypes.string.isRequired,
  timestamp: PropTypes.string,
  body: PropTypes.string,
};

StreamAnnouncementCard.defaultProps = {
  timestamp: "",
  body: "",
};
