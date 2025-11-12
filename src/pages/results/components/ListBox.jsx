import React from "react";
import PropTypes from "prop-types";

export default function ListBox({ title, items }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="card avoid-break" style={{ padding: 16 }}>
      <h4 style={{ margin: 0, color: "#111827" }}>{title}</h4>
      <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: "#374151" }}>
        {safeItems.map((item, idx) => (
          <li key={idx} style={{ margin: "4px 0" }}>
            <span style={{ fontWeight: 600 }}>{item.area}</span>{" "}
            <span style={{ color: "#6b7280" }}>
              ({Math.round(Number(item.percent) || 0)}%)
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

ListBox.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      area: PropTypes.string,
      percent: PropTypes.number,
    })
  ),
};

ListBox.defaultProps = {
  items: [],
};
