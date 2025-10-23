// src/pages/NotFound.jsx
import React from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function NotFound({ onNavigate }) {
  return (
    <PageWrap>
      <HeaderBar title="Career Guidance" right={null} />
      <Card style={{ textAlign: "center", padding: "48px 28px" }}>
        <h2 style={{ marginTop: 0, color: "#111827" }}>404 – Page Not Found</h2>
        <p style={{ color: "#6b7280", marginTop: 12 }}>
          Sorry, the page you’re looking for doesn’t exist or has been moved.
        </p>

        <div style={{ marginTop: 24 }}>
          <Btn variant="primary" onClick={() => onNavigate("home")}>
            Back to Home
          </Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
