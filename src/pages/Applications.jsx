import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

const STATUSES = ["Not Yet Applied", "Applied", "In Progress", "Accepted", "Rejected", "Pending"];
const TYPES    = ["Accelerator", "Grant", "VC / Angel", "Partnership", "Academic"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const TYPE_COLORS = {
  Accelerator:  "bg-indigo-900/40 text-indigo-300",
  Grant:        "bg-emerald-900/40 text-emerald-300",
  "VC / Angel": "bg-amber-900/40 text-amber-300",
  Partnership:  "bg-pink-900/40 text-pink-300",
  Academic:     "bg-blue-900/40 text-blue-300",
};

const EMPTY = {
  name: "", type: "Accelerator", region: "", amount: "", status: "Not Yet Applied",
  priority: "High", fund_description: "", next_step: "", notes: "", deadline: "",
  contact_name: "", owner: "Jason",
};

const inputCls =
  "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors placeholder-gray-600";

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

function AppForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Amount">
          <input value={form.amount} onChange={(e) => set("amount", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Region">
          <input value={form.region} onChange={(e) => set("region", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Contact">
          <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Deadline">
          <input type="date" value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Owner">
          <input value={form.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
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
        <Field label="Next Step">
          <input value={form.next_step} onChange={(e) => set("next_step", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Fund Description">
          <textarea
            value={form.fund_description}
            onChange={(e) => set("fund_description", e.target.value)}
            rows={2}
            className={inputCls + " resize-none"}
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className={inputCls + " resize-none"}
          />
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

export default function Applications() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [filterStatus, setFilterStatus]     = useState("All");
  const [filterType, setFilterType]         = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [modal, setModal] = useState(null);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () =>
      supabase.from("applications").select("*").order("created_at").then((r) => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("applications").update(row).eq("id", row.id);
        await log({ action: "updated application", entityType: "application", entityId: row.id, entityName: row.name });
      } else {
        const { data } = await supabase.from("applications").insert(row).select().single();
        await log({ action: "added application", entityType: "application", entityId: data.id, entityName: row.name });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["applications"]);
      qc.invalidateQueries(["activity_log"]);
      setModal(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("applications").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => {
      qc.invalidateQueries(["applications"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("applications").delete().eq("id", id);
      await log({ action: "deleted application", entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => {
      qc.invalidateQueries(["applications"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const filtered = apps.filter((a) => {
    if (filterStatus   !== "All" && a.status   !== filterStatus)   return false;
    if (filterType     !== "All" && a.type     !== filterType)     return false;
    if (filterPriority !== "All" && a.priority !== filterPriority) return false;
    return true;
  });

  const accepted   = apps.filter((a) => a.status === "Accepted").length;
  const inProgress = apps.filter((a) => ["In Progress", "Applied"].includes(a.status)).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Applications & Grants</h1>
          <p className="text-gray-500 text-sm mt-1">
            {apps.length} total · {inProgress} active · {accepted} accepted
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", data: EMPTY })}
          className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { value: filterStatus,   set: setFilterStatus,   opts: ["All", ...STATUSES] },
          { value: filterType,     set: setFilterType,     opts: ["All", ...TYPES] },
          { value: filterPriority, set: setFilterPriority, opts: ["All", ...PRIORITIES] },
        ].map((f, i) => (
          <select
            key={i}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="bg-navy-800 border border-navy-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal cursor-pointer"
          >
            {f.opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        {(filterStatus !== "All" || filterType !== "All" || filterPriority !== "All") && (
          <button
            onClick={() => { setFilterStatus("All"); setFilterType("All"); setFilterPriority("All"); }}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-navy-700">
              {["Name", "Type", "Region", "Amount", "Priority", "Status", "Deadline", "Owner", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">No entries match the current filters.</td>
              </tr>
            ) : (
              filtered.map((row, i) => {
                const isDeadlineSoon =
                  row.deadline &&
                  new Date(row.deadline) - new Date() < 7 * 86400000 &&
                  new Date(row.deadline) >= new Date();
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors ${
                      i % 2 === 1 ? "bg-navy/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-white font-semibold leading-tight">{row.name}</div>
                      {row.next_step && (
                        <div className="text-teal text-xs mt-0.5 truncate max-w-[200px]">→ {row.next_step}</div>
                      )}
                      {row.notes && (
                        <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{row.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[row.type] ?? ""}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{row.region}</td>
                    <td className="px-4 py-3 text-teal font-semibold text-xs whitespace-nowrap">{row.amount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={row.status}
                        onChange={(e) => updateStatus.mutate({ id: row.id, status: e.target.value, name: row.name })}
                        className="bg-navy border border-navy-700 text-gray-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal cursor-pointer"
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap ${isDeadlineSoon ? "text-red-400" : "text-gray-400"}`}>
                      {row.deadline
                        ? new Date(row.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{row.owner}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModal({ mode: "edit", data: row })}
                          className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${row.name}"?`))
                              remove.mutate({ id: row.id, name: row.name });
                          }}
                          className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Application" : "Add Application"}
      >
        {modal && (
          <AppForm
            initial={modal.data}
            onSave={(form) => upsert.mutate(form)}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
