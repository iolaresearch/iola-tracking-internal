import { useEffect } from "react";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onCancel(); if (e.key === "Enter") onConfirm(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onCancel}>
      <div style={{
        background: "var(--s2)", border: "1px solid var(--b2)",
        borderRadius: 12, padding: "22px 24px", maxWidth: 380, width: "100%",
        animation: "slideUp 0.15s ease",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t)", marginBottom: 8 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 13, color: "var(--tm)", lineHeight: 1.55, marginBottom: 20 }}>
            {message}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="iola-btn iola-btn-ghost" onClick={onCancel} style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button
            className="iola-btn"
            onClick={onConfirm}
            style={{
              fontSize: 13, fontWeight: 700,
              background: danger ? "rgba(248,113,113,0.12)" : "var(--accent)",
              color: danger ? "#F87171" : "#021A17",
              border: danger ? "1px solid rgba(248,113,113,0.3)" : "none",
            }}
          >
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
