// src/pages/admin/WeeklyReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import DateTimePicker from "../../components/DateTimePicker.jsx";
import { supabase } from "../../lib/supabase.js";

const TICKETS_TABLE = import.meta.env.VITE_INTERNAL_TICKETS_TABLE || "cg_internal_tickets";
const MESSAGES_TABLE =
  import.meta.env.VITE_INTERNAL_TICKET_MESSAGES_TABLE || "cg_internal_ticket_messages";
const MAX_REPORT_ROWS = Number(import.meta.env.VITE_WEEKLY_REPORT_LIMIT || 20000);
const PAGE_SIZE = 1000;

const RANGE_OPTIONS = [
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "custom", label: "Custom range" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toLocalInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoFromInput = (inputValue) => {
  if (!inputValue) return null;
  const date = new Date(inputValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date) => {
  const base = startOfDay(date);
  const day = base.getDay();
  const offset = (day + 6) % 7;
  base.setDate(base.getDate() - offset);
  return base;
};

const buildRange = (mode) => {
  const now = new Date();
  if (mode === "last_7_days") {
    return { start: startOfDay(addDays(now, -6)), end: addDays(startOfDay(now), 1) };
  }
  const start = startOfWeek(now);
  if (mode === "last_week") {
    const lastWeekStart = addDays(start, -7);
    return { start: lastWeekStart, end: start };
  }
  return { start, end: addDays(start, 7) };
};

const safeLimit = (value) => {
  if (!Number.isFinite(value)) return MAX_REPORT_ROWS;
  return Math.max(0, Math.min(value, MAX_REPORT_ROWS));
};

const fetchPaged = async (buildQuery, limit = MAX_REPORT_ROWS) => {
  const rows = [];
  const cap = safeLimit(limit);
  if (cap <= 0) return rows;
  for (let offset = 0; offset < cap; offset += PAGE_SIZE) {
    const to = Math.min(offset + PAGE_SIZE - 1, cap - 1);
    const { data, error } = await buildQuery(offset, to);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < to - offset + 1) break;
  }
  return rows;
};

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export default function WeeklyReports({ onNavigate }) {
  WeeklyReports.propTypes = {
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

  const [rangeMode, setRangeMode] = useState("this_week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [createdTickets, setCreatedTickets] = useState([]);
  const [activeTickets, setActiveTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [profileMap, setProfileMap] = useState({});
  const [profileError, setProfileError] = useState("");

  const range = useMemo(() => {
    if (rangeMode !== "custom") return buildRange(rangeMode);
    const startIso = toIsoFromInput(customStart);
    const endIso = toIsoFromInput(customEnd);
    return {
      start: startIso ? new Date(startIso) : null,
      end: endIso ? new Date(endIso) : null,
    };
  }, [rangeMode, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    if (!range.start || !range.end) return "Select a date range";
    const start = formatDate(range.start);
    const end =
      rangeMode === "custom" ? formatDate(range.end) : formatDate(addDays(range.end, -1));
    return `${start} - ${end}`;
  }, [range.start, range.end, rangeMode]);

  useEffect(() => {
    if (rangeMode === "custom") return;
    const next = buildRange(rangeMode);
    setCustomStart(toLocalInputValue(next.start));
    setCustomEnd(toLocalInputValue(next.end));
  }, [rangeMode]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!range.start || !range.end) return;
      if (range.end <= range.start) {
        setLoading(false);
        setError("End date must be after the start date.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const startIso = range.start.toISOString();
        const endIso = range.end.toISOString();

        const createdRows = await fetchPaged((from, to) =>
          supabase
            .from(TICKETS_TABLE)
            .select("*")
            .gte("created_at", startIso)
            .lt("created_at", endIso)
            .order("created_at", { ascending: false })
            .range(from, to)
        );

        const updatedRows = await fetchPaged((from, to) =>
          supabase
            .from(TICKETS_TABLE)
            .select("*")
            .gte("updated_at", startIso)
            .lt("updated_at", endIso)
            .order("updated_at", { ascending: false })
            .range(from, to)
        );

        const messageRows = await fetchPaged((from, to) =>
          supabase
            .from(MESSAGES_TABLE)
            .select("*")
            .gte("created_at", startIso)
            .lt("created_at", endIso)
            .order("created_at", { ascending: false })
            .range(from, to)
        );

        if (!active) return;
        setCreatedTickets(createdRows);
        const byId = new Map();
        createdRows.forEach((row) => row?.id && byId.set(row.id, row));
        updatedRows.forEach((row) => row?.id && byId.set(row.id, row));
        setActiveTickets(Array.from(byId.values()));
        setMessages(messageRows);
      } catch (err) {
        console.error(err);
        if (active) setError(err?.message || "Failed to load report data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [range.start, range.end, reloadKey]);

  const summary = useMemo(() => {
    const now = new Date();
    const statusCounts = activeTickets.reduce(
      (acc, ticket) => {
        const status = String(ticket?.status || "open").toLowerCase();
        acc.total += 1;
        acc[status] = (acc[status] || 0) + 1;
        if (ticket?.due_at && status !== "resolved") {
          const due = new Date(ticket.due_at);
          if (!Number.isNaN(due.getTime()) && due < now) acc.overdue += 1;
        }
        if (status === "resolved" && ticket?.closed_at) acc.resolved += 1;
        return acc;
      },
      { total: 0, open: 0, in_progress: 0, blocked: 0, resolved: 0, overdue: 0 }
    );

    return {
      created: createdTickets.length,
      active: activeTickets.length,
      messages: messages.length,
      statusCounts,
    };
  }, [createdTickets, activeTickets, messages]);

  const staffSummary = useMemo(() => {
    const map = new Map();
    const touch = (email, field, amount = 1) => {
      const key = normalizeEmail(email) || "unknown";
      const current = map.get(key) || {
        email: key,
        created: 0,
        assigned: 0,
        resolved: 0,
        messages: 0,
      };
      current[field] = (current[field] || 0) + amount;
      map.set(key, current);
    };

    createdTickets.forEach((ticket) => {
      touch(ticket?.created_by_email, "created");
    });

    activeTickets.forEach((ticket) => {
      if (ticket?.assigned_to_email) touch(ticket.assigned_to_email, "assigned");
      if (String(ticket?.status || "").toLowerCase() === "resolved") {
        touch(ticket?.assigned_to_email || ticket?.created_by_email, "resolved");
      }
    });

    messages.forEach((message) => {
      touch(message?.created_by_email, "messages");
    });

    return Array.from(map.values()).sort((a, b) => b.resolved - a.resolved || b.created - a.created);
  }, [createdTickets, activeTickets, messages]);

  useEffect(() => {
    const baseMap = {};
    const currentEmail = normalizeEmail(currentUser?.email);
    if (currentEmail && currentUser?.name) {
      baseMap[currentEmail] = currentUser.name;
    }
    setProfileMap(baseMap);
    setProfileError("");

    const canFetchProfiles =
      localStorage.getItem("cg_admin_ok_v1") === "1" ||
      role === "admin" ||
      role === "administrator";
    if (!canFetchProfiles) return;

    const emails = Array.from(
      new Set(
        staffSummary
          .map((row) => normalizeEmail(row.email))
          .filter(Boolean),
      ),
    );
    if (emails.length === 0) return;

    let active = true;
    const chunkSize = 100;
    const loadProfiles = async () => {
      try {
        const nextMap = { ...baseMap };
        for (let i = 0; i < emails.length; i += chunkSize) {
          const chunk = emails.slice(i, i + chunkSize);
          const { data, error: fetchError } = await supabase
            .from("profiles")
            .select("email,name,username")
            .in("email", chunk);
          if (fetchError) throw fetchError;
          (data || []).forEach((profile) => {
            const key = normalizeEmail(profile?.email);
            if (!key) return;
            const display = profile?.name || profile?.username || key;
            nextMap[key] = display;
          });
        }
        if (active) setProfileMap(nextMap);
      } catch (err) {
        console.error(err);
        if (active) setProfileError(err?.message || "Could not load staff names.");
      }
    };
    loadProfiles();
    return () => {
      active = false;
    };
  }, [staffSummary, role, currentUser?.email, currentUser?.name]);

  const staffRows = useMemo(() => {
    return staffSummary.map((row) => {
      const key = normalizeEmail(row.email);
      const displayName = profileMap[key] || row.email || "Unknown";
      return { ...row, displayName };
    });
  }, [staffSummary, profileMap]);

  const maxStaffActivity = useMemo(() => {
    return Math.max(
      1,
      ...staffRows.map(
        (row) => row.created + row.assigned + row.resolved + row.messages,
      ),
    );
  }, [staffRows]);

  const ticketIndex = useMemo(() => {
    const map = new Map();
    activeTickets.forEach((ticket) => {
      if (ticket?.id) map.set(ticket.id, ticket);
    });
    return map;
  }, [activeTickets]);

  const messageRows = useMemo(() => {
    return messages.map((message) => {
      const ticket = ticketIndex.get(message?.ticket_id);
      return {
        ...message,
        ticketTitle: ticket?.title || message?.ticket_id || "-",
      };
    });
  }, [messages, ticketIndex]);

  const statCards = [
    { label: "Tickets created", value: summary.created },
    { label: "Tickets active", value: summary.active },
    { label: "Messages posted", value: summary.messages },
    { label: "Open", value: summary.statusCounts.open },
    { label: "In progress", value: summary.statusCounts.in_progress },
    { label: "Blocked", value: summary.statusCounts.blocked },
    { label: "Resolved", value: summary.statusCounts.resolved },
    { label: "Overdue", value: summary.statusCounts.overdue },
  ];

  return (
    <PageWrap>
      <HeaderBar
        title="Weekly Staff Report"
        subtitle={rangeLabel}
        right={<UserMenu onNavigate={onNavigate} />}
      />

      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span style={{ fontWeight: 600 }}>Report range</span>
            <select
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                background: "#ffffff",
              }}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {rangeMode === "custom" && (
            <>
              <DateTimePicker
                label="Start"
                value={customStart}
                onChange={setCustomStart}
                mode="datetime"
              />
              <DateTimePicker
                label="End"
                value={customEnd}
                onChange={setCustomEnd}
                mode="datetime"
              />
            </>
          )}
          <Btn
            variant="secondary"
            onClick={() => setReloadKey((prev) => prev + 1)}
            disabled={loading}
          >
            Refresh
          </Btn>
        </div>
        <p style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
          Data sources: internal tickets and internal ticket messages. Audience: staff and administrators.
        </p>
      </Card>

      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {statCards.map((stat) => (
            <div
              key={stat.label}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                padding: "12px 14px",
                background: "rgba(255, 255, 255, 0.6)",
                display: "grid",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{stat.value}</span>
            </div>
          ))}
        </div>
        {loading && <p style={{ marginTop: 10, color: "#64748b" }}>Loading weekly report...</p>}
        {error && <p style={{ marginTop: 10, color: "#b91c1c" }}>{error}</p>}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Staff summary</h3>
        {profileError && (
          <p style={{ color: "#b91c1c", marginTop: 0 }}>{profileError}</p>
        )}
        {staffRows.length === 0 ? (
          <p style={{ color: "#64748b" }}>No staff activity found for this range.</p>
        ) : (
          <div style={{ overflowX: "auto", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#475569", fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: "#2563eb" }} />
                Created
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: "#f59e0b" }} />
                Assigned
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: "#16a34a" }} />
                Resolved
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: "#7c3aed" }} />
                Messages
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Staff", "Activity", "Created", "Assigned", "Resolved", "Messages"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row) => {
                  const total = row.created + row.assigned + row.resolved + row.messages;
                  const segments = [
                    { key: "created", value: row.created, color: "#2563eb" },
                    { key: "assigned", value: row.assigned, color: "#f59e0b" },
                    { key: "resolved", value: row.resolved, color: "#16a34a" },
                    { key: "messages", value: row.messages, color: "#7c3aed" },
                  ];
                  return (
                    <tr key={row.email}>
                      <td style={{ padding: "10px 8px", color: "#0f172a" }} title={row.email}>
                        {row.displayName}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <div
                          style={{
                            width: 160,
                            height: 10,
                            background: "rgba(15, 23, 42, 0.08)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ display: "flex", height: "100%" }}>
                            {segments.map((segment) => {
                              if (!segment.value) return null;
                              const width = Math.max(
                                2,
                                Math.round((segment.value / maxStaffActivity) * 160),
                              );
                              return (
                                <span
                                  key={segment.key}
                                  style={{
                                    width,
                                    background: segment.color,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {total} total
                        </div>
                      </td>
                    <td style={{ padding: "10px 8px" }}>{row.created}</td>
                    <td style={{ padding: "10px 8px" }}>{row.assigned}</td>
                    <td style={{ padding: "10px 8px" }}>{row.resolved}</td>
                    <td style={{ padding: "10px 8px" }}>{row.messages}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Tickets active this range</h3>
        {activeTickets.length === 0 ? (
          <p style={{ color: "#64748b" }}>No ticket activity found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Title", "Status", "Priority", "Category", "Due", "Assigned", "Created by", "Updated"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={{ padding: "10px 8px", color: "#0f172a" }}>{ticket.title}</td>
                    <td style={{ padding: "10px 8px" }}>{ticket.status}</td>
                    <td style={{ padding: "10px 8px" }}>{ticket.priority}</td>
                    <td style={{ padding: "10px 8px" }}>{ticket.category || "-"}</td>
                    <td style={{ padding: "10px 8px" }}>{formatDate(ticket.due_at)}</td>
                    <td style={{ padding: "10px 8px" }}>{ticket.assigned_to_email || "-"}</td>
                    <td style={{ padding: "10px 8px" }}>{ticket.created_by_email || "-"}</td>
                    <td style={{ padding: "10px 8px" }}>{formatDateTime(ticket.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Message activity</h3>
        {messageRows.length === 0 ? (
          <p style={{ color: "#64748b" }}>No messages posted for this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Ticket", "Author", "Message", "Date"].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messageRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "10px 8px", color: "#0f172a" }}>{row.ticketTitle}</td>
                    <td style={{ padding: "10px 8px" }}>{row.created_by_email || "-"}</td>
                    <td style={{ padding: "10px 8px" }} title={row.message}>
                      {row.message}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}

WeeklyReports.displayName = "WeeklyReports";
