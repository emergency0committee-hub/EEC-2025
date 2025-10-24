// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { supabase } from "../lib/db.js";

// Simple row render
function Row({ row, onOpen }) {
  const started = row?.attempts?.started_at
    ? new Date(row.attempts.started_at).toLocaleString()
    : "—";
  const finished = row?.attempts?.completed_at
    ? new Date(row.attempts.completed_at).toLocaleString()
    : "—";
  const top = Array.isArray(row.top_codes) ? row.top_codes.join(" • ") : "—";

  return (
    <div
      className="card"
      style={{
        padding: 12,
        display: "grid",
        gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Attempt ID</div>
        <div style={{ fontWeight: 600 }}>{row.attempt_id.slice(0, 8)}…</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Started</div>
        <div style={{ fontWeight: 600 }}>{started}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Finished</div>
        <div style={{ fontWeight: 600 }}>{finished}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Top Codes</div>
        <div style={{ fontWeight: 600 }}>{top}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <Btn variant="primary" onClick={() => onOpen(row)}>Open</Btn>
      </div>
    </div>
  );
}

export default function Admin({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Optional: limit how many to fetch initially
  const LIMIT = 50;

  // Initial fetch (latest first)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        // You must be signed in; otherwise RLS will hide everything
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrorMsg("You are not signed in. Start a test and complete email login first.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("results")
          .select(`
            attempt_id,
            top_codes,
            overall,
            created_at,
            attempts (
              started_at,
              completed_at,
              user_id
            )
          `)
          .order("created_at", { ascending: false })
          .limit(LIMIT);

        if (error) throw error;
        if (!isMounted) return;
        setRows(data || []);
      } catch (e) {
        console.error("[Admin] load error:", e);
        if (!isMounted) return;
        setErrorMsg(e.message || "Failed to load results.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Realtime subscription: listen for new results
  useEffect(() => {
    // Channel name can be anything scoped to this page
    const channel = supabase
      .channel("admin-results-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "results" },
        (payload) => {
          // When a new result arrives, fetch its joined attempt for display
          const newAttemptId = payload.new.attempt_id;
          // join to attempts so we can show started/completed time in the list
          supabase
            .from("results")
            .select(`
              attempt_id,
              top_codes,
              overall,
              created_at,
              attempts (
                started_at,
                completed_at,
                user_id
              )
            `)
            .eq("attempt_id", newAttemptId)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.warn("join fetch after realtime insert failed:", error.message);
                return;
              }
              // Prepend the new row
              setRows((prev) => {
                // prevent dup if already exists
                const exists = prev.some((r) => r.attempt_id === data.attempt_id);
                return exists ? prev : [data, ...prev].slice(0, LIMIT);
              });
            });
        }
      )
      .subscribe((status) => {
        // optional: console.log("realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onOpen = (row) => {
    // Navigate to Results page and show the charts using only what's available.
    // If you captured more props at test time, pass them here, too.
    onNavigate?.("results", {
      participant: {
        name: "",
        email: "",          // we didn’t include email in the join; keep blank or add via another query
        school: "",
        ts: row.created_at ? Date.parse(row.created_at) : undefined,
      },
      radarData: [],        // Results page can hydrate from Supabase if empty
      areaPercents: [],
      interestPercents: [],
      pillarAgg: undefined, // leave undefined; Results will try to compute/fallback
      pillarCounts: undefined,
      fromAdmin: true,
      showParticipantHeader: true,
    });
  };

  const headerRight = useMemo(() => (
    <div className="no-print" style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" onClick={() => onNavigate?.("home")}>Home</Btn>
    </div>
  ), [onNavigate]);

  return (
    <PageWrap>
      <HeaderBar title="Admin — Submissions (Live)" right={headerRight} />
      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          This list auto-updates when a new <b>results</b> row is inserted.
          Make sure you’re signed in, and (optionally) configure an admin-read policy if you need to see all users.
        </p>

        {errorMsg && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No submissions yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <Row key={r.attempt_id} row={r} onOpen={onOpen} />
            ))}
          </div>
        )}
      </Card>
    </PageWrap>
  );
}
