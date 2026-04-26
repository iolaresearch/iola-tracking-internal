import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

const STATUSES   = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const OWNERS     = ["Jason", "Salami", "Abigail", "Ignatius", "Alph", "Jason + Alph", "All"];

const EMPTY = {
  title: "", description: "", owner: "Jason", due_date: "",
  status: "To Do", priority: "High", week_label: "",
};

const inputCls =
  "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors placeholder-gray-600";

const OWNER_BADGE = {
  Jason:          "bg-teal/15 text-teal",
  Salami:         "bg-blue-900/40 text-blue-300",
  Abigail:        "bg-purple-900/40 text-purple-300",
  Ignatius:       "bg-yellow-900/40 text-yellow-300",
  Alph:           "bg-pink-900/40 text-pink-300",
  "Jason + Alph": "bg-teal/10 text-teal",
  All:            "bg-green-900/40 text-green-300",
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

function TaskForm({ initial, existingGroups, onSave, onClose }) {
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
            placeholder="What needs to happen?"
            autoFocus
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className={inputCls + " resize-none"}
            placeholder="Context, links, dependencies…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner">
            <select value={form.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls}>
              {OWNERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input
              type="date"
              value={form.due_date || ""}
              onChange={(e) => set("due_date", e.target.value)}
              className={inputCls}
            />
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
        <Field label="Group">
          {/* Free-text with datalist — type a new name to create a new group */}
          <input
            list="group-options"
            value={form.week_label}
            onChange={(e) => set("week_label", e.target.value)}
            className={inputCls}
            placeholder="Type to select or create a group…"
          />
          <datalist id="group-options">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
          <p className="text-gray-600 text-xs mt-1">
            Type an existing group name to assign, or type a new name to create one.
          </p>
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
          disabled={!form.title.trim()}
          className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </>
  );
}

function TaskCard({ item, onEdit, onDelete, onCycle }) {
  const isDone       = item.status === "Done";
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
        {isDone       && <span className="text-green-400 text-xs">✓</span>}
        {isInProgress && <span className="w-2 h-2 rounded-full bg-amber block" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold leading-tight ${isDone ? "line-through text-gray-500" : "text-white"}`}>
            {item.title}
          </span>
          <PriorityBadge priority={item.priority} />
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${OWNER_BADGE[item.owner] ?? "bg-gray-800 text-gray-400"}`}>
            {item.owner}
          </span>
        </div>
        {item.description && (
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.description}</p>
        )}
        {item.due_date && (
          <div className={`text-xs mt-1.5 font-medium ${dueSoon ? "text-red-400" : "text-gray-600"}`}>
            Due{" "}
            {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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

function NewGroupPrompt({ existingGroups, onConfirm, onClose }) {
  const [name, setName] = useState("");
  return (
    <Modal open onClose={onClose} title="New Group">
      <div className="space-y-4">
        <Field label="Group Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); }}
            className={inputCls}
            placeholder="e.g. June Sprint, Q3 Fundraising, Engineering Phase 2…"
            autoFocus
          />
        </Field>
        {existingGroups.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Existing groups:</p>
            <div className="flex flex-wrap gap-1.5">
              {existingGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => onConfirm(g)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg">Cancel</button>
        <button
          onClick={() => { if (name.trim()) onConfirm(name.trim()); }}
          disabled={!name.trim()}
          className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light disabled:opacity-40"
        >
          Create Group
        </button>
      </div>
    </Modal>
  );
}

export default function ActionItems() {
  const qc       = useQueryClient();
  const { log }  = useActivity();
  const [modal, setModal]           = useState(null); // { mode: 'add'|'edit', data: {} }
  const [newGroupPrompt, setNewGroupPrompt] = useState(false);
  const [filterOwner, setFilterOwner]       = useState("All");
  const [filterStatus, setFilterStatus]     = useState("All");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["action_items"],
    queryFn: () =>
      supabase.from("action_items").select("*").order("due_date", { nullsFirst: false }).then((r) => r.data ?? []),
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

  // Derive groups dynamically from data — sorted alphabetically
  const allGroups = [...new Set(items.map((i) => i.week_label).filter(Boolean))].sort();

  // Apply filters
  const visibleItems = items.filter((i) => {
    if (filterOwner  !== "All" && i.owner  !== filterOwner)  return false;
    if (filterStatus !== "All" && i.status !== filterStatus) return false;
    return true;
  });

  // Group visible items
  const byGroup    = Object.fromEntries(allGroups.map((g) => [g, visibleItems.filter((i) => i.week_label === g)]));
  const ungrouped  = visibleItems.filter((i) => !i.week_label);

  const done     = items.filter((i) => i.status === "Done").length;
  const critical = items.filter((i) => i.priority === "Critical" && i.status !== "Done").length;

  const openAddWithGroup = (group = "") =>
    setModal({ mode: "add", data: { ...EMPTY, week_label: group } });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Action Items</h1>
          <p className="text-gray-500 text-sm mt-1">
            {done}/{items.length} complete · {critical} critical remaining · {allGroups.length} groups
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setNewGroupPrompt(true)}
            className="px-4 py-2 bg-navy-800 border border-navy-700 text-gray-300 text-sm font-semibold rounded-lg hover:border-gray-500 hover:text-white transition-colors"
          >
            + New Group
          </button>
          <button
            onClick={() => openAddWithGroup(allGroups[0] ?? "")}
            className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Overall progress</span>
          <span>{items.length > 0 ? Math.round((done / items.length) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-700"
            style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="bg-navy-800 border border-navy-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal cursor-pointer"
        >
          <option value="All">All owners</option>
          {OWNERS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-navy-800 border border-navy-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal cursor-pointer"
        >
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(filterOwner !== "All" || filterStatus !== "All") && (
          <button
            onClick={() => { setFilterOwner("All"); setFilterStatus("All"); }}
            className="text-xs text-gray-500 hover:text-white transition-colors px-1"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">◆</div>
          <p className="text-gray-500 text-sm">No tasks yet.</p>
          <button
            onClick={() => openAddWithGroup("")}
            className="mt-4 px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Ungrouped tasks (no group label) */}
          {ungrouped.length > 0 && (
            <Group
              label="Ungrouped"
              items={ungrouped}
              onAddTask={() => openAddWithGroup("")}
              onEdit={(item) => setModal({ mode: "edit", data: item })}
              onDelete={(item) => { if (window.confirm("Delete this task?")) remove.mutate(item); }}
              onCycle={(item) => cycleStatus.mutate(item)}
            />
          )}

          {/* Dynamic groups */}
          {allGroups.map((group) => {
            const groupItems = byGroup[group] ?? [];
            // Only render if there are items in this group (filters may hide all of them)
            const totalInGroup = items.filter((i) => i.week_label === group).length;
            if (totalInGroup === 0) return null;
            return (
              <Group
                key={group}
                label={group}
                items={groupItems}
                totalCount={totalInGroup}
                onAddTask={() => openAddWithGroup(group)}
                onEdit={(item) => setModal({ mode: "edit", data: item })}
                onDelete={(item) => { if (window.confirm("Delete this task?")) remove.mutate(item); }}
                onCycle={(item) => cycleStatus.mutate(item)}
              />
            );
          })}
        </div>
      )}

      {/* New Group prompt */}
      {newGroupPrompt && (
        <NewGroupPrompt
          existingGroups={allGroups}
          onConfirm={(name) => {
            setNewGroupPrompt(false);
            openAddWithGroup(name);
          }}
          onClose={() => setNewGroupPrompt(false)}
        />
      )}

      {/* Add / Edit task modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Task" : "Add Task"}
      >
        {modal && (
          <TaskForm
            initial={modal.data}
            existingGroups={allGroups}
            onSave={(form) => upsert.mutate(form)}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function Group({ label, items, totalCount, onAddTask, onEdit, onDelete, onCycle }) {
  const done  = items.filter((i) => i.status === "Done").length;
  const total = totalCount ?? items.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">{label}</h2>
        <div className="flex-1 h-px bg-navy-700" />
        <span className="text-xs text-gray-600 shrink-0">{done}/{total}</span>
        <button
          onClick={onAddTask}
          className="text-xs text-gray-600 hover:text-teal transition-colors shrink-0"
          title={`Add task to ${label}`}
        >
          + task
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-700 text-xs italic pl-1">All tasks filtered out.</p>
        ) : (
          items.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onCycle={onCycle}
            />
          ))
        )}
      </div>
    </div>
  );
}
