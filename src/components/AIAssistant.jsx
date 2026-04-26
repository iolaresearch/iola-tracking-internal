import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { askGemini } from "../lib/gemini";
import { useActivity } from "../hooks/useActivity";

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(apps, outreach, items) {
  const groups = [...new Set(items.map((i) => i.week_label).filter(Boolean))];

  return `You are the IOLA AI assistant for Ikirere Orbital Labs Africa — a deep tech space startup building satellite coordination software and CubeSats for Africa.

You have FULL access to the team's live operations data. You can read, create, update, and delete any record, exactly like a human using the dashboard.

════════════════════════════════════════
CURRENT DATA
════════════════════════════════════════

APPLICATIONS & GRANTS (${apps.length}):
${apps.map((a) => `  [${a.id}]
    name: ${a.name}
    type: ${a.type} | region: ${a.region || "—"} | amount: ${a.amount || "—"}
    status: ${a.status} | priority: ${a.priority}
    deadline: ${a.deadline || "none"} | owner: ${a.owner || "—"}
    next_step: ${a.next_step || "—"}
    notes: ${a.notes || "—"}
    fund_description: ${a.fund_description || "—"}
    contact_name: ${a.contact_name || "—"}`).join("\n\n")}

OUTREACH CONTACTS (${outreach.length}):
${outreach.map((c) => `  [${c.id}]
    name: ${c.name} | role: ${c.role || "—"} | region: ${c.region || "—"}
    status: ${c.status} | last_contact: ${c.last_contact || "—"} | owner: ${c.owner || "—"}
    next_step: ${c.next_step || "—"}
    notes: ${c.notes || "—"}`).join("\n\n")}

ACTION ITEMS (${items.length}):
${items.map((i) => `  [${i.id}]
    title: ${i.title}
    owner: ${i.owner || "—"} | status: ${i.status} | priority: ${i.priority}
    due_date: ${i.due_date || "—"} | group: ${i.week_label || "ungrouped"}
    description: ${i.description || "—"}`).join("\n\n")}

EXISTING GROUPS: ${groups.length ? groups.join(", ") : "none yet"}

════════════════════════════════════════
SCHEMA & VALID VALUES
════════════════════════════════════════

applications fields:
  name (text), type (Accelerator|Grant|VC / Angel|Partnership|Academic),
  region (text), amount (text), fund_description (text),
  status (Not Yet Applied|Applied|In Progress|Accepted|Rejected|Pending),
  priority (Critical|High|Medium|Low),
  next_step (text), notes (text), deadline (YYYY-MM-DD or null),
  contact_name (text), owner (text)

outreach fields:
  name (text), role (text), region (text),
  status (Active|Pending|Warm|Cold|Done),
  last_contact (YYYY-MM-DD or null), notes (text),
  next_step (text), owner (text)

action_items fields:
  title (text), description (text), owner (text),
  due_date (YYYY-MM-DD or null),
  status (To Do|In Progress|Done),
  priority (Critical|High|Medium|Low),
  week_label (text — any free string, used for grouping)

════════════════════════════════════════
ACTION PROTOCOL
════════════════════════════════════════

At the END of your response, output one JSON action per line (no markdown, no code fences).

CREATE:
{"action":"create_application","data":{"name":"...","type":"...","status":"...","priority":"..."}}
{"action":"create_outreach","data":{"name":"...","role":"...","status":"...","owner":"Jason"}}
{"action":"create_action_item","data":{"title":"...","owner":"...","status":"To Do","priority":"High","week_label":"..."}}

UPDATE (use a data object — include only fields that change):
{"action":"update_application","id":"<uuid>","data":{"status":"Applied","next_step":"Submit by Friday"}}
{"action":"update_outreach","id":"<uuid>","data":{"status":"Active","last_contact":"2026-04-26"}}
{"action":"update_action_item","id":"<uuid>","data":{"status":"Done"}}

DELETE:
{"action":"delete_application","id":"<uuid>","name":"<record name for confirmation>"}
{"action":"delete_outreach","id":"<uuid>","name":"<contact name>"}
{"action":"delete_action_item","id":"<uuid>","name":"<task title>"}

Rules:
- Use exact UUIDs from the data above.
- For creates, include all required fields (name/title, type/status/priority at minimum).
- For updates, only include the fields that should change.
- For deletes, always include name so the log is readable.
- You can output multiple action lines for bulk operations.
- Only output actions you are confident about. If ambiguous, ask for clarification.
- Keep your text response concise. Let the actions do the work.`;
}

// ─── Action executor ─────────────────────────────────────────────────────────

async function executeAction(act, { apps, outreach, items, log, qc }) {
  const invalidate = (keys) => keys.forEach((k) => qc.invalidateQueries([k]));

  switch (act.action) {
    // ── Applications ──
    case "create_application": {
      const { data } = await supabase.from("applications").insert(act.data).select().single();
      await log({ action: "AI: created application", entityType: "application", entityId: data.id, entityName: act.data.name });
      invalidate(["applications", "activity_log"]);
      return `Created application: ${act.data.name}`;
    }
    case "update_application": {
      await supabase.from("applications").update(act.data).eq("id", act.id);
      const name = apps.find((a) => a.id === act.id)?.name ?? act.id;
      const fields = Object.keys(act.data).join(", ");
      await log({ action: `AI: updated ${fields}`, entityType: "application", entityId: act.id, entityName: name });
      invalidate(["applications", "activity_log"]);
      return `Updated ${name}`;
    }
    case "delete_application": {
      await supabase.from("applications").delete().eq("id", act.id);
      await log({ action: "AI: deleted application", entityType: "application", entityId: act.id, entityName: act.name });
      invalidate(["applications", "activity_log"]);
      return `Deleted application: ${act.name}`;
    }

    // ── Outreach ──
    case "create_outreach": {
      const { data } = await supabase.from("outreach").insert(act.data).select().single();
      await log({ action: "AI: created contact", entityType: "outreach", entityId: data.id, entityName: act.data.name });
      invalidate(["outreach", "activity_log"]);
      return `Created contact: ${act.data.name}`;
    }
    case "update_outreach": {
      await supabase.from("outreach").update(act.data).eq("id", act.id);
      const name = outreach.find((c) => c.id === act.id)?.name ?? act.id;
      const fields = Object.keys(act.data).join(", ");
      await log({ action: `AI: updated ${fields}`, entityType: "outreach", entityId: act.id, entityName: name });
      invalidate(["outreach", "activity_log"]);
      return `Updated ${name}`;
    }
    case "delete_outreach": {
      await supabase.from("outreach").delete().eq("id", act.id);
      await log({ action: "AI: deleted contact", entityType: "outreach", entityId: act.id, entityName: act.name });
      invalidate(["outreach", "activity_log"]);
      return `Deleted contact: ${act.name}`;
    }

    // ── Action Items ──
    case "create_action_item": {
      const { data } = await supabase.from("action_items").insert(act.data).select().single();
      await log({ action: "AI: created task", entityType: "action_item", entityId: data.id, entityName: act.data.title });
      invalidate(["action_items", "activity_log"]);
      return `Created task: ${act.data.title}`;
    }
    case "update_action_item": {
      await supabase.from("action_items").update(act.data).eq("id", act.id);
      const name = items.find((i) => i.id === act.id)?.title ?? act.id;
      const fields = Object.keys(act.data).join(", ");
      await log({ action: `AI: updated ${fields}`, entityType: "action_item", entityId: act.id, entityName: name });
      invalidate(["action_items", "activity_log"]);
      return `Updated task: ${name}`;
    }
    case "delete_action_item": {
      await supabase.from("action_items").delete().eq("id", act.id);
      await log({ action: "AI: deleted task", entityType: "action_item", entityId: act.id, entityName: act.name });
      invalidate(["action_items", "activity_log"]);
      return `Deleted task: ${act.name}`;
    }

    default:
      return null;
  }
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What are our critical deadlines this month?",
  "Add a contact: Roberto, Italy, space ecosystem, warm",
  "Mark ESA Kick-starts as submitted",
  "Add a task: Apply to Speedrun, owner Jason, Critical, Week 1",
  "What is Salami working on?",
  "Delete the Setcoin application — it's not relevant right now",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const qc        = useQueryClient();
  const { log }   = useActivity();

  const { data: apps = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => supabase.from("applications").select("*").then((r) => r.data ?? []),
  });
  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => supabase.from("outreach").select("*").then((r) => r.data ?? []),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["action_items"],
    queryFn: () => supabase.from("action_items").select("*").then((r) => r.data ?? []),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const raw = await askGemini(buildSystemPrompt(apps, outreach, items), msg);

      // Split response text from action lines
      const lines = raw.split("\n");
      const actionLines = lines.filter((l) => {
        const t = l.trim();
        return t.startsWith("{") && t.includes('"action"');
      });
      const textLines = lines.filter((l) => {
        const t = l.trim();
        return !(t.startsWith("{") && t.includes('"action"'));
      });
      const displayText = textLines.join("\n").trim();

      if (displayText) {
        setMessages((m) => [...m, { role: "assistant", text: displayText }]);
      }

      // Execute each action and collect results
      if (actionLines.length > 0) {
        const results = [];
        for (const line of actionLines) {
          try {
            const act = JSON.parse(line.trim());
            const result = await executeAction(act, { apps, outreach, items, log, qc });
            if (result) results.push(result);
          } catch {
            // malformed JSON line — skip
          }
        }
        if (results.length > 0) {
          setMessages((m) => [
            ...m,
            { role: "system", text: results.map((r) => `✓ ${r}`).join("\n") },
          ]);
        }
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${err.message ?? "Check your Gemini API key in .env.local."}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 bg-teal rounded-full shadow-lg flex items-center justify-center text-white hover:bg-teal-light transition-all hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
        title="IOLA AI Assistant"
      >
        <span className="text-xl">{open ? "✕" : "✦"}</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: 360, height: 500 }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-navy-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center">
              <span className="text-teal text-sm">✦</span>
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold leading-tight">IOLA AI</div>
              <div className="text-gray-500 text-xs">Can read, create, update, and delete anything</div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-gray-500 text-xs leading-relaxed">
                  Tell me what to do. I can add, edit, or delete applications, contacts, and tasks — or just answer questions.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs text-gray-400 hover:text-teal bg-navy/50 hover:bg-teal/5 border border-navy-700 hover:border-teal/30 rounded-lg px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
              >
                {m.role === "user" ? (
                  <span className="bg-teal/20 text-teal px-3 py-2 rounded-xl rounded-tr-sm inline-block max-w-[85%] text-left text-xs">
                    {m.text}
                  </span>
                ) : m.role === "system" ? (
                  <div className="space-y-0.5">
                    {m.text.split("\n").map((line, j) => (
                      <div key={j} className="text-green-400 text-xs bg-green-900/20 px-3 py-1.5 rounded-lg">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-300 whitespace-pre-wrap max-w-full text-xs">{m.text}</span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Working…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-navy-700 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Add, update, delete, or ask…"
              className="flex-1 bg-navy border border-navy-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-teal placeholder-gray-600 transition-colors"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-teal text-white text-sm rounded-lg hover:bg-teal-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
