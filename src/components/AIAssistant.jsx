import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { askGemini } from "../lib/gemini";
import { useActivity } from "../hooks/useActivity";

function buildSystemPrompt(apps, outreach, items) {
  return `You are the IOLA AI assistant for Ikirere Orbital Labs Africa — a deep tech space startup building satellite coordination software and CubeSats for Africa.

You have access to the team's live operations data. Here is the current state:

APPLICATIONS & GRANTS (${apps.length} total):
${apps.map((a) => `- [${a.id}] ${a.name} | ${a.type} | ${a.region} | ${a.status} | ${a.priority} | ${a.amount || "N/A"} | Deadline: ${a.deadline || "none"} | Owner: ${a.owner} | Next step: ${a.next_step || "none"}`).join("\n")}

OUTREACH CONTACTS (${outreach.length} total):
${outreach.map((c) => `- [${c.id}] ${c.name} | ${c.role} | ${c.region} | ${c.status} | Last contact: ${c.last_contact || "N/A"} | Next: ${c.next_step} | Owner: ${c.owner}`).join("\n")}

ACTION ITEMS (${items.length} total):
${items.map((i) => `- [${i.id}] ${i.title} | ${i.owner} | ${i.status} | ${i.priority} | Due: ${i.due_date || "N/A"} | Week: ${i.week_label}`).join("\n")}

You can:
1. Answer any question about the data — summaries, what someone is working on, upcoming deadlines, status of an application
2. Execute updates — if the user asks to change something, output a JSON action block on its own line at the END of your response

JSON action format (one per line, no markdown):
{"action":"update_application","id":"<uuid>","field":"status","value":"Applied"}
{"action":"update_outreach","id":"<uuid>","field":"status","value":"Active"}
{"action":"update_action_item","id":"<uuid>","field":"status","value":"Done"}

Only include JSON if you are confident about the exact record and field. Use the exact UUIDs from the data above. Keep responses concise and direct.`;
}

const SUGGESTIONS = [
  "What are our critical deadlines?",
  "What is Abigail working on?",
  "Mark ESA Kick-starts as submitted",
  "Which applications haven't been started?",
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const qc = useQueryClient();
  const { log } = useActivity();

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const executeAction = async (jsonStr) => {
    try {
      const act = JSON.parse(jsonStr);
      if (act.action === "update_application") {
        await supabase.from("applications").update({ [act.field]: act.value }).eq("id", act.id);
        const name = apps.find((a) => a.id === act.id)?.name ?? act.id;
        await log({ action: `AI: set ${act.field} → ${act.value}`, entityType: "application", entityId: act.id, entityName: name });
        qc.invalidateQueries(["applications"]);
        qc.invalidateQueries(["activity_log"]);
      } else if (act.action === "update_outreach") {
        await supabase.from("outreach").update({ [act.field]: act.value }).eq("id", act.id);
        const name = outreach.find((c) => c.id === act.id)?.name ?? act.id;
        await log({ action: `AI: set ${act.field} → ${act.value}`, entityType: "outreach", entityId: act.id, entityName: name });
        qc.invalidateQueries(["outreach"]);
        qc.invalidateQueries(["activity_log"]);
      } else if (act.action === "update_action_item") {
        await supabase.from("action_items").update({ [act.field]: act.value }).eq("id", act.id);
        const name = items.find((i) => i.id === act.id)?.title ?? act.id;
        await log({ action: `AI: set ${act.field} → ${act.value}`, entityType: "action_item", entityId: act.id, entityName: name });
        qc.invalidateQueries(["action_items"]);
        qc.invalidateQueries(["activity_log"]);
      }
    } catch {
      // malformed JSON — ignore silently
    }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const raw = await askGemini(buildSystemPrompt(apps, outreach, items), msg);
      const lines = raw.split("\n");
      const actionLines = lines.filter((l) => l.trim().startsWith('{"action":'));
      const textLines = lines.filter((l) => !l.trim().startsWith('{"action":'));
      const displayText = textLines.join("\n").trim();
      if (displayText) {
        setMessages((m) => [...m, { role: "assistant", text: displayText }]);
      }
      if (actionLines.length > 0) {
        for (const line of actionLines) await executeAction(line.trim());
        setMessages((m) => [
          ...m,
          { role: "system", text: `✓ Updated ${actionLines.length} record${actionLines.length > 1 ? "s" : ""}` },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Something went wrong. Check your Gemini API key in .env.local." },
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
        className="fixed bottom-6 right-6 z-40 w-13 h-13 bg-teal rounded-full shadow-lg flex items-center justify-center text-white hover:bg-teal-light transition-all hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
        title="Ask IOLA AI"
      >
        <span className="text-xl">{open ? "✕" : "✦"}</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 w-80 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 440 }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-navy-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center">
              <span className="text-teal text-sm">✦</span>
            </div>
            <div>
              <div className="text-white text-sm font-bold leading-tight">IOLA AI</div>
              <div className="text-gray-500 text-xs">Powered by Gemini</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-gray-500 text-xs leading-relaxed">
                  Ask me anything about IOLA operations, or tell me to update something.
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
                className={`text-sm leading-relaxed ${
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }`}
              >
                {m.role === "user" ? (
                  <span className="bg-teal/20 text-teal px-3 py-2 rounded-xl rounded-tr-sm inline-block max-w-[85%] text-left">
                    {m.text}
                  </span>
                ) : m.role === "system" ? (
                  <span className="text-green-400 text-xs bg-green-900/20 px-3 py-1.5 rounded-lg">{m.text}</span>
                ) : (
                  <span className="text-gray-300 whitespace-pre-wrap max-w-full">{m.text}</span>
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
                Thinking…
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
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask or command…"
              className="flex-1 bg-navy border border-navy-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal placeholder-gray-600 transition-colors"
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
