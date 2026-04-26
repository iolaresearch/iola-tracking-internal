import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import Modal from "../components/Modal";

const CATEGORIES = ["General", "Contact", "Context", "Rule", "Fundraising", "Engineering", "Research"];

const CATEGORY_STYLE = {
  Contact:     "bg-teal/10 text-teal border-teal/30",
  Context:     "bg-blue-900/40 text-blue-300 border-blue-800",
  Rule:        "bg-red-900/30 text-red-300 border-red-900/50",
  Fundraising: "bg-amber-900/40 text-amber-300 border-amber-900/50",
  Engineering: "bg-indigo-900/40 text-indigo-300 border-indigo-900/50",
  Research:    "bg-purple-900/40 text-purple-300 border-purple-900/50",
  General:     "bg-gray-800 text-gray-400 border-gray-700",
};

const inputCls =
  "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors placeholder-gray-600";

const EMPTY = { title: "", body: "", category: "General" };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function NoteForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="space-y-4">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputCls}
            placeholder="Short, descriptive name"
            autoFocus
          />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Content">
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            rows={8}
            className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
            placeholder={"Write anything the team and AI should know.\n\nExamples:\n- Contact details and relationship notes\n- Rules about how we handle something\n- Context behind a decision\n- Things that should never be forgotten"}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.title.trim() || !form.body.trim()}
          className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </>
  );
}

function NoteCard({ note, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLE[note.category] ?? CATEGORY_STYLE.General;
  const lines = note.body.split("\n");
  const preview = lines.slice(0, 3).join("\n");
  const hasMore = lines.length > 3;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-navy-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${style}`}>
              {note.category}
            </span>
            <span className="text-gray-600 text-xs">
              {new Date(note.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {note.created_by ? ` · ${note.created_by}` : ""}
            </span>
          </div>
          <h3 className="text-white font-semibold text-sm">{note.title}</h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(note)}
            className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(note)}
            className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
          >
            Del
          </button>
        </div>
      </div>

      <div className="mt-3">
        <pre className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {expanded ? note.body : preview}
          {!expanded && hasMore && "…"}
        </pre>
        {hasMore && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-teal/70 hover:text-teal mt-1.5 transition-colors"
          >
            {expanded ? "Show less" : `Show ${lines.length - 3} more lines`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [modal, setModal] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [search, setSearch] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["team_notes"],
    queryFn: () =>
      supabase.from("team_notes").select("*").order("category").order("title").then((r) => r.data ?? []),
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

  const filtered = notes.filter((n) => {
    if (filterCategory !== "All" && n.category !== filterCategory) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const countByCategory = CATEGORIES.reduce((acc, c) => {
    acc[c] = notes.filter((n) => n.category === c).length;
    return acc;
  }, {});

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-1">
            Shared team memory — the AI reads all of this on every message
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", data: EMPTY })}
          className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light transition-colors"
        >
          + Add Note
        </button>
      </div>

      {/* AI memory banner */}
      <div className="bg-teal/5 border border-teal/20 rounded-xl px-5 py-3 mb-6 flex items-start gap-3">
        <span className="text-teal text-lg mt-0.5">✦</span>
        <div>
          <div className="text-teal text-xs font-bold uppercase tracking-wider mb-0.5">AI Memory</div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Everything in this Knowledge Base is injected into the AI assistant on every message.
            The AI uses it to answer questions correctly and avoid duplicating work — like knowing Roberto is already a contact and who has that relationship.
            <br />
            <span className="text-gray-500">Tell the AI to remember something and it will create a note here automatically.</span>
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="bg-navy-800 border border-navy-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal w-56 placeholder-gray-600"
        />
        <div className="flex gap-2 flex-wrap">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filterCategory === c
                  ? "bg-teal text-white"
                  : "bg-navy-800 text-gray-400 border border-navy-700 hover:text-white"
              }`}
            >
              {c}
              {c !== "All" && countByCategory[c] > 0 && (
                <span className="ml-1 opacity-60">{countByCategory[c]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-20">◈</div>
          <p className="text-gray-500 text-sm">{notes.length === 0 ? "No notes yet." : "No notes match your search."}</p>
          {notes.length === 0 && (
            <button
              onClick={() => setModal({ mode: "add", data: EMPTY })}
              className="mt-4 px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light"
            >
              Add your first note
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n) => setModal({ mode: "edit", data: n })}
              onDelete={(n) => { if (window.confirm(`Delete "${n.title}"?`)) remove.mutate(n); }}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Note" : "Add Note"}
      >
        {modal && (
          <NoteForm
            initial={modal.data}
            onSave={(form) => upsert.mutate(form)}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
