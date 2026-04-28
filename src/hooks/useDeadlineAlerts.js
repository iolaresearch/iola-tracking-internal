import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const UPCOMING_DAYS = { Critical: 1, High: 3, Medium: 7, Low: 7 };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export function useDeadlineAlerts({ apps, items, userEmail, createAlert }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !userEmail || (!apps.length && !items.length)) return;
    ran.current = true;

    const today = new Date().toISOString().slice(0, 10);
    const alertsToCreate = [];

    const check = (entity, name, deadline, priority, entityType, id) => {
      const days = daysUntil(deadline);
      if (days === null) return;
      if (days < 0) {
        alertsToCreate.push({
          type: "overdue",
          title: `Overdue: ${name}`,
          body: `Was due ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`,
          priority, entity_type: entityType, entity_id: id, entity_name: name,
        });
      } else if (days === 0) {
        alertsToCreate.push({
          type: "deadline_today",
          title: `Due today: ${name}`,
          body: "This is due today — action required",
          priority, entity_type: entityType, entity_id: id, entity_name: name,
        });
      } else if (days <= (UPCOMING_DAYS[priority] ?? 7)) {
        alertsToCreate.push({
          type: "deadline_upcoming",
          title: `Due in ${days}d: ${name}`,
          body: `Deadline on ${deadline}`,
          priority, entity_type: entityType, entity_id: id, entity_name: name,
        });
      }
    };

    items.filter(i => i.status !== "Done").forEach(i =>
      check(i, i.title, i.due_date, i.priority, "action_item", i.id)
    );
    apps.filter(a => !["Accepted","Rejected"].includes(a.status)).forEach(a =>
      check(a, a.name, a.deadline, a.priority, "application", a.id)
    );

    if (!alertsToCreate.length) return;

    supabase
      .from("alerts")
      .select("entity_id, type")
      .eq("user_email", userEmail)
      .gte("created_at", today)
      .in("type", ["overdue","deadline_today","deadline_upcoming"])
      .then(({ data: existing }) => {
        const existingKeys = new Set((existing ?? []).map(e => `${e.entity_id}:${e.type}`));
        const fresh = alertsToCreate.filter(a => !existingKeys.has(`${a.entity_id}:${a.type}`));
        if (fresh.length > 0) {
          supabase.from("alerts").insert(fresh.map(a => ({ ...a, user_email: userEmail })));
        }
      });
  }, [apps, items, userEmail]);
}
