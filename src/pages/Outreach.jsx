import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge, { STATUS_STYLE } from "../components/StatusBadge";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

const STATUSES = ["Active","Pending","Warm","Cold","Done"];
const EMPTY = { name:"", role:"", region:"", status:"Warm", last_contact:"", notes:"", next_step:"", owner:"Jason" };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "span 1" }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function ContactForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Name"><input value={f.name} onChange={e => set("name", e.target.value)} className="iola-input" autoFocus /></Field>
      <Field label="Role"><input value={f.role} onChange={e => set("role", e.target.value)} className="iola-input" /></Field>
      <Field label="Region"><input value={f.region} onChange={e => set("region", e.target.value)} className="iola-input" /></Field>
      <Field label="Owner"><input value={f.owner} onChange={e => set("owner", e.target.value)} className="iola-input" /></Field>
      <Field label="Status">
        <select value={f.status} onChange={e => set("status", e.target.value)} className="iola-input">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Last Contact"><input type="date" value={f.last_contact || ""} onChange={e => set("last_contact", e.target.value)} className="iola-input" /></Field>
      <Field label="Next Step" full><input value={f.next_step} onChange={e => set("next_step", e.target.value)} className="iola-input" /></Field>
      <Field label="Notes" full><textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={3} className="iola-input" style={{ resize: "none" }} /></Field>
      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="iola-btn iola-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="iola-btn iola-btn-primary" onClick={() => onSave(f)} disabled={!f.name.trim()}>Save</button>
      </div>
    </div>
  );
}

function ContactCard({ c, onEdit, onDel, onStatusChange }) {
  const ss = STATUS_STYLE[c.status] || {};
  const daysSince = c.last_contact ? Math.floor((Date.now() - new Date(c.last_contact)) / 86400000) : null;
  return (
    <div style={{
      background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10,
      padding: "15px 18px", display: "flex", gap: 16, alignItems: "flex-start",
      borderLeft: `2px solid ${ss.c || "var(--b)"}`, transition: "background 0.13s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--s2)"}
    onMouseLeave={e => e.currentTarget.style.background = "var(--s1)"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--t)" }}>{c.name}</span>
          <StatusBadge status={c.status} />
        </div>
        <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 3 }}>{c.role}{c.region ? ` · ${c.region}` : ""}</div>
        {c.notes && (
          <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 9, background: "rgba(255,255,255,0.025)", borderRadius: 7, padding: "8px 12px", lineHeight: 1.65 }}>{c.notes}</div>
        )}
        {c.next_step && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginTop: 7 }}>→ {c.next_step}</div>}
        {daysSince !== null && (
          <div style={{ fontSize: 11, color: "var(--tff)", marginTop: 6 }}>
            Last contact: {fmtDate(c.last_contact)} · {daysSince}d ago
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
        <select value={c.status} onChange={e => onStatusChange(c.id, e.target.value, c.name)}
                className="iola-input" style={{
                  width: "auto", fontSize: 11, padding: "3px 8px",
                  background: ss.bg, color: ss.c, borderColor: "transparent",
                  fontWeight: 600, borderRadius: 100, cursor: "pointer",
                }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="iola-btn iola-btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }} onClick={onEdit}>Edit</button>
          <button className="iola-btn iola-btn-danger" style={{ padding: "3px 8px", fontSize: 11 }} onClick={onDel}>Del</button>
        </div>
        <span style={{ fontSize: 11, color: "var(--tff)" }}>{c.owner}</span>
      </div>
    </div>
  );
}

export default function Outreach() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [fStatus, setFStatus]    = useState("All");
  const [modal, setModal]        = useState(null);
  const { confirm, dialogProps } = useConfirm();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => supabase.from("outreach").select("*").order("last_contact", { ascending: false }).then(r => r.data ?? []),
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
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("outreach").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("outreach").delete().eq("id", id);
      await log({ action: "deleted contact", entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); },
  });

  const filtered = contacts.filter(c => fStatus === "All" || c.status === fStatus);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)" }}>Outreach & Contacts</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            {contacts.length} contacts · {contacts.filter(c => c.status === "Active").length} active · {contacts.filter(c => c.status === "Warm").length} warm
          </p>
        </div>
        <button className="iola-btn iola-btn-primary" onClick={() => setModal({ mode: "add", data: EMPTY })}>+ Add Contact</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {["All", ...STATUSES].map(s => {
          const active = fStatus === s;
          const ss = STATUS_STYLE[s];
          const count = s === "All" ? contacts.length : contacts.filter(c => c.status === s).length;
          return (
            <button key={s} onClick={() => setFStatus(s)} style={{
              padding: "5px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${active && ss ? ss.c + "45" : "var(--b)"}`,
              background: active && ss ? ss.bg : (active ? "var(--a-dim)" : "transparent"),
              color: active && ss ? ss.c : (active ? "var(--accent)" : "var(--tm)"),
              transition: "all 0.13s", fontFamily: "var(--font)",
            }}>
              {s}{s !== "All" && <span style={{ marginLeft: 5, opacity: 0.55, fontSize: 11 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {isLoading ? <p style={{ color: "var(--tf)", fontSize: 13 }}>Loading…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && <p style={{ textAlign: "center", padding: "56px 24px", color: "var(--tf)", fontSize: 13 }}>No contacts match the current filter.</p>}
          {filtered.map(c => (
            <ContactCard key={c.id} c={c}
              onEdit={() => setModal({ mode: "edit", data: c })}
              onDel={async () => { if (await confirm("Delete contact", `Remove ${c.name} permanently?`)) remove.mutate({ id: c.id, name: c.name }); }}
              onStatusChange={(id, status, name) => updateStatus.mutate({ id, status, name })} />
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Contact" : "New Contact"}>
        {modal && <ContactForm initial={modal.data} onSave={f => upsert.mutate(f)} onClose={() => setModal(null)} />}
      </Modal>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
