import React, { useState } from "react";
import PropTypes from "prop-types";
import { renderMathText } from "../../../../lib/mathText.jsx";
import { sanitizeRichTextHtml } from "../../../../lib/richText.js";
import ModalPortal from "../../../../components/ModalPortal.jsx";

export default function ClassSubmissionModal({ log, onClose, fmtDate, fmtDuration, resolveQuestionText, resolveQuestionData }) {
  if (!log) return null;
  const [viewKey, setViewKey] = useState(null);

  const metrics = log.metrics || {};
  const answersPayload = log.answers || {};
  const choices = metrics.choices || answersPayload.choices || {};
  const correct = metrics.correct || answersPayload.correct || {};
  const times = metrics.times || answersPayload.times || {};
  const storedQuestionTexts =
    (answersPayload.questionTexts || answersPayload.question_texts) ||
    (metrics.questionTexts || metrics.question_texts) ||
    {};

  const questionKeySet = new Set([
    ...Object.keys(choices || {}),
    ...Object.keys(correct || {}),
    ...Object.keys(times || {}),
    ...Object.keys(storedQuestionTexts || {}),
  ]);
  const questionKeys = Array.from(questionKeySet);

  const getQuestionText = (key) => {
    if (!key) return "";
    if (typeof resolveQuestionText === "function") {
      const resolved = resolveQuestionText(log, key);
      if (resolved) return resolved;
    }
    const direct = storedQuestionTexts[key];
    if (direct) return direct;
    return "";
  };
  const getQuestionData = (key) => {
    if (typeof resolveQuestionData === "function") {
      const data = resolveQuestionData(log, key);
      if (data) return data;
    }
    return { text: getQuestionText(key), choices: [] };
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
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.78)",
          zIndex: 2000,
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
          <div><strong>Student:</strong> {log.user_email || "-"}</div>
          <div>
            <strong>Section:</strong> {log.section || "-"} &nbsp;•&nbsp;
            <strong>Unit:</strong> {log.unit || "-"} &nbsp;•&nbsp;
            <strong>Lesson:</strong> {log.lesson || "-"}
          </div>
          <div>
            <strong>Date:</strong> {fmtDate(log.ts)} &nbsp;•&nbsp;
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
                .filter(([key]) => !["choices", "correct", "times", "questionTexts", "question_texts"].includes(key))
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
          <div style={{ overflowX: "auto", maxHeight: "420px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: viewKey ? 16 : 0 }}>
            {viewKey ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>Question {questionKeys.indexOf(viewKey) + 1}</div>
                  <button
                    type="button"
                    onClick={() => setViewKey(null)}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
                  >
                    Back to table
                  </button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ marginBottom: 2, color: "#6b7280", fontSize: 13 }}>
                    Question preview (matches test view)
                  </div>
                  <div style={{ color: "#111827", lineHeight: 1.5, fontWeight: 500, fontSize: 14 }}>
                    {(() => {
                      const data = getQuestionData(viewKey);
                      const text = data?.text || "";
                      const questionHasImg = /<img[^>]+src=/i.test(text || "");
                      if (questionHasImg) {
                        return (
                          <div
                            style={{ overflowX: "auto" }}
                            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(text || "") }}
                          />
                        );
                      }
                      const hasHtml = /<\s*(p|div|table|ul|ol|li|span|br|figure|figcaption|mark|strong|em)/i.test(text || "");
                      if (hasHtml) {
                        return (
                          <div
                            style={{ overflowX: "auto" }}
                            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(text || "") }}
                          />
                        );
                      }
                      return renderMathText(text || "", true);
                    })()}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                      <strong style={{ color: "#6b7280", marginRight: 6 }}>Your answer:</strong>
                      <span style={{ color: "#111827" }}>
                        {(() => {
                          const chosen = choices[viewKey];
                          return chosen == null || chosen === "" ? "Unanswered" : chosen;
                        })()}
                      </span>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                      <strong style={{ color: "#6b7280", marginRight: 6 }}>Correct:</strong>
                      <span style={{ color: "#111827" }}>{correct[viewKey] ?? "-"}</span>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                      <strong style={{ color: "#6b7280", marginRight: 6 }}>Time:</strong>
                      <span style={{ color: "#111827" }}>{fmtDuration(Number(times[viewKey] || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>Question</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Answer</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Result</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Time</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Manage</th>
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
                    questionKeys.map((key, idx) => {
                      const chosen = choices[key];
                      const answer = correct[key];
                      const isCorrect =
                        chosen != null &&
                        answer != null &&
                        String(chosen).trim().toLowerCase() === String(answer).trim().toLowerCase();
                      const fullText = getQuestionText(String(key));
                      return (
                        <tr key={key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: 8, fontWeight: 700, color: "#111827" }}>{idx + 1}</td>
                          <td style={{ padding: 8 }}>{chosen == null || chosen === "" ? "Unanswered" : chosen}</td>
                          <td
                            style={{
                              padding: 8,
                              color: chosen == null || answer == null ? "#ef4444" : isCorrect ? "#16a34a" : "#ef4444",
                            }}
                          >
                            {chosen == null || chosen === ""
                              ? `Wrong (Ans: ${answer ?? "-"})`
                              : answer == null
                              ? `Wrong (Ans: ${answer ?? "-"})`
                              : isCorrect
                              ? "Correct"
                              : `Wrong (Ans: ${answer})`}
                          </td>
                          <td style={{ padding: 8 }}>{fmtDuration(Number(times[key] || 0))}</td>
                          <td style={{ padding: 8 }}>
                            {fullText ? (
                              <button
                                type="button"
                                onClick={() => setViewKey(key)}
                                style={{ padding: "6px 10px", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, color: "#3730a3", cursor: "pointer" }}
                              >
                                View question
                              </button>
                            ) : (
                              <span style={{ color: "#6b7280" }}>No text</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}

ClassSubmissionModal.propTypes = {
  log: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  fmtDate: PropTypes.func.isRequired,
  fmtDuration: PropTypes.func.isRequired,
  resolveQuestionText: PropTypes.func,
  resolveQuestionData: PropTypes.func,
};

ClassSubmissionModal.defaultProps = {
  log: null,
  resolveQuestionText: null,
  resolveQuestionData: null,
};
