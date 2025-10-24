// src/components/NewsFeed.jsx
import React from "react";
import { Card } from "./Layout.jsx";
import Btn from "./Btn.jsx";

function NewsItem({ item }) {
  const { title, date, summary, href, tag } = item;
  return (
    <div
      style={{
        padding: "10px 0",
        borderBottom: "1px solid #f3f4f6",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "start",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {tag && (
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#eef2ff",
                color: "#4f46e5",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {new Date(date).toLocaleDateString()}
          </span>
        </div>

        <h4 style={{ margin: "0 0 4px", color: "#111827" }}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#111827", textDecoration: "none" }}
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h4>

        {summary && (
          <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.5 }}>{summary}</p>
        )}
      </div>

      {href && (
        <div>
          <Btn
            variant="secondary"
            onClick={() => window.open(href, "_blank", "noopener")}
            style={{ whiteSpace: "nowrap" }}
          >
            Read
          </Btn>
        </div>
      )}
    </div>
  );
}

export default function NewsFeed({ items = [], title = "News & Updates", max = 6 }) {
  const list = Array.isArray(items) ? items.slice(0, max) : [];
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0, color: "#111827" }}>{title}</h3>
        {/* Placeholder for future filter or RSS toggle */}
      </div>

      {list.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: 14 }}>
          No news yet. Check back soon.
        </div>
      ) : (
        <div>
          {list.map((item, i) => (
            <NewsItem key={i} item={item} />
          ))}
        </div>
      )}
    </Card>
  );
}
