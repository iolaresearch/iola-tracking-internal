import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";

const STATUSES = ["Active", "Pending", "Warm", "Cold", "Done"];
const EMPTY = {
  name: "", role: "", region: "", status: "Warm",
  last_contact: "", notes: "", next_step: "", owner: "Jason",
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

const BORDER_BY_STATUS = {
  Active:  "border-l-teal",
  Pending: "border-l-amber",
  Warm:    "border-l-amber-400/50",
  Cold:    "border-l-gray-600",
  Done:    "border-l-green-600",
};

function ContactCard({ c, onEdit, onDelete, onStatusChange }) {
  const borderColor = BORDER_BY_STATUS[c.status] ?? "border-l-gray-700";
  return (
    <div
      className={`bg-navy-800 rounded-xl border-l-4 ${borderColor} border border-navy-700 p-5 hover:border-navy-600 transition-colors`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white font-bold text-base">{c.name}</span>
            <StatusBadge status={c.status} />
          </div>
          <div className="text-gray-400 text-sm mt-0.5">
            {c.role}
            {c.region ? ` · ${c.region}` : ""}
          </div>
          {c.notes && (
            <div className="text-gray-400 text-sm mt-2 bg-navy/50 rounded-lg px-3 py-2 leading-relaxed">
              {c.notes}
            </div>
          )}
          {c.next_step && (
            <div className="text-teal text-sm font-semibold mt-2">→ {c.next_step}</div>
          )}
          {c.last_contact && (
            <div className="text-gray-600 text-xs mt-2">
              Last contact:{" "}
              {new Date(c.last_contact).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end shrink-0">
          <select
            value={c.status}
            onChange={(e) => onStatusChange(c.id, e.target.value, c.name)}
            className="bg-navy border border-navy-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal cursor-pointer"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(c)}
              className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(c)}
              className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Del
            </button>
          </div>
          <span className="text-gray-600 text-xs">{c.owner}</span>
        </div>
      </div>
    </div>
  );
}

function ContactForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Role">
          <input value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Region">
          <input value={form.region} onChange={(e) => set("region", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Owner">
          <input value={form.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Last Contact">
          <input type="date" value={form.last_contact || ""} onChange={(e) => set("last_contact", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Next Step">
          <input value={form.next_step} onChange={(e) => set("next_step", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
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

export default function Outreach() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["outreach"],
    queryFn: () =>
      supabase
        .from("outreach")
        .select("*")
        .order("last_contact", { ascending: false })
        .then((r) => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("outreach").update(row).eq("id", row.id);
        await log({ action: "updated contact", entityType: "outreach", entityId: row.id, entityName: row.name });
      } else {
        const { data } = await supabase.from("outreach").insert(row).select().single();
        await log({ action: "added contact", entityType: "outreach", entityId: data.id, entityName: row.name });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["outreach"]);
      qc.invalidateQueries(["activity_log"]);
      setModal(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("outreach").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => {
      qc.invalidateQueries(["outreach"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("outreach").delete().eq("id", id);
      await log({ action: "deleted contact", entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => {
      qc.invalidateQueries(["outreach"]);
      qc.invalidateQueries(["activity_log"]);
    },
  });

  const filtered = contacts.filter(
    (c) => filterStatus === "All" || c.status === filterStatus
  );

  const active = contacts.filter((c) => c.status === "Active").length;
  const pending = contacts.filter((c) => c.status === "Pending").length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Outreach & Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">
            {contacts.length} contacts · {active} active · {pending} pending
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", data: EMPTY })}
          className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filterStatus === s
                ? "bg-teal text-white"
                : "bg-navy-800 text-gray-400 border border-navy-700 hover:text-white hover:border-gray-600"
            }`}
          >
            {s}
            {s !== "All" && (
              <span className="ml-1.5 opacity-60">
                {contacts.filter((c) => c.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No contacts match the current filter.</p>
          )}
          {filtered.map((c) => (
            <ContactCard
              key={c.id}
              c={c}
              onEdit={(c) => setModal({ mode: "edit", data: c })}
              onDelete={(c) => {
                if (window.confirm(`Delete ${c.name}?`))
                  remove.mutate({ id: c.id, name: c.name });
              }}
              onStatusChange={(id, status, name) =>
                updateStatus.mutate({ id, status, name })
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Contact" : "Add Contact"}
      >
        {modal && (
          <ContactForm
            initial={modal.data}
            onSave={(form) => upsert.mutate(form)}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
