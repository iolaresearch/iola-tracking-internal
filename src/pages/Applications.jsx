import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge, { STATUS_STYLE } from "../components/StatusBadge";
import PriorityBadge, { PRIORITY_COLOR } from "../components/PriorityBadge";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

const STATUSES   = ["Not Yet Applied","Applied","In Progress","Accepted","Rejected","Pending"];
const TYPES      = ["Accelerator","Grant","VC / Angel","Partnership","Academic"];
const PRIORITIES = ["Critical","High","Medium","Low"];

const TYPE_STYLE = {
  "Accelerator": { bg: "rgba(14,205,183,0.1)",  c: "#0ECDB7" },
  "Grant":       { bg: "rgba(74,222,128,0.1)",  c: "#4ADE80" },
  "VC / Angel":  { bg: "rgba(245,166,35,0.1)",  c: "#F5A623" },
  "Partnership": { bg: "rgba(192,132,252,0.1)", c: "#C084FC" },
  "Academic":    { bg: "rgba(96,165,250,0.1)",  c: "#60A5FA" },
};

const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : null;

const EMPTY = { name:"", type:"Accelerator", region:"", amount:"", status:"Not Yet Applied", priority:"High", fund_description:"", next_step:"", notes:"", deadline:"", contact_name:"", owner:"Jason" };

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "span 1" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function AppForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Name"><input value={f.name} onChange={e => set("name", e.target.value)} className="iola-input" autoFocus /></Field>
      <Field label="Amount"><input value={f.amount} onChange={e => set("amount", e.target.value)} className="iola-input" placeholder="e.g. $500K" /></Field>
      <Field label="Type">
        <select value={f.type} onChange={e => set("type", e.target.value)} className="iola-input">
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select value={f.status} onChange={e => set("status", e.target.value)} className="iola-input">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select value={f.priority} onChange={e => set("priority", e.target.value)} className="iola-input">
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Region"><input value={f.region} onChange={e => set("region", e.target.value)} className="iola-input" /></Field>
      <Field label="Deadline"><input type="date" value={f.deadline || ""} onChange={e => set("deadline", e.target.value)} className="iola-input" /></Field>
      <Field label="Owner"><input value={f.owner} onChange={e => set("owner", e.target.value)} className="iola-input" /></Field>
      <Field label="Contact"><input value={f.contact_name} onChange={e => set("contact_name", e.target.value)} className="iola-input" /></Field>
      <Field label="Next Step"><input value={f.next_step} onChange={e => set("next_step", e.target.value)} className="iola-input" /></Field>
      <Field label="Fund Description" full><textarea value={f.fund_description} onChange={e => set("fund_description", e.target.value)} rows={2} className="iola-input" style={{ resize: "none" }} /></Field>
      <Field label="Notes" full><textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={2} className="iola-input" style={{ resize: "none" }} /></Field>
      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button className="iola-btn iola-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="iola-btn iola-btn-primary" onClick={() => onSave(f)} disabled={!f.name.trim()}>Save</button>
      </div>
    </div>
  );
}

export default function Applications() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [fStatus, setFStatus]     = useState("All");
  const [fType, setFType]         = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [modal, setModal]         = useState(null);
  const { confirm, dialogProps }  = useConfirm();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => supabase.from("applications").select("*")
      .order("priority", { ascending: true }) // will be overridden client-side
      .order("created_at", { ascending: false })
      .then(r => {
        const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (r.data ?? []).sort((a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
          new Date(b.created_at) - new Date(a.created_at)
        );
      }),
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
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("applications").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("applications").delete().eq("id", id);
      await log({ action: "deleted application", entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); },
  });

  const filtered = apps.filter(a =>
    (fStatus   === "All" || a.status   === fStatus) &&
    (fType     === "All" || a.type     === fType) &&
    (fPriority === "All" || a.priority === fPriority)
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)" }}>Applications & Grants</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            {apps.length} total · {apps.filter(a => ["In Progress","Applied"].includes(a.status)).length} active · {apps.filter(a => a.status === "Accepted").length} accepted
          </p>
        </div>
        <button className="iola-btn iola-btn-primary" onClick={() => setModal({ mode: "add", data: EMPTY })}>+ Add</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { val: fStatus,   set: setFStatus,   opts: ["All Status", ...STATUSES] },
          { val: fType,     set: setFType,     opts: ["All Types",  ...TYPES] },
          { val: fPriority, set: setFPriority, opts: ["All Priorities", ...PRIORITIES] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => f.set(e.target.value)} className="iola-input" style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {(fStatus !== "All" || fType !== "All" || fPriority !== "All") && (
          <button className="iola-btn iola-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}
                  onClick={() => { setFStatus("All"); setFType("All"); setFPriority("All"); }}>Clear</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--tf)", fontWeight: 500 }}>{filtered.length} results</span>
      </div>

      <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--b)" }}>
                {["", "Name", "Type", "Region", "Amount", "Status", "Deadline", "Owner", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--tff)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ padding: "56px 24px", textAlign: "center", color: "var(--tf)", fontSize: 13 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "56px 24px", textAlign: "center", color: "var(--tf)", fontSize: 13 }}>No applications match current filters.</td></tr>
              ) : filtered.map(row => {
                const days = daysUntil(row.deadline);
                const urgDL = days !== null && days <= 7 && days >= 0;
                const ts = TYPE_STYLE[row.type] || { bg: "rgba(232,238,244,0.06)", c: "rgba(232,238,244,0.38)" };
                return (
                  <tr key={row.id} className="row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
                    <td style={{ padding: "11px 10px 11px 16px", width: 22 }}>
                      <PriorityBadge priority={row.priority} dot />
                    </td>
                    <td style={{ padding: "11px 14px", maxWidth: 230 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t)", lineHeight: 1.3 }}>{row.name}</div>
                      {row.next_step && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 210 }}>→ {row.next_step}</div>}
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <span className="iola-pill" style={{ background: ts.bg, color: ts.c }}>{row.type}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--tm)", whiteSpace: "nowrap" }}>{row.region || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{row.amount || "—"}</td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <select value={row.status} onChange={e => updateStatus.mutate({ id: row.id, status: e.target.value, name: row.name })}
                              className="iola-input" style={{
                                width: "auto", fontSize: 11, padding: "3px 8px",
                                background: STATUS_STYLE[row.status]?.bg || "var(--s2)",
                                color: STATUS_STYLE[row.status]?.c || "var(--tm)",
                                borderColor: "transparent", cursor: "pointer", fontWeight: 600, borderRadius: 100,
                              }}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {row.deadline ? (
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: urgDL ? "#F87171" : "var(--tm)" }}>{fmtDate(row.deadline)}</span>
                          {days !== null && days >= 0 && <span style={{ fontSize: 10, marginLeft: 6, color: urgDL ? "#F87171" : "var(--tff)" }}>({days}d)</span>}
                        </div>
                      ) : <span style={{ color: "var(--tff)", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--tm)", whiteSpace: "nowrap" }}>{row.owner || "—"}</td>
                    <td style={{ padding: "11px 16px 11px 4px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="iola-btn iola-btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => setModal({ mode: "edit", data: row })}>Edit</button>
                        <button className="iola-btn iola-btn-danger" style={{ padding: "3px 8px", fontSize: 11 }} onClick={async () => { if (await confirm("Delete application", `Remove "${row.name}" permanently?`)) remove.mutate({ id: row.id, name: row.name }); }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Application" : "New Application"}>
        {modal && <AppForm initial={modal.data} onSave={f => upsert.mutate(f)} onClose={() => setModal(null)} />}
      </Modal>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
