import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const ICON = { Critical: "🔴", High: "🟠", Medium: "🔵", Low: "⚪", ai_action: "✦", assignment: "👤", status_change: "📊" };

export function useNotifications(newAlerts) {
  const seen = useRef(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    newAlerts.forEach((alert) => {
      if (seen.current.has(alert.id)) return;
      seen.current.add(alert.id);

      const icon = ICON[alert.type] ?? ICON[alert.priority] ?? "🔔";
      const toastStyle = {
        background: "var(--s2, #111820)", color: "var(--t, #E8EEF4)",
        border: "1px solid var(--b2, rgba(255,255,255,0.11))",
        fontSize: "13px", borderRadius: "10px", maxWidth: "340px",
      };

      if (alert.priority === "Critical" || alert.type === "overdue") {
        toast.error(`${icon} ${alert.title}`, { style: toastStyle, duration: 6000 });
      } else {
        toast(`${icon} ${alert.title}`, { style: toastStyle, duration: 4000 });
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`IOLA — ${alert.title}`, {
          body: alert.body ?? "", icon: "/iola-logo.png", tag: alert.id,
        });
      }
    });
  }, [newAlerts]);
}
