import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

export default function PeopleCard({ people, onNavigateHome }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>People</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {people.map((person) => (
          <div key={`${person.role}-${person.name}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{person.name}</div>
            <div style={{ color: "#6b7280" }}>{person.role}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Btn variant="back" onClick={onNavigateHome}>
          Back Home
        </Btn>
      </div>
    </Card>
  );
}

PeopleCard.propTypes = {
  people: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  onNavigateHome: PropTypes.func.isRequired,
};
