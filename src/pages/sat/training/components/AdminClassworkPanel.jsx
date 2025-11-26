import React from "react";
import PropTypes from "prop-types";
import AdminClassListCard from "./AdminClassListCard.jsx";
import AdminClassDetail from "./AdminClassDetail.jsx";

export default function AdminClassworkPanel({ selectedClass = "", classListProps, classDetailProps }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!selectedClass ? (
        <AdminClassListCard {...classListProps} />
      ) : (
        <AdminClassDetail {...classDetailProps} />
      )}
    </div>
  );
}

AdminClassworkPanel.propTypes = {
  selectedClass: PropTypes.string,
  classListProps: PropTypes.object.isRequired,
  classDetailProps: PropTypes.object.isRequired,
};
