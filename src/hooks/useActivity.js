import { supabase } from "../lib/supabase";

export function useActivity() {
  const log = async ({ action, entityType, entityId, entityName }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await supabase.from("activity_log").insert({
      user_email: session?.user?.email ?? "unknown",
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
    });
  };
  return { log };
}
