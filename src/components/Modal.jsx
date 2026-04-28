import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "17px 22px 14px", borderBottom: "1px solid var(--b)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.015em", color: "var(--t)" }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--tf)",
            cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 3px",
          }}>×</button>
        </div>
        <div style={{ padding: "18px 22px 22px", overflowY: "auto", maxHeight: "72vh" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
