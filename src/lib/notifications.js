import { supabase } from "./supabase";

// Fetch team members with emails from DB
export async function getTeamMembers() {
  const { data } = await supabase.from("team_members").select("name, email").order("name");
  return data ?? [];
}

// Send assignment notification via edge function
export async function notifyAssigned({ taskTitle, taskDescription, dueDate, priority, group, assignedBy, ownerNames }) {
  const members = await getTeamMembers();

  // Only notify people who have an email on file
  const recipients = ownerNames
    .flatMap((name) => {
      const member = members.find((m) => m.name === name);
      return member?.email ? [{ name: member.name, email: member.email }] : [];
    });

  if (!recipients.length) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.functions.invoke("notify-task-assigned", {
    body: { taskTitle, taskDescription, dueDate, priority, group, assignedBy, recipients },
  });
}
