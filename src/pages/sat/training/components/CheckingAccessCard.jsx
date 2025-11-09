import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";

export default function CheckingAccessCard({ message = "Checking access..." }) {
  return (
    <Card>
      <p style={{ color: "#6b7280" }}>{message}</p>
    </Card>
  );
}

CheckingAccessCard.propTypes = {
  message: PropTypes.string,
};
