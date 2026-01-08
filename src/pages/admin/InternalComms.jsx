// src/pages/admin/InternalComms.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import { supabase } from "../../lib/supabase.js";

const MESSAGES_TABLE = import.meta.env.VITE_INTERNAL_MESSAGES_TABLE || "cg_internal_messages";
const READS_TABLE = import.meta.env.VITE_INTERNAL_MESSAGE_READS_TABLE || "cg_internal_message_reads";
const MAX_MESSAGES = Number(import.meta.env.VITE_INTERNAL_MESSAGES_LIMIT || 2000);

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dedupeMessages = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

export default function InternalComms({ onNavigate }) {
  InternalComms.propTypes = {
    onNavigate: PropTypes.func.isRequired,
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
  const isAdmin =
    localStorage.getItem("cg_admin_ok_v1") === "1" ||
    role === "admin" ||
    role === "administrator";

  const [authUser, setAuthUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [messageScope, setMessageScope] = useState("team");
  const [recipientId, setRecipientId] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [recipientError, setRecipientError] = useState("");
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupError, setCleanupError] = useState("");
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const scrollRef = useRef(null);

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

  const markRead = useCallback(
    async (iso) => {
      if (!authUser?.id) return;
      const timestamp = iso || new Date().toISOString();
      try {
        await supabase.from(READS_TABLE).upsert(
          { user_id: authUser.id, last_read_at: timestamp },
          { onConflict: "user_id" }
        );
      } catch (err) {
        console.error(err);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cg-internal-read", { detail: timestamp }));
      }
    },
    [authUser?.id]
  );

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const limit = Number.isFinite(MAX_MESSAGES) && MAX_MESSAGES > 0 ? MAX_MESSAGES : 2000;
      const { data, error: fetchError } = await supabase
        .from(MESSAGES_TABLE)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(limit);
      if (fetchError) throw fetchError;
      setMessages(dedupeMessages(data || []));
      await markRead();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecipients = useCallback(async () => {
    setRecipientLoading(true);
    setRecipientError("");
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id,name,username,email,role")
        .in("role", ["admin", "administrator", "staff"])
        .order("name", { ascending: true });
      if (fetchError) throw fetchError;
      const list = (data || [])
        .filter((row) => row?.id && row?.email)
        .map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name || row.username || row.email,
          role: row.role || "",
        }))
        .filter((row) => row.id !== authUser?.id);
      setRecipients(list);
    } catch (err) {
      console.error(err);
      setRecipientError(err?.message || "Unable to load staff list.");
    } finally {
      setRecipientLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    loadRecipients();
  }, [authUser?.id, loadRecipients]);

  useEffect(() => {
    const channel = supabase
      .channel("internal-messages-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: MESSAGES_TABLE },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          setMessages((prev) => dedupeMessages([...prev, row]));
          markRead(row.created_at);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [markRead]);

  useEffect(() => {
    if (!authUser?.id) return;
    markRead();
  }, [authUser?.id, markRead]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!authUser?.id) {
      setError("You must be signed in to send messages.");
      return;
    }
    if (messageScope === "direct" && !recipientId) {
      setError("Choose a recipient for a private message.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const recipient = recipients.find((row) => row.id === recipientId) || null;
      const payload = {
        body: text,
        message_type: messageScope,
        recipient_id: messageScope === "direct" ? recipientId : null,
        recipient_email: messageScope === "direct" ? recipient?.email || null : null,
        recipient_name: messageScope === "direct" ? recipient?.name || null : null,
        created_by: authUser.id,
        created_by_email: authUser.email || currentUser?.email || null,
        created_by_name: currentUser?.name || currentUser?.username || null,
      };
      const { data, error: insertError } = await supabase
        .from(MESSAGES_TABLE)
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;
      setDraft("");
      if (messageScope === "direct") {
        setMessageScope("team");
        setRecipientId("");
      }
      setMessages((prev) => dedupeMessages([...prev, data]));
      await markRead(data?.created_at);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const messageRows = useMemo(() => messages, [messages]);

  const handleDeleteMessage = async (message) => {
    if (!message?.id) return;
    if (!authUser?.id) return;
    const canDelete = isAdmin || message.created_by === authUser.id;
    if (!canDelete) return;
    const confirmText = isAdmin
      ? "Delete this message for everyone?"
      : "Delete your message?";
    if (typeof window !== "undefined" && !window.confirm(confirmText)) return;
    try {
      const { error: deleteError } = await supabase
        .from(MESSAGES_TABLE)
        .delete()
        .eq("id", message.id);
      if (deleteError) throw deleteError;
      setMessages((prev) => prev.filter((row) => row.id !== message.id));
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to delete message.");
    }
  };

  const handleCleanup = async () => {
    if (!isAdmin) return;
    const days = Number(cleanupDays);
    if (!Number.isFinite(days) || days <= 0) {
      setCleanupError("Enter a valid number of days.");
      return;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete messages older than ${days} days?`)
    ) {
      return;
    }
    setCleanupBusy(true);
    setCleanupError("");
    try {
      const { error: deleteError } = await supabase
        .from(MESSAGES_TABLE)
        .delete()
        .lt("created_at", cutoffIso);
      if (deleteError) throw deleteError;
      setMessages((prev) =>
        prev.filter((row) => new Date(row.created_at) >= cutoff),
      );
    } catch (err) {
      console.error(err);
      setCleanupError(err?.message || "Unable to delete old messages.");
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <PageWrap>
      <HeaderBar title="Internal Communication" right={<UserMenu onNavigate={onNavigate} />} />

      <Card>
        <p style={{ marginTop: 0, color: "#64748b" }}>
          Internal channel for staff and admins. Messages are visible to the whole team.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <Btn variant="secondary" onClick={loadMessages} disabled={loading}>
            Refresh
          </Btn>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Delete older than</span>
                <input
                  type="number"
                  min="1"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(e.target.value)}
                  style={{
                    width: 80,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />
                <span style={{ fontSize: 12, color: "#64748b" }}>days</span>
              </label>
              <Btn variant="secondary" onClick={handleCleanup} disabled={cleanupBusy}>
                {cleanupBusy ? "Deleting..." : "Delete old"}
              </Btn>
            </div>
          )}
          {cleanupError && <span style={{ color: "#b91c1c", fontSize: 12 }}>{cleanupError}</span>}
        </div>
      </Card>

      <Card>
        <div
          ref={scrollRef}
          style={{
            maxHeight: 420,
            overflowY: "auto",
            display: "grid",
            gap: 12,
            paddingRight: 6,
          }}
        >
          {loading && <p style={{ color: "#64748b" }}>Loading messages...</p>}
          {!loading && messageRows.length === 0 && (
            <p style={{ color: "#64748b" }}>No messages yet.</p>
          )}
          {messageRows.map((message) => {
            const name =
              message.created_by_name ||
              message.created_by_email ||
              "Staff";
            const isMine = message.created_by && message.created_by === authUser?.id;
            const isDirect = message.message_type === "direct";
            const recipientName = message.recipient_name || message.recipient_email || "Team";
            const directionLabel = isMine
              ? isDirect
                ? `To: ${recipientName}`
                : "To: Team"
              : isDirect
                ? message.recipient_id === authUser?.id
                  ? "To: You"
                  : `To: ${recipientName}`
                : "Team message";
            return (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    background: isMine
                      ? isDirect
                        ? "rgba(14, 116, 144, 0.18)"
                        : "rgba(37, 99, 235, 0.12)"
                      : "rgba(255, 255, 255, 0.65)",
                    maxWidth: "82%",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>
                      {isMine ? "You" : name}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {formatDateTime(message.created_at)}
                      </span>
                      {(isMine || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message)}
                          title="Delete message"
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {isMine ? directionLabel : `From: ${name} · ${directionLabel}`}
                  </div>
                  {isDirect && (
                    <div style={{ fontSize: 11, color: "#0f172a", marginTop: 4 }}>
                      Private message
                    </div>
                  )}
                  <div style={{ marginTop: 6, color: "#334155", whiteSpace: "pre-wrap" }}>
                    {message.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Post a message</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Message type</span>
              <select
                value={messageScope}
                onChange={(e) => {
                  setMessageScope(e.target.value);
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              >
                <option value="team">Team message</option>
                <option value="direct">Private message</option>
              </select>
            </label>
            {messageScope === "direct" && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Recipient</span>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                  }}
                >
                  <option value="">Select staff/admin</option>
                  {recipients.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ({row.role || "staff"})
                    </option>
                  ))}
                </select>
                {recipientLoading && (
                  <span style={{ fontSize: 12, color: "#64748b" }}>Loading staff list...</span>
                )}
                {recipientError && (
                  <span style={{ fontSize: 12, color: "#b91c1c" }}>{recipientError}</span>
                )}
              </label>
            )}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              messageScope === "direct"
                ? "Write a private message..."
                : "Write an update for the team..."
            }
            rows={4}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              padding: "10px 12px",
              fontSize: 14,
              resize: "vertical",
            }}
          />
          {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn variant="primary" onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send message"}
            </Btn>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {messageScope === "direct"
                ? "Private message to a single staff/admin."
                : "Visible to all staff and admins."}
            </span>
          </div>
        </div>
      </Card>
    </PageWrap>
  );
}

InternalComms.displayName = "InternalComms";
