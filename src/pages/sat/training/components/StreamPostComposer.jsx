import React from "react";
import PropTypes from "prop-types";
import Btn from "../../../../components/Btn.jsx";
import { supabase } from "../../../../lib/supabase.js";

export default function StreamPostComposer({ className, userEmail, onPosted }) {
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const table = import.meta.env.VITE_CLASS_STREAM_TABLE || "cg_class_stream";
      const { error } = await supabase.from(table).insert({
        class_name: className,
        text: trimmed,
        author_email: userEmail,
      });
      if (error) throw error;
      setText("");
      if (onPosted) onPosted({ text: trimmed });
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to post message.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <textarea
        placeholder="Share an update with the class"
        value={text}
        onChange={(event) => setText(event.target.value)}
        style={{ flex: 1, minHeight: 60, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
      />
      <Btn variant="primary" onClick={submit} disabled={saving}>
        {saving ? "Posting…" : "Post"}
      </Btn>
    </div>
  );
}

StreamPostComposer.propTypes = {
  className: PropTypes.string.isRequired,
  userEmail: PropTypes.string,
  onPosted: PropTypes.func,
};

StreamPostComposer.defaultProps = {
  userEmail: "",
  onPosted: undefined,
};
