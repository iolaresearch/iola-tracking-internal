import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { askClaude, buildSystemPrompt, buildTools } from "../lib/claude";
import { useActivity } from "../hooks/useActivity";

const SUGGESTIONS = [
  "What are our critical deadlines this month?",
  "Remember that Roberto's email is roberto@example.com — Italy, space ecosystem",
  "Mark ESA Kick-starts as submitted",
  "Add a task: Apply to Speedrun, owner Jason, Critical",
  "What does the team know about Roberto?",
  "What is Abigail working on?",
];

export default function AIAssistant() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
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
  const { data: notes = [] } = useQuery({
    queryKey: ["team_notes"],
    queryFn: () => supabase.from("team_notes").select("*").order("category").order("title").then((r) => r.data ?? []),
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
      const tools = buildTools({ supabase, apps, outreach, items, notes, log, qc });
      const systemPrompt = buildSystemPrompt(apps, outreach, items, notes);
      const { text: responseText, toolResults } = await askClaude({
        userMessage: msg,
        systemPrompt,
        tools,
      });

      if (responseText) {
        setMessages((m) => [...m, { role: "assistant", text: responseText }]);
      }

      if (toolResults.length > 0) {
        setMessages((m) => [
          ...m,
          { role: "system", text: toolResults.map((r) => `✓ ${r}`).join("\n") },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${err.message ?? "Check your Anthropic API key in Vercel env vars."}` },
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
              <div className="text-gray-500 text-xs">Powered by Claude</div>
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
                      <div key={j} className="text-green-400 text-xs bg-green-900/20 px-3 py-1.5 rounded-lg">{line}</div>
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
