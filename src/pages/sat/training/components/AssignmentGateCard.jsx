import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

export default function AssignmentGateCard({ userEmail, onNavigateHome, onNavigateLogin }) {
  const isLoggedIn = Boolean(userEmail);
  return (
    <Card>
      {isLoggedIn ? (
        <>
          <p style={{ color: "#6b7280" }}>Your administrator needs to assign you a class before you can use SAT Training.</p>
          <p style={{ color: "#9ca3af", fontSize: 12 }}>
            Ask your admin to assign a class to {userEmail} in the Admin dashboard.
          </p>
        </>
      ) : (
        <>
          <p style={{ color: "#6b7280" }}>You need to sign in to access SAT Training.</p>
          <Btn variant="primary" onClick={onNavigateLogin}>
            Go to Login
          </Btn>
        </>
      )}
      <div style={{ marginTop: 12 }}>
        <Btn variant="back" onClick={onNavigateHome}>
          Back Home
        </Btn>
      </div>
    </Card>
  );
}

AssignmentGateCard.propTypes = {
  userEmail: PropTypes.string,
  onNavigateHome: PropTypes.func.isRequired,
  onNavigateLogin: PropTypes.func.isRequired,
};

AssignmentGateCard.defaultProps = {
  userEmail: "",
};
