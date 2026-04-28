import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (!userEmail) return;
    supabase
      .from("alerts")
      .select("*")
      .eq("user_email", userEmail)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setAlerts(data ?? []));
  }, [userEmail]);

  // Realtime subscription — only this user's alerts
  useEffect(() => {
    if (!userEmail) return;
    const channel = supabase
      .channel(`alerts:${userEmail}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "alerts",
        filter: `user_email=eq.${userEmail}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAlerts((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setAlerts((prev) =>
            payload.new.dismissed
              ? prev.filter((a) => a.id !== payload.new.id)
              : prev.map((a) => a.id === payload.new.id ? payload.new : a)
          );
        } else if (payload.eventType === "DELETE") {
          setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userEmail]);

  const createAlert = useCallback(async (alert) => {
    if (!userEmail) return;
    await supabase.from("alerts").insert({ ...alert, user_email: userEmail });
  }, [userEmail]);

  const dismiss = useCallback(async (id) => {
    await supabase.from("alerts").update({ dismissed: true }).eq("id", id);
  }, []);

  const markRead = useCallback(async (id) => {
    await supabase.from("alerts").update({ read: true }).eq("id", id);
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return { alerts, unreadCount, createAlert, dismiss, markRead, userEmail };
}
