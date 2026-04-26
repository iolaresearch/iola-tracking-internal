import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

const STATUSES   = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const WEEKS = [
  "Week 1 — Apr 28 to May 4",
  "Week 2 — May 5 to May 11",
  "Week 3 — May 12 to May 18",
  "Week 4 — May 19 to May 31",
];
const OWNERS = ["Jason", "Salami", "Abigail", "Ignatius", "Alph", "Jason + Alph", "All"];

const EMPTY = {
  title: "", description: "", owner: "Jason", due_date: "",
  status: "To Do", priority: "High", week_label: WEEKS[0],
};

const inputCls =
  "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors placeholder-gray-600";

const OWNER_BADGE = {
  Jason:        "bg-teal/15 text-teal",
  Salami:       "bg-blue-900/40 text-blue-300",
  Abigail:      "bg-purple-900/40 text-purple-300",
  Ignatius:     "bg-yellow-900/40 text-yellow-300",
  Alph:         "bg-pink-900/40 text-pink-300",
  "Jason + Alph": "bg-teal/10 text-teal",
  All:          "bg-green-900/40 text-green-300",
};

const STATUS_CYCLE = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };

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

function TaskForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <>
      <div className="space-y-4">
        <Field label="Title">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className={inputCls + " resize-none"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner">
            <select value={form.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls}>
              {OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputCls}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Week">
          <select value={form.week_label} onChange={(e) => set("week_label", e.target.value)} className={inputCls}>
            {WEEKS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light transition-colors"
        >
          Save
        </button>
      </div>
    </>
  );
}

function TaskCard({ item, onEdit, onDelete, onCycle }) {
  const isDone = item.status === "Done";
  const isInProgress = item.status === "In Progress";
  const dueSoon =
    item.due_date &&
    !isDone &&
    new Date(item.due_date) - new Date() < 3 * 86400000 &&
    new Date(item.due_date) >= new Date();

  return (
    <div
      className={`bg-navy-800 rounded-xl border p-4 flex items-start gap-4 transition-colors ${
        isDone
          ? "opacity-50 border-navy-700"
          : item.priority === "Critical"
          ? "border-red-900/50 hover:border-red-900/70"
          : "border-navy-700 hover:border-navy-600"
      }`}
    >
      {/* Status toggle */}
      <button
        onClick={() => onCycle(item)}
        title={`Click to mark as ${STATUS_CYCLE[item.status]}`}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover:scale-110 ${
          isDone
            ? "border-green-600 bg-green-900/30"
            : isInProgress
            ? "border-amber"
            : "border-gray-600 hover:border-teal"
        }`}
      >
        {isDone && <span className="text-green-400 text-xs">✓</span>}
        {isInProgress && <span className="w-2 h-2 rounded-full bg-amber block" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold leading-tight ${
              isDone ? "line-through text-gray-500" : "text-white"
            }`}
          >
            {item.title}
          </span>
          <PriorityBadge priority={item.priority} />
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              OWNER_BADGE[item.owner] ?? "bg-gray-800 text-gray-400"
            }`}
          >
            {item.owner}
          </span>
        </div>
        {item.description && (
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.description}</p>
        )}
        {item.due_date && (
          <div
            className={`text-xs mt-1.5 font-medium ${
              dueSoon ? "text-red-400" : "text-gray-600"
            }`}
          >
            Due{" "}
            {new Date(item.due_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
            {dueSoon && " ⚡"}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item)}
          className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Del
        </button>
      </div>
    </div>
  );
}

export default function ActionItems() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [modal, setModal] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["action_items"],
    queryFn: () =>
      supabase.from("action_items").select("*").order("due_date").then((r) => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("action_items").update(row).eq("id", row.id);
        await log({ action: "updated task", entityType: "action_item", entityId: row.id, entityName: row.title });
      } else {
        const { data } = await supabase.from("action_items").insert(row).select().single();
        await log({ action: "added task", entityType: "action_item", entityId: data.id, entityName: row.title });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["action_items"]);
      qc.invalidateQueries(["activity_log"]);
      setModal(null);
    },
  });

  const cycleStatus = useMutation({
    mutationFn: async (item) => {
      const next = STATUS_CYCLE[item.status];
      await supabase.from("action_items").update({ status: next }).eq("id", item.id);
      await log({ action: `marked ${next}`, entityType: "action_item", entityId: item.id, entityName: item.title });
    },
    onSuccess: () => {
      qc.invalidateQueries(["action_items"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const remove = useMutation({
    mutationFn: async (item) => {
      await supabase.from("action_items").delete().eq("id", item.id);
      await log({ action: "deleted task", entityType: "action_item", entityId: item.id, entityName: item.title });
    },
    onSuccess: () => {
      qc.invalidateQueries(["action_items"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const done     = items.filter((i) => i.status === "Done").length;
  const critical = items.filter((i) => i.priority === "Critical" && i.status !== "Done").length;

  const byWeek = WEEKS.reduce((acc, w) => {
    acc[w] = items.filter((i) => i.week_label === w);
    return acc;
  }, {});
  const ungrouped = items.filter((i) => !WEEKS.includes(i.week_label));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Action Items — May 2026</h1>
          <p className="text-gray-500 text-sm mt-1">
            {done}/{items.length} complete · {critical} critical remaining
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", data: EMPTY })}
          className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light transition-colors"
        >
          + Add Task
        </button>
      </div>

      {/* North Star */}
      <div className="bg-navy-800 border border-teal/20 rounded-xl px-5 py-4 mb-8">
        <div className="text-teal text-xs font-bold uppercase tracking-widest mb-1.5">May North Star</div>
        <p className="text-gray-300 text-sm leading-relaxed">
          By end of May: Delaware C-Corp registered. ESA Kick-starts submitted. Phase 1 simulation engine ships. Black Flag and LVL UP Labs applications in. SPACERAISE attended. Harvard network opened. Two investor relationships warm.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Overall progress</span>
          <span>{items.length > 0 ? Math.round((done / items.length) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500"
            style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="space-y-10">
          {WEEKS.map((week) => {
            const weekItems = byWeek[week] ?? [];
            const weekDone = weekItems.filter((i) => i.status === "Done").length;
            return (
              <div key={week}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {week}
                  </h2>
                  <div className="flex-1 h-px bg-navy-700" />
                  <span className="text-xs text-gray-600">
                    {weekDone}/{weekItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {weekItems.length === 0 && (
                    <p className="text-gray-600 text-sm">No tasks this week.</p>
                  )}
                  {weekItems.map((item) => (
                    <TaskCard
                      key={item.id}
                      item={item}
                      onEdit={(item) => setModal({ mode: "edit", data: item })}
                      onDelete={(item) => {
                        if (window.confirm("Delete this task?"))
                          remove.mutate(item);
                      }}
                      onCycle={(item) => cycleStatus.mutate(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {ungrouped.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Other</h2>
                <div className="flex-1 h-px bg-navy-700" />
              </div>
              <div className="space-y-2">
                {ungrouped.map((item) => (
                  <TaskCard
                    key={item.id}
                    item={item}
                    onEdit={(item) => setModal({ mode: "edit", data: item })}
                    onDelete={(item) => {
                      if (window.confirm("Delete this task?")) remove.mutate(item);
                    }}
                    onCycle={(item) => cycleStatus.mutate(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Task" : "Add Task"}
      >
        {modal && (
          <TaskForm
            initial={modal.data}
            onSave={(form) => upsert.mutate(form)}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
