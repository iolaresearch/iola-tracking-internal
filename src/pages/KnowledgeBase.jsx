import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import Modal from "../components/Modal";

const CATEGORIES = ["General","Contact","Context","Rule","Fundraising","Engineering","Research"];
const KB_STYLE = {
  General:     { bg: "rgba(232,238,244,0.06)", c: "rgba(232,238,244,0.38)" },
  Contact:     { bg: "rgba(14,205,183,0.1)",   c: "#0ECDB7" },
  Context:     { bg: "rgba(96,165,250,0.1)",   c: "#60A5FA" },
  Rule:        { bg: "rgba(248,113,113,0.1)",  c: "#F87171" },
  Fundraising: { bg: "rgba(245,166,35,0.1)",   c: "#F5A623" },
  Engineering: { bg: "rgba(192,132,252,0.1)",  c: "#C084FC" },
  Research:    { bg: "rgba(192,132,252,0.1)",  c: "#C084FC" },
};
const EMPTY = { title:"", body:"", category:"General" };

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "span 1" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function NoteForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Title"><input value={f.title} onChange={e => set("title", e.target.value)} className="iola-input" autoFocus placeholder="Short, searchable name" /></Field>
      <Field label="Category">
        <select value={f.category} onChange={e => set("category", e.target.value)} className="iola-input">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Content" full>
        <textarea value={f.body} onChange={e => set("body", e.target.value)} rows={8} className="iola-input"
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}
                  placeholder={"Write anything the team and AI should know.\n\nExamples:\n— Contact details and relationship notes\n— Rules about how we handle something\n— Context behind a decision"} />
      </Field>
      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="iola-btn iola-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="iola-btn iola-btn-primary" onClick={() => onSave(f)} disabled={!f.title.trim() || !f.body.trim()}>Save</button>
      </div>
    </div>
  );
}

function NoteCard({ note, onEdit, onDel }) {
  const [expanded, setExpanded] = useState(false);
  const s = KB_STYLE[note.category] || KB_STYLE.General;
  const lines = note.body.split("\n");
  const preview = lines.slice(0, 3).join("\n");
  const hasMore = lines.length > 3;

  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "15px 18px", transition: "border-color 0.13s" }}
         onMouseEnter={e => e.currentTarget.style.borderColor = "var(--b2)"}
         onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b)"}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
            <span className="iola-pill" style={{ background: s.bg, color: s.c, fontSize: 10, fontWeight: 700 }}>{note.category}</span>
            <span style={{ fontSize: 11, color: "var(--tff)" }}>
              {new Date(note.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {note.created_by ? ` · ${note.created_by}` : ""}
            </span>
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--t)" }}>{note.title}</h3>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button className="iola-btn iola-btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }} onClick={onEdit}>Edit</button>
          <button className="iola-btn iola-btn-danger" style={{ padding: "3px 8px", fontSize: 11 }} onClick={onDel}>Del</button>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <pre style={{ fontFamily: "var(--font)", fontSize: 12, color: "var(--tm)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {expanded ? note.body : preview}{!expanded && hasMore ? "…" : ""}
        </pre>
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 5, padding: 0, fontFamily: "var(--font)", opacity: 0.75 }}>
            {expanded ? "Show less" : `+${lines.length - 3} more lines`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [fCat, setFCat]     = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal]   = useState(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["team_notes"],
    queryFn: () => supabase.from("team_notes").select("*").order("category").order("title").then(r => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...row, created_by: row.created_by || session?.user?.email?.split("@")[0] || "team" };
      if (row.id) {
        await supabase.from("team_notes").update(payload).eq("id", row.id);
        await log({ action: "updated knowledge note", entityType: "team_note", entityId: row.id, entityName: row.title });
      } else {
        const { data } = await supabase.from("team_notes").insert(payload).select().single();
        await log({ action: "added knowledge note", entityType: "team_note", entityId: data.id, entityName: row.title });
      }
    },
    onSuccess: () => { qc.invalidateQueries(["team_notes"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const remove = useMutation({
    mutationFn: async (note) => {
      await supabase.from("team_notes").delete().eq("id", note.id);
      await log({ action: "deleted knowledge note", entityType: "team_note", entityId: note.id, entityName: note.title });
    },
    onSuccess: () => { qc.invalidateQueries(["team_notes"]); qc.invalidateQueries(["activity_log"]); },
  });

  const filtered = notes.filter(n =>
    (fCat === "All" || n.category === fCat) &&
    (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
  );

  const countFor = (cat) => notes.filter(n => n.category === cat).length;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)" }}>Knowledge Base</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>Shared team memory — read by the AI on every message</p>
        </div>
        <button className="iola-btn iola-btn-primary" onClick={() => setModal({ mode: "add", data: EMPTY })}>+ Add Note</button>
      </div>

      {/* AI memory banner */}
      <div style={{ background: "rgba(14,205,183,0.04)", border: "1px solid rgba(14,205,183,0.13)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 11, alignItems: "flex-start" }}>
        <span style={{ color: "var(--accent)", fontSize: 13, marginTop: 1, flexShrink: 0 }}>✦</span>
        <p style={{ fontSize: 12, color: "var(--tm)", lineHeight: 1.65 }}>
          Everything in this Knowledge Base is injected into the AI on every message. Tell the AI to remember something and it creates a note here automatically.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
               className="iola-input" style={{ width: 200, fontSize: 12, padding: "6px 11px" }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["All", ...CATEGORIES].map(c => {
            const active = fCat === c;
            const s = KB_STYLE[c];
            return (
              <button key={c} onClick={() => setFCat(c)} style={{
                padding: "5px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${active && s ? s.c + "45" : "var(--b)"}`,
                background: active && s ? s.bg : "transparent",
                color: active && s ? s.c : (active ? "var(--t)" : "var(--tm)"),
                transition: "all 0.12s", fontFamily: "var(--font)",
              }}>
                {c}{c !== "All" && countFor(c) > 0 && <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>{countFor(c)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? <p style={{ color: "var(--tf)", fontSize: 13 }}>Loading…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "72px 24px" }}>
              <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.08 }}>◯</div>
              <p style={{ color: "var(--tm)", fontSize: 13 }}>{notes.length === 0 ? "No notes yet." : "No notes match your search."}</p>
              {notes.length === 0 && <button className="iola-btn iola-btn-primary" style={{ marginTop: 16 }} onClick={() => setModal({ mode: "add", data: EMPTY })}>Add your first note</button>}
            </div>
          )}
          {filtered.map(note => (
            <NoteCard key={note.id} note={note}
              onEdit={() => setModal({ mode: "edit", data: note })}
              onDel={() => { if (confirm(`Delete "${note.title}"?`)) remove.mutate(note); }} />
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Note" : "New Note"}>
        {modal && <NoteForm initial={modal.data} onSave={f => upsert.mutate(f)} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
