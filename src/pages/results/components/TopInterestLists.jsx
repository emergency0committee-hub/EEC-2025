import React from "react";
import PropTypes from "prop-types";
import ListBox from "./ListBox.jsx";

export default function TopInterestLists({ topFive, leastThree }) {
  return (
    <div className="section avoid-break">
      <div
        className="print-stack"
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 16,
        }}
      >
        <ListBox title="Your Top Five Interest Areas" items={topFive} />
        <ListBox title="Areas of Least Interest" items={leastThree} />
      </div>
    </div>
  );
}

TopInterestLists.propTypes = {
  topFive: PropTypes.array,
  leastThree: PropTypes.array,
};

TopInterestLists.defaultProps = {
  topFive: [],
  leastThree: [],
};
