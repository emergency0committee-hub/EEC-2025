import React from "react";
import PropTypes from "prop-types";
import { supabase } from "../../../../lib/supabase.js";

export default function ClassStreamList({ className, refreshKey }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const table = import.meta.env.VITE_CLASS_STREAM_TABLE || "cg_class_stream";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("class_name", className)
          .order("ts", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!cancelled) setItems(data || []);
      } catch (err) {
        console.warn(err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [className, refreshKey]);

  if (loading) return <div style={{ color: "#6b7280" }}>Loading stream…</div>;
  if (!items.length) return <div style={{ color: "#6b7280" }}>No posts yet.</div>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((post) => (
        <div key={post.id || post.ts} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 700 }}>{post.author_email || "Teacher"}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>
              {post.ts ? new Date(post.ts).toLocaleString() : ""}
            </div>
          </div>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{post.text}</div>
        </div>
      ))}
    </div>
  );
}

ClassStreamList.propTypes = {
  className: PropTypes.string.isRequired,
  refreshKey: PropTypes.number,
};

ClassStreamList.defaultProps = {
  refreshKey: 0,
};
