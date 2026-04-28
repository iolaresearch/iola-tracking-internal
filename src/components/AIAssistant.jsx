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
        supabase,
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
      {/* FAB */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 60,
        width: 46, height: 46, borderRadius: "50%",
        background: "var(--accent)", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#021A17", fontSize: 16, fontWeight: 800,
        boxShadow: "0 4px 20px rgba(14,205,183,0.35)", transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.09)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(14,205,183,0.45)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(14,205,183,0.35)"; }}
      title="IOLA AI">
        {open ? "×" : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Satellite dish — space comms, fits IOLA */}
            <path d="M3 17 L8 12"/>
            <path d="M8 12 C8 8 12 4 16 4"/>
            <path d="M8 12 C10 10 14 8 16 4"/>
            <path d="M5 14 C6 11 9 8 14 7"/>
            <circle cx="16" cy="4" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 82, right: 24, zIndex: 60,
          width: 332, height: 440,
          background: "var(--s2)", border: "1px solid var(--b2)",
          borderRadius: 14, display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)", animation: "slideUp 0.18s ease",
        }}>
          {/* Header */}
          <div style={{ padding: "13px 16px 11px", borderBottom: "1px solid var(--b)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--a-dim)", border: "1px solid var(--a-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="10" cy="10" r="2.2" fill="var(--accent)" stroke="none"/>
                <ellipse cx="10" cy="10" rx="8" ry="3.5" strokeOpacity="0.9"/>
                <ellipse cx="10" cy="10" rx="8" ry="3.5" transform="rotate(60 10 10)" strokeOpacity="0.65"/>
                <ellipse cx="10" cy="10" rx="8" ry="3.5" transform="rotate(120 10 10)" strokeOpacity="0.45"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t)", lineHeight: 1 }}>IOLA AI</div>
              <div style={{ fontSize: 10, color: "var(--tff)", marginTop: 2 }}>Powered by Claude</div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{ background: "none", border: "none", color: "var(--tff)", cursor: "pointer", fontSize: 11, fontFamily: "var(--font)" }}>Clear</button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: 12, color: "var(--tm)", lineHeight: 1.65, marginBottom: 12 }}>
                  Ask me about deadlines, tasks, contacts, or the pipeline. I can also add, update, and delete records.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid var(--b)",
                      borderRadius: 7, padding: "7px 10px", textAlign: "left",
                      color: "var(--tm)", fontSize: 11, cursor: "pointer",
                      fontFamily: "var(--font)", transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--a-border)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--b)"; e.currentTarget.style.color = "var(--tm)"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "user" ? (
                  <div style={{ maxWidth: "85%", fontSize: 12, lineHeight: 1.65, padding: "8px 11px", borderRadius: 9, background: "var(--a-dim)", color: "var(--accent)", border: "1px solid var(--a-border)" }}>{m.text}</div>
                ) : m.role === "system" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {m.text.split("\n").map((line, j) => (
                      <div key={j} style={{ fontSize: 11, color: "#4ADE80", background: "rgba(74,222,128,0.08)", padding: "5px 9px", borderRadius: 7 }}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ maxWidth: "100%", fontSize: 12, lineHeight: 1.65, padding: "8px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", color: "var(--tm)", border: "1px solid var(--b)", whiteSpace: "pre-wrap" }}>{m.text}</div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 2px" }}>
                {[0,150,300].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: `bounce 1.1s ${d}ms infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--b)", display: "flex", gap: 7 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask or instruct…"
              className="iola-input" style={{ flex: 1, fontSize: 12, padding: "7px 10px" }}
            />
            <button className="iola-btn iola-btn-primary" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: "7px 12px", fontSize: 14 }}>→</button>
          </div>
        </div>
      )}
    </>
  );
}
