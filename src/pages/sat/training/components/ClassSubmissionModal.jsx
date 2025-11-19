import PropTypes from "prop-types";

export default function ClassSubmissionModal({ log, onClose, fmtDate, fmtDuration, resolveQuestionText }) {
  if (!log) return null;

  const metrics = log.metrics || {};
  const choices = metrics.choices || {};
  const correct = metrics.correct || {};
  const times = metrics.times || {};
  const questionKeys = Object.keys(choices || {});
  const storedQuestionTexts =
    (log.answers && (log.answers.questionTexts || log.answers.question_texts)) ||
    (log.metrics && (log.metrics.questionTexts || log.metrics.question_texts)) ||
    {};
  const getQuestionText = (key) => {
    if (!key) return "";
    const direct = storedQuestionTexts[key];
    if (direct) return direct;
    if (typeof resolveQuestionText === "function") {
      return resolveQuestionText(log, key) || "";
    }
    return "";
  };

  const summaryCards = [];
  const addSummaryCard = (label, data) => {
    if (!data) return;
    const total = data.total || 0;
    const right = data.correct || 0;
    const percent = total ? Math.round((right / total) * 100) : null;
    summaryCards.push({ label, total, right, percent });
  };

  addSummaryCard("Reading & Writing", log.summary?.rw);
  addSummaryCard("Math", log.summary?.math);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          width: "min(820px, 94vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Submission Details</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#6b7280", display: "grid", gap: 4 }}>
          <div><strong>Student:</strong> {log.user_email || "�"}</div>
          <div>
            <strong>Section:</strong> {log.section || "�"} &nbsp;�&nbsp;
            <strong>Unit:</strong> {log.unit || "�"} &nbsp;�&nbsp;
            <strong>Lesson:</strong> {log.lesson || "�"}
          </div>
          <div>
            <strong>Date:</strong> {fmtDate(log.ts)} &nbsp;�&nbsp;
            <strong>Time:</strong> {fmtDate(log.ts, true)}
          </div>
          <div><strong>Duration:</strong> {fmtDuration(Number(log.elapsed_sec || 0))}</div>
        </div>

        {summaryCards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            {summaryCards.map((card) => (
              <div key={card.label} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#f9fafb" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
                  {card.right}/{card.total}
                </div>
                <div style={{ color: "#6b7280", marginTop: 2 }}>
                  {card.percent == null ? "No data" : `${card.percent}% correct`}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(metrics).length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <h4 style={{ marginTop: 0 }}>Metrics</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#6b7280" }}>
              {Object.entries(metrics)
                .filter(([key]) => !["choices", "correct", "times"].includes(key))
                .map(([key, value]) => (
                  <div key={key} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", background: "#f9fafb" }}>
                    <strong style={{ textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</strong>: {typeof value === "number" ? Math.round(value * 100) / 100 : String(value)}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Question Breakdown</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Question</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Answer</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Result</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {!questionKeys.length ? (
                  <tr>
                    <td style={{ padding: 8, color: "#6b7280" }} colSpan={4}>
                      No per-question data available.
                    </td>
                  </tr>
                ) : (
                  questionKeys.map((key) => {
                    const chosen = choices[key];
                    const answer = correct[key];
                    const isCorrect =
                      chosen != null &&
                      answer != null &&
                      String(chosen).trim().toLowerCase() === String(answer).trim().toLowerCase();
                    return (
                      <tr key={key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8 }}>
                          {(() => {
                            const text = getQuestionText(String(key));
                            if (!text) return key;
                            return (
                              <>
                                <div style={{ fontWeight: 600, color: "#111827" }}>{text}</div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {key}</div>
                              </>
                            );
                          })()}
                        </td>
                        <td style={{ padding: 8 }}>{chosen ?? "�"}</td>
                        <td
                          style={{
                            padding: 8,
                            color: chosen == null || answer == null ? "#6b7280" : isCorrect ? "#16a34a" : "#ef4444",
                          }}
                        >
                          {chosen == null || answer == null
                            ? "�"
                            : isCorrect
                            ? "Correct"
                            : `Wrong (Ans: ${answer})`}
                        </td>
                        <td style={{ padding: 8 }}>{fmtDuration(Number(times[key] || 0))}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

ClassSubmissionModal.propTypes = {
  log: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  fmtDate: PropTypes.func.isRequired,
  fmtDuration: PropTypes.func.isRequired,
  resolveQuestionText: PropTypes.func,
};

ClassSubmissionModal.defaultProps = {
  log: null,
  resolveQuestionText: null,
};
