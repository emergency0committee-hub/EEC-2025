// src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { supabase } from "../lib/supabase.js";
import { routeHref } from "../lib/routes.js";

const MESSAGES_TABLE = import.meta.env.VITE_INTERNAL_MESSAGES_TABLE || "cg_internal_messages";
const READS_TABLE = import.meta.env.VITE_INTERNAL_MESSAGE_READS_TABLE || "cg_internal_message_reads";
const AI_REQUESTS_TABLE = import.meta.env.VITE_AI_ACCESS_REQUESTS_TABLE || "cg_ai_access_requests";
const RECENT_LIMIT = 5;

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

export default function NotificationBell({ onNavigate, style = {} }) {
  NotificationBell.propTypes = {
    onNavigate: PropTypes.func,
    style: PropTypes.object,
  };

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const role = (currentUser?.role || "").toLowerCase();
  const allowed = role === "admin" || role === "administrator" || role === "staff";
  const canSeeAiRequests = role === "admin" || role === "administrator";

  const [authUser, setAuthUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const lastReadRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthUser(data?.user || null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!allowed) return undefined;
    const onDoc = (event) => {
      if (!open) return;
      const target = event.target;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, allowed]);

  const userId = authUser?.id;

  const dispatchReadEvent = (iso) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("cg-internal-read", { detail: iso }));
  };

  const markRead = async () => {
    if (!userId) return;
    const iso = new Date().toISOString();
    lastReadRef.current = iso;
    setUnreadCount(0);
    try {
      await supabase.from(READS_TABLE).upsert(
        { user_id: userId, last_read_at: iso },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.error(err);
    }
    dispatchReadEvent(iso);
  };

  const navigateToMessages = (event) => {
    if (onNavigate) {
      onNavigate("internal-comms", null, event);
      return;
    }
    if (event?.preventDefault) event.preventDefault();
    const href = routeHref("internal-comms");
    window.history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!allowed || !userId) return undefined;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: readRow } = await supabase
          .from(READS_TABLE)
          .select("last_read_at")
          .eq("user_id", userId)
          .maybeSingle();
        let lastRead = readRow?.last_read_at || null;
        if (!lastRead) {
          lastRead = new Date().toISOString();
          await supabase.from(READS_TABLE).upsert(
            { user_id: userId, last_read_at: lastRead },
            { onConflict: "user_id" }
          );
        }
        lastReadRef.current = lastRead;
        const { count } = await supabase
          .from(MESSAGES_TABLE)
          .select("id", { count: "exact", head: true })
          .gt("created_at", lastRead)
          .neq("created_by", userId)
          .or(`message_type.eq.team,recipient_id.eq.${userId}`);
        let requestCount = 0;
        let recentRequestRows = [];
        if (canSeeAiRequests) {
          const { count: requestCountRaw, error: requestCountError } = await supabase
            .from(AI_REQUESTS_TABLE)
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .gt("created_at", lastRead);
          if (requestCountError) throw requestCountError;
          requestCount = requestCountRaw || 0;
          const { data: requestRows, error: requestError } = await supabase
            .from(AI_REQUESTS_TABLE)
            .select("id, created_at, requested_by, requested_by_email, requested_by_name, status")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(RECENT_LIMIT);
          if (requestError) throw requestError;
          recentRequestRows = requestRows || [];
        }
        const { data: recentRows, error: recentError } = await supabase
          .from(MESSAGES_TABLE)
          .select(
            "id, body, created_at, created_by, created_by_email, created_by_name, message_type, recipient_id, recipient_name, recipient_email"
          )
          .order("created_at", { ascending: false })
          .or(`message_type.eq.team,recipient_id.eq.${userId}`)
          .limit(RECENT_LIMIT);
        if (recentError) throw recentError;
        if (!active) return;
        const mappedMessages = (recentRows || []).map((item) => ({ ...item, kind: "message" }));
        const mappedRequests = (recentRequestRows || []).map((item) => ({
          ...item,
          kind: "ai-access",
          body: "Requested AI access",
        }));
        const combined = [...mappedMessages, ...mappedRequests].sort((a, b) => {
          const left = new Date(a.created_at).getTime();
          const right = new Date(b.created_at).getTime();
          return right - left;
        });
        setUnreadCount((count || 0) + requestCount);
        setRecent(combined.slice(0, RECENT_LIMIT));
      } catch (err) {
        console.error(err);
        if (active) setError(err?.message || "Failed to load notifications.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("internal-messages-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: MESSAGES_TABLE },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          if (row.message_type === "direct" && row.recipient_id !== userId && row.created_by !== userId) {
            return;
          }
          setRecent((prev) => {
            const exists = prev.some((item) => item.id === row.id && (item.kind || "message") === "message");
            if (exists) return prev;
            const nextItem = { ...row, kind: "message" };
            return [nextItem, ...prev].slice(0, RECENT_LIMIT);
          });
          if (row.created_by === userId) return;
          const lastRead = lastReadRef.current;
          if (!lastRead || new Date(row.created_at).getTime() > new Date(lastRead).getTime()) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();
    const requestChannel = canSeeAiRequests
      ? supabase
          .channel("ai-access-requests-bell")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: AI_REQUESTS_TABLE },
            (payload) => {
              const row = payload.new;
              if (!row || row.status !== "pending") return;
              setRecent((prev) => {
                const exists = prev.some((item) => item.id === row.id && item.kind === "ai-access");
                if (exists) return prev;
                const next = [{ ...row, kind: "ai-access", body: "Requested AI access" }, ...prev];
                return next
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, RECENT_LIMIT);
              });
              const lastRead = lastReadRef.current;
              if (!lastRead || new Date(row.created_at).getTime() > new Date(lastRead).getTime()) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (requestChannel) supabase.removeChannel(requestChannel);
    };
  }, [allowed, userId, canSeeAiRequests]);

  useEffect(() => {
    const handler = (event) => {
      const iso = event?.detail;
      if (!iso) return;
      lastReadRef.current = iso;
      setUnreadCount(0);
    };
    window.addEventListener("cg-internal-read", handler);
    return () => window.removeEventListener("cg-internal-read", handler);
  }, []);

  if (!allowed) return null;

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Internal messages"
        title="Internal messages"
        data-header-control="icon"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          position: "relative",
        }}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c-3.3 0-6 2.7-6 6v2.3c0 .8-.3 1.6-.9 2.1L4 14.5h16l-1.1-1.1c-.6-.5-.9-1.3-.9-2.1V9c0-3.3-2.7-6-6-6Z"
            stroke="#374151"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 18a2.5 2.5 0 0 0 5 0"
            stroke="#374151"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: "#ef4444",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 10,
            width: 300,
            borderRadius: 12,
            border: "1px solid rgba(15, 23, 42, 0.12)",
            background: "rgba(255, 255, 255, 0.96)",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
            padding: 12,
            zIndex: 80,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
            <button
              type="button"
              onClick={markRead}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Mark read
            </button>
          </div>
          {loading && <p style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>Loading...</p>}
          {error && <p style={{ marginTop: 10, color: "#b91c1c", fontSize: 12 }}>{error}</p>}
          {!loading && recent.length === 0 && (
            <p style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
              No messages yet.
            </p>
          )}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {recent.map((item) => {
              const isAiRequest = item.kind === "ai-access";
              const name = isAiRequest
                ? item.requested_by_name || item.requested_by_email || "Educator"
                : item.created_by_name || item.created_by_email || "Staff";
              const scopeLabel = isAiRequest
                ? "AI Access Request"
                : item.message_type === "direct"
                  ? "Private"
                  : "Team";
              return (
                <div key={`${item.kind || "message"}-${item.id}`} style={{ fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{name}</span>
                    <span style={{ color: "#94a3b8" }}>{formatTime(item.created_at)}</span>
                  </div>
                  <div style={{ color: "#475569", fontSize: 11 }}>
                    {scopeLabel}
                    {!isAiRequest && item.message_type === "direct" && item.recipient_id === userId ? " To you" : ""}
                  </div>
                  <div style={{ color: "#475569" }}>
                    {item.body}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={(event) => {
              markRead();
              navigateToMessages(event);
            }}
            style={{
              marginTop: 12,
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              background: "#f8fafc",
              padding: "8px 10px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Open messages
          </button>
        </div>
      )}
    </div>
  );
}

NotificationBell.displayName = "NotificationBell";

