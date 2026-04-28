import { supabase } from "./supabase";

const TABLE_MAP = {
  application: "applications",
  outreach:    "outreach",
  action_item: "action_items",
  team_note:   "team_notes",
};

export async function undoSnapshot(snapshot) {
  if (!snapshot?.length) throw new Error("No snapshot to undo");
  const results = [];
  for (const entry of snapshot) {
    const tableName = TABLE_MAP[entry.table] ?? entry.table;
    if (entry.before === null) {
      const { error } = await supabase.from(tableName).delete().eq("id", entry.id);
      if (error) throw new Error(`Failed to undo create on ${tableName}: ${error.message}`);
      results.push(`Deleted ${entry.table} ${entry.id}`);
    } else {
      const { error } = await supabase.from(tableName).upsert(entry.before);
      if (error) throw new Error(`Failed to undo update on ${tableName}: ${error.message}`);
      results.push(`Restored ${entry.table}: ${entry.before.name ?? entry.before.title ?? entry.id}`);
    }
  }
  return results;
}
