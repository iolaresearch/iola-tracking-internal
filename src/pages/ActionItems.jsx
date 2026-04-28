import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import { notifyAssigned } from "../lib/notifications";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES   = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const WEEKS      = [
  "Week 1 — Apr 28 to May 4",
  "Week 2 — May 5 to May 11",
  "Week 3 — May 12 to May 18",
  "Week 4 — May 19 to May 31",
];
const OWNERS = ["Jason", "Salami", "Abigail", "Ignatius", "Alph"];

const EMPTY = {
  title: "", description: "", owners: ["Jason"], owner: "Jason", due_date: "",
  status: "To Do", priority: "High", week_label: "", sort_order: 0,
};

const OWNER_BADGE = {
  Jason:    { bg: "rgba(14,205,183,0.12)",  c: "#0ECDB7" },
  Salami:   { bg: "rgba(96,165,250,0.12)",  c: "#60A5FA" },
  Abigail:  { bg: "rgba(192,132,252,0.12)", c: "#C084FC" },
  Ignatius: { bg: "rgba(253,211,77,0.12)",  c: "#FCD34D" },
  Alph:     { bg: "rgba(244,114,182,0.12)", c: "#F472B6" },
  All:      { bg: "rgba(74,222,128,0.12)",  c: "#4ADE80" },
};

const STATUS_CYCLE = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };

const PRIORITY_COLORS = {
  Critical: "#ef4444",
  High:     "#f59e0b",
  Medium:   "#3b82f6",
  Low:      "#6b7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "span 1" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function TaskForm({ initial, existingGroups, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial, owners: initial.owners?.length ? initial.owners : (initial.owner ? [initial.owner] : ["Jason"]) });
  const [notify, setNotify] = useState(!initial.id); // notify by default on new tasks
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleOwner = (name) => {
    setForm((f) => {
      const has = f.owners.includes(name);
      const next = has ? f.owners.filter((o) => o !== name) : [...f.owners, name];
      return { ...f, owners: next, owner: next[0] ?? "" };
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Title" full><input value={form.title} onChange={e => set("title", e.target.value)} className="iola-input" autoFocus /></Field>
      <Field label="Description" full><textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className="iola-input" style={{ resize: "none" }} /></Field>
      <Field label="Assigned to" full>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
          {OWNERS.map(name => {
            const ob = OWNER_BADGE[name];
            const sel = form.owners.includes(name);
            return (
              <button key={name} type="button" onClick={() => toggleOwner(name)} style={{
                padding: "5px 11px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${sel ? (ob?.c + "55") : "var(--b)"}`,
                background: sel ? (ob?.bg || "var(--a-dim)") : "transparent",
                color: sel ? (ob?.c || "var(--accent)") : "var(--tm)",
                transition: "all 0.12s", fontFamily: "var(--font)",
              }}>{sel ? "✓ " : ""}{name}</button>
            );
          })}
        </div>
        {form.owners.length === 0 && <p style={{ fontSize: 11, color: "#F87171", marginTop: 4 }}>Select at least one person.</p>}
      </Field>
      <Field label="Due Date"><input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} className="iola-input" /></Field>
      <Field label="Status">
        <select value={form.status} onChange={e => set("status", e.target.value)} className="iola-input">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select value={form.priority} onChange={e => set("priority", e.target.value)} className="iola-input">
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Group">
        <input list="group-options" value={form.week_label} onChange={e => set("week_label", e.target.value)} className="iola-input" placeholder="Select or create…" />
        <datalist id="group-options">{existingGroups.map(g => <option key={g} value={g} />)}</datalist>
      </Field>
      <Field label="Notify by email" full>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setNotify(n => !n)}>
          <div style={{ width: 34, height: 18, borderRadius: 9, position: "relative", background: notify ? "var(--accent)" : "var(--b2)", transition: "background 0.15s" }}>
            <div style={{ position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "transform 0.15s", transform: notify ? "translateX(18px)" : "translateX(2px)" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--tm)" }}>Send email to newly assigned people</span>
        </div>
      </Field>
      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button className="iola-btn iola-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="iola-btn iola-btn-primary" onClick={() => onSave({ ...form, notify })} disabled={!form.title.trim() || !form.owners.length}>Save</button>
      </div>
    </div>
  );
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────

function SortableTaskCard({ item, onEdit, onDelete, onCycle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onCycle={onCycle}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function TaskCard({ item, onEdit, onDelete, onCycle, dragHandleProps = {} }) {
  const isDone       = item.status === "Done";
  const isInProgress = item.status === "In Progress";
  const dueSoon = item.due_date && !isDone &&
    new Date(item.due_date) - new Date() < 3 * 86400000 &&
    new Date(item.due_date) >= new Date();

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 13px", borderRadius: 8,
      border: `1px solid ${isDone ? "rgba(255,255,255,0.03)" : item.priority === "Critical" ? "rgba(248,113,113,0.14)" : "var(--b)"}`,
      background: isDone ? "rgba(255,255,255,0.01)" : "var(--s1)",
      opacity: isDone ? 0.5 : 1, transition: "opacity 0.2s",
    }}>
      <div {...dragHandleProps} style={{ marginTop: 2, flexShrink: 0, cursor: "grab", color: "rgba(255,255,255,0.15)", userSelect: "none", fontSize: 12 }} title="Drag to reorder">⋮⋮</div>
      <button onClick={() => onCycle(item)} title={`Mark ${STATUS_CYCLE[item.status]}`} style={{
        marginTop: 2, width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
        border: `1.5px solid ${isDone ? "#4ADE80" : isInProgress ? "#F5A623" : "rgba(255,255,255,0.18)"}`,
        background: isDone ? "rgba(74,222,128,0.14)" : "transparent",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
      }}>
        {isDone       && <span style={{ fontSize: 8, color: "#4ADE80" }}>✓</span>}
        {isInProgress && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F5A623", display: "block" }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <PriorityBadge priority={item.priority} dot />
          <span style={{ fontSize: 13, fontWeight: 600, color: isDone ? "var(--tm)" : "var(--t)", textDecoration: isDone ? "line-through" : "none" }}>{item.title}</span>
          {(item.owners?.length ? item.owners : [item.owner]).filter(Boolean).map(o => {
            const ob = OWNER_BADGE[o] || { bg: "rgba(255,255,255,0.06)", c: "rgba(232,238,244,0.38)" };
            return <span key={o} style={{ fontSize: 10, fontWeight: 700, color: ob.c, background: ob.bg, padding: "1px 6px", borderRadius: 100 }}>{o}</span>;
          })}
        </div>
        {item.description && <p style={{ fontSize: 12, color: "var(--tm)", marginTop: 3, lineHeight: 1.55 }}>{item.description}</p>}
        {item.due_date && (
          <span style={{ fontSize: 11, color: dueSoon ? "#F87171" : "var(--tff)", marginTop: 4, display: "block", fontWeight: dueSoon ? 600 : 400 }}>
            Due {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{dueSoon ? " ⚡" : ""}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="iola-btn iola-btn-ghost" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onEdit(item)}>Edit</button>
        <button className="iola-btn iola-btn-danger" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onDelete(item)}>Del</button>
      </div>
    </div>
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

function Group({ label, items, totalCount, onAddTask, onEdit, onDelete, onCycle }) {
  const done  = items.filter((i) => i.status === "Done").length;
  const total = totalCount ?? items.length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: "var(--b)" }} />
        <span style={{ fontSize: 10, color: "var(--tff)", fontWeight: 600 }}>{done}/{total}</span>
        <button onClick={onAddTask} style={{ fontSize: 11, color: "var(--tff)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontFamily: "var(--font)", fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--tff)"}>+ task</button>
      </div>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {items.length === 0 && <p style={{ color: "var(--tff)", fontSize: 12, paddingLeft: 2, fontStyle: "italic" }}>No tasks match filters.</p>}
          {items.map(item => <SortableTaskCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onCycle={onCycle} />)}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── New Group Prompt ─────────────────────────────────────────────────────────

function NewGroupPrompt({ existingGroups, onConfirm, onClose }) {
  const [name, setName] = useState("");
  return (
    <Modal open onClose={onClose} title="New Group">
      <Field label="Group Name">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); }}
               className="iola-input" placeholder="e.g. June Sprint, Q3 Fundraising…" autoFocus />
      </Field>
      {existingGroups.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, color: "var(--tf)", marginBottom: 7 }}>Existing groups:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {existingGroups.map(g => (
              <button key={g} onClick={() => onConfirm(g)} className="iola-btn iola-btn-ghost" style={{ fontSize: 11, padding: "4px 9px" }}>{g}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button className="iola-btn iola-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="iola-btn iola-btn-primary" onClick={() => { if (name.trim()) onConfirm(name.trim()); }} disabled={!name.trim()}>Create Group</button>
      </div>
    </Modal>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ items, onEdit }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const itemsByDate = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      if (!item.due_date) return;
      const d = item.due_date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [items]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const cells = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--b)" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: "var(--tm)", cursor: "pointer", fontSize: 18, padding: "0 8px" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--t)"} onMouseLeave={e => e.currentTarget.style.color = "var(--tm)"}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--t)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", color: "var(--tm)", cursor: "pointer", fontSize: 18, padding: "0 8px" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--t)"} onMouseLeave={e => e.currentTarget.style.color = "var(--tm)"}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--b)" }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} style={{ padding: "8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--tff)", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ minHeight: 80, borderBottom: "1px solid rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.03)" }} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = itemsByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          return (
            <div key={dateStr} style={{ minHeight: 80, borderBottom: "1px solid rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.03)", padding: 6, opacity: isPast && !isToday ? 0.6 : 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#021A17" : "var(--tff)" }}>{day}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayItems.slice(0, 3).map(item => (
                  <button key={item.id} onClick={() => onEdit(item)} title={item.title} style={{
                    width: "100%", textAlign: "left", padding: "2px 5px", borderRadius: 4, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    background: PRIORITY_COLORS[item.priority] + "22", color: PRIORITY_COLORS[item.priority],
                    borderLeft: `2px solid ${PRIORITY_COLORS[item.priority]}`, border: "none", cursor: "pointer",
                    textDecoration: item.status === "Done" ? "line-through" : "none", opacity: item.status === "Done" ? 0.5 : 1, fontFamily: "var(--font)",
                  }}>{item.title}</button>
                ))}
                {dayItems.length > 3 && <div style={{ fontSize: 10, color: "var(--tff)", paddingLeft: 2 }}>+{dayItems.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActionItems() {
  const qc       = useQueryClient();
  const { log }  = useActivity();
  const [modal, setModal]                   = useState(null);
  const [newGroupPrompt, setNewGroupPrompt] = useState(false);
  const [filterOwner, setFilterOwner]       = useState("All");
  const [filterStatus, setFilterStatus]     = useState("All");
  const [view, setView]                     = useState("list"); // "list" | "calendar"
  const [activeId, setActiveId]             = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["action_items"],
    queryFn: () =>
      supabase.from("action_items").select("*")
        .order("week_label", { nullsFirst: false })
        .order("sort_order")
        .order("due_date", { nullsFirst: false })
        .then((r) => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      const { notify, ...payload } = row;
      // Keep owner in sync with first owner for backwards compat
      payload.owner = payload.owners?.[0] ?? payload.owner ?? "";

      const { data: { session } } = await supabase.auth.getSession();
      const assignedBy = session?.user?.email?.split("@")[0] ?? "Someone";

      if (payload.id) {
        const prev = items.find((i) => i.id === payload.id);
        await supabase.from("action_items").update(payload).eq("id", payload.id);
        await log({ action: "updated task", entityType: "action_item", entityId: payload.id, entityName: payload.title });

        // Notify only newly added owners
        if (notify && payload.owners?.length) {
          const prevOwners = prev?.owners ?? [];
          const newOwners = payload.owners.filter((o) => !prevOwners.includes(o));
          if (newOwners.length > 0) {
            await notifyAssigned({
              taskTitle: payload.title,
              taskDescription: payload.description,
              dueDate: payload.due_date,
              priority: payload.priority,
              group: payload.week_label,
              assignedBy,
              ownerNames: newOwners,
            });
          }
        }
      } else {
        const groupItems = items.filter((i) => i.week_label === payload.week_label);
        const maxOrder = groupItems.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
        const { data } = await supabase.from("action_items").insert({ ...payload, sort_order: maxOrder + 1 }).select().single();
        await log({ action: "added task", entityType: "action_item", entityId: data.id, entityName: payload.title });

        if (notify && payload.owners?.length) {
          await notifyAssigned({
            taskTitle: payload.title,
            taskDescription: payload.description,
            dueDate: payload.due_date,
            priority: payload.priority,
            group: payload.week_label,
            assignedBy,
            ownerNames: payload.owners,
          });
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const cycleStatus = useMutation({
    mutationFn: async (item) => {
      const next = STATUS_CYCLE[item.status];
      await supabase.from("action_items").update({ status: next }).eq("id", item.id);
      await log({ action: `marked ${next}`, entityType: "action_item", entityId: item.id, entityName: item.title });
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async (item) => {
      await supabase.from("action_items").delete().eq("id", item.id);
      await log({ action: "deleted task", entityType: "action_item", entityId: item.id, entityName: item.title });
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); },
  });

  const allGroups = [...new Set(items.map((i) => i.week_label).filter(Boolean))].sort();

  const visibleItems = items.filter((i) => {
    if (filterOwner  !== "All" && i.owner  !== filterOwner)  return false;
    if (filterStatus !== "All" && i.status !== filterStatus) return false;
    return true;
  });

  const byGroup   = Object.fromEntries(allGroups.map((g) => [g, visibleItems.filter((i) => i.week_label === g)]));
  const ungrouped = visibleItems.filter((i) => !i.week_label);

  const done     = items.filter((i) => i.status === "Done").length;
  const critical = items.filter((i) => i.priority === "Critical" && i.status !== "Done").length;
  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const openAddWithGroup = (group = "") =>
    setModal({ mode: "add", data: { ...EMPTY, week_label: group } });

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem   = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;

    // Items must be in the same group
    if (activeItem.week_label !== overItem.week_label) return;

    const group     = activeItem.week_label;
    const groupItems = [...items.filter((i) => i.week_label === group)].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const oldIndex  = groupItems.findIndex((i) => i.id === active.id);
    const newIndex  = groupItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(groupItems, oldIndex, newIndex);

    // Optimistic update
    qc.setQueryData(["action_items"], (old) => {
      if (!old) return old;
      const reorderedMap = Object.fromEntries(reordered.map((item, idx) => [item.id, idx]));
      return old.map((i) => reorderedMap[i.id] !== undefined ? { ...i, sort_order: reorderedMap[i.id] } : i);
    });

    // Persist to Supabase
    await Promise.all(
      reordered.map((item, idx) =>
        supabase.from("action_items").update({ sort_order: idx }).eq("id", item.id)
      )
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)" }}>Action Items</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            {done}/{items.length} complete · {critical} critical open · {allGroups.length} groups
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 7, padding: 2 }}>
            {["list","calendar"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#021A17" : "var(--tm)", fontFamily: "var(--font)", transition: "all 0.12s",
              }}>{v === "list" ? "List" : "Calendar"}</button>
            ))}
          </div>
          <button className="iola-btn iola-btn-ghost" onClick={() => setNewGroupPrompt(true)}>+ New Group</button>
          <button className="iola-btn iola-btn-primary" onClick={() => openAddWithGroup(allGroups[0] ?? "")}>+ Add Task</button>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--tf)", marginBottom: 5, fontWeight: 600 }}>
          <span>Overall progress</span><span>{items.length > 0 ? Math.round((done / items.length) * 100) : 0}%</span>
        </div>
        <div style={{ height: 2, background: "var(--b)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${items.length > 0 ? (done / items.length) * 100 : 0}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.6s ease" }} />
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarView items={items} onEdit={item => setModal({ mode: "edit", data: item })} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="iola-input" style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}>
              <option value="All">All owners</option>
              {OWNERS.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="iola-input" style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}>
              <option value="All">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            {(filterOwner !== "All" || filterStatus !== "All") && (
              <button className="iola-btn iola-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => { setFilterOwner("All"); setFilterStatus("All"); }}>Clear</button>
            )}
          </div>

          {isLoading ? <p style={{ color: "var(--tf)", fontSize: 13 }}>Loading…</p> : (
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={({ active }) => setActiveId(active.id)}
              onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
              <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                {ungrouped.length > 0 && (
                  <Group label="Ungrouped" items={ungrouped}
                    onAddTask={() => openAddWithGroup("")}
                    onEdit={item => setModal({ mode: "edit", data: item })}
                    onDelete={item => { if (window.confirm("Delete this task?")) remove.mutate(item); }}
                    onCycle={item => cycleStatus.mutate(item)} />
                )}
                {allGroups.map(group => {
                  const groupItems = byGroup[group] ?? [];
                  const totalInGroup = items.filter(i => i.week_label === group).length;
                  if (totalInGroup === 0) return null;
                  return (
                    <Group key={group} label={group} items={groupItems} totalCount={totalInGroup}
                      onAddTask={() => openAddWithGroup(group)}
                      onEdit={item => setModal({ mode: "edit", data: item })}
                      onDelete={item => { if (window.confirm("Delete this task?")) remove.mutate(item); }}
                      onCycle={item => cycleStatus.mutate(item)} />
                  );
                })}
                {items.length === 0 && (
                  <div style={{ textAlign: "center", padding: "72px 24px" }}>
                    <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.08 }}>◆</div>
                    <p style={{ color: "var(--tm)", fontSize: 13 }}>No tasks yet.</p>
                    <button className="iola-btn iola-btn-primary" style={{ marginTop: 16 }} onClick={() => openAddWithGroup("")}>Add your first task</button>
                  </div>
                )}
              </div>
              <DragOverlay>
                {activeItem && (
                  <div style={{ transform: "rotate(1deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}>
                    <TaskCard item={activeItem} onEdit={() => {}} onDelete={() => {}} onCycle={() => {}} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {newGroupPrompt && (
        <NewGroupPrompt existingGroups={allGroups}
          onConfirm={name => { setNewGroupPrompt(false); openAddWithGroup(name); }}
          onClose={() => setNewGroupPrompt(false)} />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Task" : "Add Task"}>
        {modal && <TaskForm initial={modal.data} existingGroups={allGroups} onSave={form => upsert.mutate(form)} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
