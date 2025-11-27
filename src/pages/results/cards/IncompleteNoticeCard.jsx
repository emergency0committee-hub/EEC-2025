import React from "react";
import { Card } from "../../../components/Layout.jsx";

const IncompleteNoticeCard = () => (
  <Card style={{ marginTop: 16 }}>
    <h3 style={{ marginTop: 0, marginBottom: 6, color: "#b91c1c" }}>Result marked INCOMPLETE</h3>
    <p style={{ margin: 0, color: "#6b7280" }}>
      This submission is marked incomplete because it was completed in under 30 minutes with fewer than 80% of the answers. Please retake the
      assessment under normal conditions.
    </p>
  </Card>
);

export default IncompleteNoticeCard;
