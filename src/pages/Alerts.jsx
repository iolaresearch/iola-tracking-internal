import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../hooks/useAlerts";
import { undoSnapshot } from "../lib/undo";

const TYPE_LABEL = {
  deadline_today:    { label: "Due Today",  color: "#F87171" },
  overdue:           { label: "Overdue",    color: "#F87171" },
  deadline_upcoming: { label: "Upcoming",   color: "#F5A623" },
  assignment:        { label: "Assigned",   color: "#0ECDB7" },
  status_change:     { label: "Status",     color: "#60A5FA" },
  ai_action:         { label: "AI Action",  color: "#C084FC" },
};

const PRIORITY_COLOR = { Critical: "#F87171", High: "#F5A623", Medium: "#60A5FA", Low: "rgba(232,238,244,0.25)" };

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Alerts() {
  const { alerts, dismiss, markRead } = useAlerts();
  const [undoing, setUndoing] = useState(null);
  const [undoError, setUndoError] = useState(null);
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();

  const filtered = alerts.filter(a =>
    filter === "all" ? true :
    filter === "unread" ? !a.read :
    a.type === filter
  );

  const handleUndo = async (alert) => {
    setUndoing(alert.id);
    setUndoError(null);
    try {
      await undoSnapshot(alert.snapshot);
      await dismiss(alert.id);
      qc.invalidateQueries(["applications"]);
      qc.invalidateQueries(["outreach"]);
      qc.invalidateQueries(["action_items"]);
      qc.invalidateQueries(["team_notes"]);
      qc.invalidateQueries(["activity_log"]);
    } catch (e) {
      setUndoError(e.message);
    } finally {
      setUndoing(null);
    }
  };

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "overdue", label: "Overdue" },
    { key: "deadline_today", label: "Due Today" },
    { key: "deadline_upcoming", label: "Upcoming" },
    { key: "ai_action", label: "AI Actions" },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)" }}>Alerts</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            {alerts.filter(a => !a.read).length} unread · {alerts.length} total
          </p>
        </div>
        {alerts.length > 0 && (
          <button className="iola-btn iola-btn-ghost" style={{ fontSize: 12 }}
            onClick={() => alerts.forEach(a => dismiss(a.id))}>
            Dismiss all
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.12s",
            background: filter === f.key ? "var(--accent)" : "transparent",
            color: filter === f.key ? "#021A17" : "var(--tm)",
            border: `1px solid ${filter === f.key ? "var(--accent)" : "var(--b)"}`,
          }}>{f.label}</button>
        ))}
      </div>

      {undoError && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#F87171" }}>
          Undo failed: {undoError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "72px 24px" }}>
          <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.08 }}>◯</div>
          <p style={{ color: "var(--tm)", fontSize: 13 }}>No alerts.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(alert => {
            const tl = TYPE_LABEL[alert.type] ?? { label: alert.type, color: "var(--tm)" };
            const canUndo = alert.type === "ai_action" && alert.snapshot?.length > 0;

            return (
              <div key={alert.id}
                onClick={() => !alert.read && markRead(alert.id)}
                style={{
                  background: alert.read ? "var(--s1)" : "rgba(14,205,183,0.03)",
                  border: `1px solid ${alert.read ? "var(--b)" : "rgba(14,205,183,0.15)"}`,
                  borderLeft: `3px solid ${tl.color}`,
                  borderRadius: 10, padding: "13px 16px",
                  display: "flex", alignItems: "flex-start", gap: 14,
                  cursor: alert.read ? "default" : "pointer",
                  transition: "background 0.13s",
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span className="iola-pill" style={{ background: tl.color + "18", color: tl.color, fontSize: 10, fontWeight: 700 }}>
                      {tl.label}
                    </span>
                    {alert.priority && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[alert.priority] ?? "var(--tm)", display: "inline-block", flexShrink: 0 }} />
                    )}
                    {!alert.read && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, boxShadow: "0 0 6px rgba(14,205,183,0.5)" }} />
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t)" }}>{alert.title}</div>
                  {alert.body && <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 2, lineHeight: 1.5 }}>{alert.body}</div>}
                  <div style={{ fontSize: 10, color: "var(--tff)", marginTop: 5 }}>{timeAgo(alert.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                  {canUndo && (
                    <button className="iola-btn iola-btn-ghost"
                      style={{ fontSize: 11, padding: "3px 9px", color: "#C084FC", borderColor: "rgba(192,132,252,0.3)" }}
                      disabled={undoing === alert.id}
                      onClick={e => { e.stopPropagation(); handleUndo(alert); }}>
                      {undoing === alert.id ? "Undoing…" : "↩ Undo"}
                    </button>
                  )}
                  <button className="iola-btn iola-btn-ghost"
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    onClick={e => { e.stopPropagation(); dismiss(alert.id); }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
