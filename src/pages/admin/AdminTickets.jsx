// src/pages/admin/AdminTickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import { supabase } from "../../lib/supabase.js";
import DateTimePicker from "../../components/DateTimePicker.jsx";

const TICKETS_TABLE = import.meta.env.VITE_INTERNAL_TICKETS_TABLE || "cg_internal_tickets";
const MESSAGES_TABLE =
  import.meta.env.VITE_INTERNAL_TICKET_MESSAGES_TABLE || "cg_internal_ticket_messages";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "resolved", label: "Resolved" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const initialForm = {
  title: "",
  description: "",
  category: "",
  priority: "medium",
  dueAt: "",
  assignedTo: "",
};

const formatLabel = (value, options) => {
  if (!value) return "-";
  const match = options.find((opt) => opt.value === value);
  return match ? match.label : value;
};

const toLocalInputValue = (isoValue) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoFromInput = (inputValue) => {
  if (!inputValue) return null;
  const date = new Date(inputValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDateTime = (isoValue) => {
  if (!isoValue) return "-";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadge = (status) => {
  const key = String(status || "").toLowerCase();
  const color =
    key === "resolved"
      ? "#16a34a"
      : key === "blocked"
        ? "#dc2626"
        : key === "in_progress"
          ? "#f59e0b"
          : "#2563eb";
  const label = formatLabel(key, STATUS_OPTIONS);
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: `${color}1a`,
        color,
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
};

const priorityBadge = (priority) => {
  const key = String(priority || "").toLowerCase();
  const color =
    key === "urgent"
      ? "#dc2626"
      : key === "high"
        ? "#ea580c"
        : key === "medium"
          ? "#2563eb"
          : "#64748b";
  const label = formatLabel(key, PRIORITY_OPTIONS);
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: `${color}1a`,
        color,
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
};

export default function AdminTickets({ onNavigate }) {
  AdminTickets.propTypes = {
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
  const initialRole = (currentUser?.role || "").toLowerCase();
  const initialIsAdmin =
    localStorage.getItem("cg_admin_ok_v1") === "1" ||
    initialRole === "admin" ||
    initialRole === "administrator";

  const [authUser, setAuthUser] = useState(null);
  const [role, setRole] = useState(initialRole);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [scopeFilter, setScopeFilter] = useState(initialIsAdmin ? "all" : "mine");
  const [statusDraft, setStatusDraft] = useState("open");
  const [priorityDraft, setPriorityDraft] = useState("medium");
  const [updateNotice, setUpdateNotice] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState("");
  const [dueAtDraft, setDueAtDraft] = useState("");

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
    if (!authUser?.id) return;
    let active = true;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.role) return;
        const normalized = String(data.role || "").toLowerCase();
        setRole(normalized);
        setIsAdmin(
          normalized === "admin" ||
            normalized === "administrator" ||
            localStorage.getItem("cg_admin_ok_v1") === "1"
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (isAdmin) {
      setScopeFilter("all");
    } else {
      setScopeFilter("mine");
    }
  }, [isAdmin]);

  const loadStaffOptions = async () => {
    if (!isAdmin) return;
    setStaffLoading(true);
    setStaffError("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,email,role")
        .ilike("role", "staff")
        .order("name", { ascending: true });
      if (error) throw error;
      const list = (data || []).map((row) => ({
        value: row.id,
        label: row.name || row.email || row.id,
        email: row.email || "",
      }));
      setStaffOptions(list);
    } catch (err) {
      console.error("tickets staff list", err);
      setStaffOptions([]);
      setStaffError(err?.message || "Unable to load staff list.");
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadStaffOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadTickets = async (keepSelection = true) => {
    if (!authUser) return;
    setLoadingTickets(true);
    setTicketsError("");
    try {
      let query = supabase
        .from(TICKETS_TABLE)
        .select("*")
        .order("updated_at", { ascending: false });

      if (!isAdmin || scopeFilter === "mine") {
        query = query.or(`created_by.eq.${authUser.id},assigned_to.eq.${authUser.id}`);
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      const list = data || [];
      setTickets(list);
      if (!keepSelection || !list.some((ticket) => ticket.id === selectedId)) {
        setSelectedId(list[0]?.id || null);
      }
    } catch (err) {
      console.error("tickets load", err);
      if (err?.code === "42P01") {
        setTicketsError(
          "Internal tickets are not configured yet. Run the SQL in supabase/schema.sql and refresh."
        );
      } else {
        setTicketsError(err?.message || "Unable to load tickets.");
      }
      setTickets([]);
      setSelectedId(null);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (!authUser) return;
    loadTickets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, statusFilter, scopeFilter]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [tickets, selectedId]
  );

  useEffect(() => {
    if (!selectedTicket) return;
    setStatusDraft(selectedTicket.status || "open");
    setPriorityDraft(selectedTicket.priority || "medium");
    setAssigneeDraft(selectedTicket.assigned_to || "");
    setDueAtDraft(toLocalInputValue(selectedTicket.due_at));
    setUpdateNotice("");
    setUpdateError("");
  }, [selectedTicket]);

  const loadMessages = async (ticketId) => {
    if (!ticketId) {
      setMessages([]);
      return;
    }
    setCommentError("");
    try {
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("tickets messages", err);
      setCommentError(err?.message || "Unable to load updates.");
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }
    loadMessages(selectedTicket.id);
  }, [selectedTicket?.id]);

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!authUser) {
      setFormError("Please sign in before creating a ticket.");
      return;
    }
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) {
      setFormError("Ticket title is required.");
      return;
    }
    if (!description) {
      setFormError("Ticket description is required.");
      return;
    }
    setSavingTicket(true);
    try {
      const dueAtValue = toIsoFromInput(form.dueAt);
      const payload = {
        title,
        description,
        category: form.category.trim() || null,
        priority: form.priority || "medium",
        status: "open",
        created_by: authUser.id,
        created_by_email: authUser.email || null,
      };
      if (dueAtValue) {
        payload.due_at = dueAtValue;
      }
      if (isAdmin && form.assignedTo) {
        const staff = staffOptions.find((opt) => opt.value === form.assignedTo) || null;
        payload.assigned_to = form.assignedTo;
        payload.assigned_to_email = staff?.email || null;
      }
      const { data, error } = await supabase
        .from(TICKETS_TABLE)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setForm(initialForm);
      setFormSuccess("Ticket created.");
      if (statusFilter && statusFilter !== "all" && statusFilter !== "open") {
        setStatusFilter("open");
      }
      await loadTickets(false);
      setSelectedId(data?.id || null);
    } catch (err) {
      console.error("tickets create", err);
      setFormError(err?.message || "Unable to create ticket.");
    } finally {
      setSavingTicket(false);
    }
  };

  const handleSaveUpdates = async () => {
    if (!selectedTicket) return;
    setUpdateNotice("");
    setUpdateError("");
    setSavingUpdate(true);
    try {
      const nextStatus = statusDraft || "open";
      const dueAtValue = toIsoFromInput(dueAtDraft);
      const payload = {
        status: nextStatus,
        priority: priorityDraft || "medium",
        closed_at: nextStatus === "resolved" ? new Date().toISOString() : null,
      };
      if (isAdmin) {
        const staff = staffOptions.find((opt) => opt.value === assigneeDraft) || null;
        payload.assigned_to = assigneeDraft || null;
        payload.assigned_to_email = assigneeDraft
          ? staff?.email || selectedTicket.assigned_to_email || null
          : null;
        payload.due_at = dueAtValue;
      }
      const { data, error } = await supabase
        .from(TICKETS_TABLE)
        .update(payload)
        .eq("id", selectedTicket.id)
        .select()
        .single();
      if (error) throw error;
      setTickets((prev) =>
        prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, ...data } : ticket))
      );
      setUpdateNotice("Ticket updated.");
    } catch (err) {
      console.error("tickets update", err);
      setUpdateError(err?.message || "Unable to update ticket.");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !authUser) return;
    const message = commentDraft.trim();
    if (!message) return;
    setCommentSaving(true);
    setCommentError("");
    try {
      const payload = {
        ticket_id: selectedTicket.id,
        message,
        created_by: authUser.id,
        created_by_email: authUser.email || null,
      };
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => [...prev, data]);
      setCommentDraft("");
      await supabase
        .from(TICKETS_TABLE)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
      await loadTickets(true);
    } catch (err) {
      console.error("tickets comment", err);
      setCommentError(err?.message || "Unable to post update.");
    } finally {
      setCommentSaving(false);
    }
  };

  const headerRight = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Btn variant="back" onClick={() => onNavigate("home")}>
        Back to Home
      </Btn>
      <Btn variant="secondary" onClick={() => loadTickets(true)}>
        Refresh
      </Btn>
      <UserMenu onNavigate={onNavigate} />
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar title="Internal Tickets" right={headerRight} />

      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Track internal tasks and coordinate updates between staff and admins.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <h3 style={{ marginTop: 0 }}>Create Ticket</h3>
            <form onSubmit={handleCreateTicket} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, title: e.target.value }));
                    setFormError("");
                    setFormSuccess("");
                  }}
                  placeholder="Short summary"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Category</span>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, category: e.target.value }));
                    setFormError("");
                    setFormSuccess("");
                  }}
                  placeholder="Optional (e.g., Reports)"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, priority: e.target.value }));
                    setFormError("");
                    setFormSuccess("");
                  }}
                  style={inputStyle}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <DateTimePicker
                label="Deadline"
                mode="datetime"
                value={form.dueAt}
                onChange={(nextValue) => {
                  setForm((prev) => ({ ...prev, dueAt: nextValue }));
                  setFormError("");
                  setFormSuccess("");
                }}
                inputStyle={inputStyle}
              />
              {isAdmin && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Assign to staff</span>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, assignedTo: e.target.value }));
                      setFormError("");
                      setFormSuccess("");
                    }}
                    style={inputStyle}
                  >
                    <option value="">Unassigned</option>
                    {staffOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {staffLoading && (
                    <span style={{ color: "#64748b", fontSize: 12 }}>Loading staff list...</span>
                  )}
                  {staffError && (
                    <span style={{ color: "#b91c1c", fontSize: 12 }}>{staffError}</span>
                  )}
                </label>
              )}
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, description: e.target.value }));
                    setFormError("");
                    setFormSuccess("");
                  }}
                  placeholder="Describe the work needed and current context."
                  style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                />
              </label>
              {formError && <div style={alertStyle("error")}>{formError}</div>}
              {formSuccess && <div style={alertStyle("success")}>{formSuccess}</div>}
              <button
                type="submit"
                disabled={savingTicket}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: savingTicket ? "#c7d2fe" : "#4f46e5",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: savingTicket ? "not-allowed" : "pointer",
                }}
              >
                {savingTicket ? "Saving..." : "Create Ticket"}
              </button>
            </form>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ margin: 0 }}>Ticket Inbox</h3>
              <Btn variant="secondary" onClick={() => loadTickets(true)}>
                Refresh
              </Btn>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {isAdmin && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Scope</span>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="all">All tickets</option>
                    <option value="mine">My tickets</option>
                  </select>
                </label>
              )}
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {ticketsError && <div style={{ marginTop: 12, ...alertStyle("error") }}>{ticketsError}</div>}

            {loadingTickets ? (
              <p style={{ color: "#6b7280", marginTop: 12 }}>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: 12 }}>No tickets found.</p>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12, maxHeight: 360, overflowY: "auto" }}>
                {tickets.map((ticket) => {
                  const isSelected = ticket.id === selectedId;
                  const subtitle = [
                    ticket.category ? `Category: ${ticket.category}` : null,
                    ticket.due_at ? `Deadline: ${formatDateTime(ticket.due_at)}` : null,
                    ticket.assigned_to_email ? `Assigned: ${ticket.assigned_to_email}` : null,
                    ticket.created_by_email || null,
                  ]
                    .filter(Boolean)
                    .join(" - ");
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedId(ticket.id)}
                      style={{
                        textAlign: "left",
                        borderRadius: 12,
                        border: isSelected ? "1px solid #6366f1" : "1px solid #e5e7eb",
                        padding: 12,
                        background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(255,255,255,0.7)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{ticket.title}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {statusBadge(ticket.status)}
                          {priorityBadge(ticket.priority)}
                        </div>
                      </div>
                      {subtitle && (
                        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{subtitle}</div>
                      )}
                      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                        Updated {new Date(ticket.updated_at).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Ticket Details</h3>
          {selectedTicket && (
            <Btn variant="secondary" onClick={() => loadMessages(selectedTicket.id)}>
              Refresh updates
            </Btn>
          )}
        </div>

        {!selectedTicket ? (
          <p style={{ color: "#6b7280", marginTop: 12 }}>Select a ticket from the inbox to view details.</p>
        ) : (
          <div style={{ display: "grid", gap: 18, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedTicket.title}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Created by {selectedTicket.created_by_email || "Unknown"} -{" "}
                {new Date(selectedTicket.created_at).toLocaleString()}
              </div>
              {selectedTicket.category && (
                <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                  Category: {selectedTicket.category}
                </div>
              )}
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                Assigned to: {selectedTicket.assigned_to_email || "Unassigned"}
              </div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
                Deadline: {formatDateTime(selectedTicket.due_at)}
              </div>
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "#111827" }}>
                {selectedTicket.description}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Status</span>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Priority</span>
                <select
                  value={priorityDraft}
                  onChange={(e) => setPriorityDraft(e.target.value)}
                  style={inputStyle}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin ? (
                <>
                  <DateTimePicker
                    label="Deadline"
                    mode="datetime"
                    value={dueAtDraft}
                    onChange={setDueAtDraft}
                    inputStyle={inputStyle}
                  />
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Assign to staff</span>
                    <select
                      value={assigneeDraft}
                      onChange={(e) => setAssigneeDraft(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {staffLoading && (
                      <span style={{ color: "#64748b", fontSize: 12 }}>Loading staff list...</span>
                    )}
                    {staffError && (
                      <span style={{ color: "#b91c1c", fontSize: 12 }}>{staffError}</span>
                    )}
                  </label>
                </>
              ) : (
                <>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Deadline: {formatDateTime(selectedTicket.due_at)}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    Assigned to: {selectedTicket.assigned_to_email || "Unassigned"}
                  </div>
                </>
              )}
              <Btn variant="secondary" onClick={handleSaveUpdates} disabled={savingUpdate}>
                {savingUpdate ? "Saving..." : "Save updates"}
              </Btn>
              {updateError && <div style={alertStyle("error")}>{updateError}</div>}
              {updateNotice && <div style={alertStyle("success")}>{updateNotice}</div>}
            </div>

            <div>
              <h4 style={{ margin: "0 0 8px" }}>Updates</h4>
              {commentError && <div style={alertStyle("error")}>{commentError}</div>}
              {messages.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No updates yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 10,
                        background: "rgba(255,255,255,0.65)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {msg.created_by_email || "Update"} -{" "}
                        {new Date(msg.created_at).toLocaleString()}
                      </div>
                      <div style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#111827" }}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a progress update..."
                  style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                />
                <Btn variant="primary" onClick={handleAddComment} disabled={commentSaving || !commentDraft.trim()}>
                  {commentSaving ? "Posting..." : "Post update"}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
};

const alertStyle = (type) => ({
  border: type === "error" ? "1px solid #fecaca" : "1px solid #bbf7d0",
  background: type === "error" ? "#fee2e2" : "#ecfdf5",
  borderRadius: 8,
  padding: "8px 12px",
  color: type === "error" ? "#b91c1c" : "#15803d",
  fontSize: 13,
});
