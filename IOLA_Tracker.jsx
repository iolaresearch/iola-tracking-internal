import { useState, useEffect } from "react";

const TEAL = "#00897B";
const DARK = "#0D1B2A";
const AMBER = "#F59E0B";

const STATUS_COLORS = {
  "Applied": { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  "In Progress": { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  "Accepted": { bg: "#F0FDF4", text: "#166534", dot: "#22C55E" },
  "Rejected": { bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
  "Pending": { bg: "#F5F3FF", text: "#5B21B6", dot: "#8B5CF6" },
  "Not Yet Applied": { bg: "#F9FAFB", text: "#374151", dot: "#9CA3AF" },
};

const TYPE_COLORS = {
  "Accelerator": "#6366F1",
  "Grant": "#10B981",
  "VC / Angel": "#F59E0B",
  "Partnership": "#EC4899",
  "Academic": "#3B82F6",
};

const INITIAL_DATA = [
  { id: 1, name: "Black Flag", type: "Accelerator", region: "USA", amount: "$2M–$3M", status: "Not Yet Applied", priority: "Critical", notes: "Rolling 30-day review. Backed by Palantir, Anthropic, xAI founders. Defense/space/hardware focus. Reapply with clean deck.", contact: "", deadline: "", owner: "Jason" },
  { id: 2, name: "LVL UP Labs", type: "Accelerator", region: "USA", amount: "$250K + perks", status: "Not Yet Applied", priority: "Critical", notes: "Previously accepted. Blocked only by missing Delaware registration. Roberto (Italy) referral available. Apply immediately after C-Corp done.", contact: "", deadline: "", owner: "Jason" },
  { id: 3, name: "Techstars Europe", type: "Accelerator", region: "Europe", amount: "Varies", status: "Not Yet Applied", priority: "High", notes: "Deep tech, space, manufacturing focus. Application closes June 10.", contact: "", deadline: "2026-06-10", owner: "Jason" },
  { id: 4, name: "ESA Kick-starts", type: "Grant", region: "Europe", amount: "€75,000", status: "In Progress", priority: "Critical", notes: "Requires Germany entity via Alph. Non-dilutive. Deadline May 29. Submit via Alph.", contact: "Alph Doamekpor", deadline: "2026-05-29", owner: "Jason + Alph" },
  { id: 5, name: "SPACERAISE 2026", type: "Grant", region: "Europe", amount: "Scholarship", status: "Accepted", priority: "High", notes: "Scholarship awarded. Italy May 2026. Visa in progress. Reimbursement on arrival. Natural moment for Moira intro.", contact: "", deadline: "2026-05", owner: "Jason" },
  { id: 6, name: "Deep Learning Indaba Grants", type: "Grant", region: "Africa", amount: "Varies", status: "Pending", priority: "High", notes: "Warm relationship. Won 2025 Ideathon. Public support offered by leadership.", contact: "", deadline: "TBD", owner: "Jason + Abigail" },
  { id: 7, name: "Google for Startups", type: "Grant", region: "Global", amount: "Cloud credits", status: "Accepted", priority: "Medium", notes: "Active compute credits. RL training infrastructure running on Google cloud.", contact: "", deadline: "Rolling", owner: "Jason" },
  { id: 8, name: "Nvidia Inception", type: "Grant", region: "Global", amount: "GPU credits", status: "Accepted", priority: "Medium", notes: "Active GPU access for IkirereMesh RL training.", contact: "", deadline: "Rolling", owner: "Jason" },
  { id: 9, name: "Station F Fighters", type: "Accelerator", region: "Europe", amount: "Workspace + network", status: "Applied", priority: "High", notes: "Paris base for European fundraising. Physical presence in major ecosystem.", contact: "", deadline: "Rolling", owner: "Jason" },
  { id: 10, name: "Generation Space", type: "VC / Angel", region: "Global", amount: "Up to $10B fund", status: "Not Yet Applied", priority: "Medium", notes: "SpaceX-level investments. Loves deep space/aerospace founders.", contact: "", deadline: "", owner: "Jason" },
  { id: 11, name: "Speedrun", type: "Accelerator", region: "Global", amount: "Varies", status: "Not Yet Applied", priority: "Medium", notes: "Significant buzz around current cohort. Apply this week.", contact: "", deadline: "", owner: "Jason" },
  { id: 12, name: "Setcoin Group / DSE Fund", type: "VC / Angel", region: "Europe", amount: "€17B fund", status: "In Progress", priority: "Low", notes: "Long-term relationship only. Tickets €100M+. Olena connected via LinkedIn. Keep warm. Revisit in 18-24 months.", contact: "Olena", deadline: "", owner: "Jason" },
  { id: 13, name: "Michael Daley (SRI intro)", type: "Partnership", region: "USA", amount: "Network", status: "In Progress", priority: "Critical", notes: "Africa Space Race WhatsApp group created. Moira (SRI) and Vijay in group. Zoom call with Moira being arranged.", contact: "Michael Daley", deadline: "", owner: "Jason" },
  { id: 14, name: "Harvard Center for African Studies", type: "Academic", region: "USA", amount: "Network + grants", status: "In Progress", priority: "High", notes: "Rosalind (Associate Director) connected. Intro to Prof. Achampon pending for week of May 12. Then Prof. Dembele (School of Engineering).", contact: "Rosalind", deadline: "2026-05-12", owner: "Jason" },
  { id: 15, name: "Parsa / Spark (Vancouver)", type: "Partnership", region: "Canada", amount: "Tech partnership", status: "In Progress", priority: "Medium", notes: "Geospatial and defense tech company. 500 people. ISRO partner (chief architect of India moon missions). Offered dev support and investor intros in NY/LA. Send deck.", contact: "Parsa", deadline: "", owner: "Jason" },
];

const OUTREACH_INITIAL = [
  { id: 1, name: "Michael Daley", role: "Financial advisor / connector", region: "USA (Bay Area)", status: "Active", lastContact: "2026-04-24", notes: "Created Africa Space Race WhatsApp group with Moira and Vijay. Zoom call with Moira being arranged.", owner: "Jason", nextStep: "Wait for Moira intro in WhatsApp group" },
  { id: 2, name: "Rosalind", role: "Harvard Center for African Studies", region: "USA (Boston)", status: "Active", lastContact: "2026-04-23", notes: "Warm. Sending bio. Will intro Prof. Achampon week of May 12.", owner: "Jason", nextStep: "Email Prof. Achampon May 12" },
  { id: 3, name: "Parsa", role: "CEO, Spark (geospatial/defense tech)", region: "Canada (Vancouver)", status: "Pending", lastContact: "2026-04-22", notes: "Good call. Offered dev support, ISRO contact, and investor intros. Waiting for deck.", owner: "Jason", nextStep: "Send IOLA deck this week" },
  { id: 4, name: "Sameep", role: "Tech dev company (London/India)", region: "UK", status: "Pending", lastContact: "2026-04-22", notes: "Shared IOLA site with 2 defense contacts. Has ISRO partner. Mentioned Chilean VC for lunar rover company.", owner: "Jason", nextStep: "Follow up Monday Apr 28 — check if contacts responded, get Chilean VC name" },
  { id: 5, name: "Olena (Setcoin Group)", role: "BD / deal sourcing", region: "Europe", status: "Warm", lastContact: "2026-04-21", notes: "Sent phase roadmap. She said interesting, look when raising. Long-term play only.", owner: "Jason", nextStep: "Keep warm. Update when Phase 1 ships." },
];

export default function IOLATracker() {
  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState(INITIAL_DATA);
  const [outreach, setOutreach] = useState(OUTREACH_INITIAL);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [outreachForm, setOutreachForm] = useState({});
  const [showOutreachForm, setShowOutreachForm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const a = await window.storage.get("iola_applications");
        if (a) setApplications(JSON.parse(a.value));
        const o = await window.storage.get("iola_outreach");
        if (o) setOutreach(JSON.parse(o.value));
      } catch (e) {}
    };
    load();
  }, []);

  const saveApps = async (data) => {
    setApplications(data);
    try { await window.storage.set("iola_applications", JSON.stringify(data)); } catch (e) {}
  };

  const saveOutreach = async (data) => {
    setOutreach(data);
    try { await window.storage.set("iola_outreach", JSON.stringify(data)); } catch (e) {}
  };

  const filtered = applications.filter(a => {
    if (filterStatus !== "All" && a.status !== filterStatus) return false;
    if (filterType !== "All" && a.type !== filterType) return false;
    if (filterPriority !== "All" && a.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: applications.length,
    accepted: applications.filter(a => a.status === "Accepted").length,
    inProgress: applications.filter(a => a.status === "In Progress" || a.status === "Applied").length,
    critical: applications.filter(a => a.priority === "Critical" && a.status === "Not Yet Applied").length,
  };

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS["Pending"];
    return (
      <span style={{ background: s.bg, color: s.text, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
        {status}
      </span>
    );
  };

  const PriorityBadge = ({ p }) => {
    const colors = { Critical: "#FEE2E2", High: "#FEF3C7", Medium: "#DBEAFE", Low: "#F3F4F6" };
    const text = { Critical: "#991B1B", High: "#92400E", Medium: "#1E40AF", Low: "#374151" };
    return <span style={{ background: colors[p] || "#F3F4F6", color: text[p] || "#374151", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p}</span>;
  };

  const handleEdit = (item) => { setEditingId(item.id); setForm(item); setShowForm(true); };
  const handleAdd = () => { setEditingId(null); setForm({ type: "Accelerator", region: "Global", status: "Not Yet Applied", priority: "High", amount: "", name: "", notes: "", contact: "", deadline: "", owner: "Jason" }); setShowForm(true); };
  const handleSave = () => {
    if (editingId) {
      saveApps(applications.map(a => a.id === editingId ? { ...form, id: editingId } : a));
    } else {
      saveApps([...applications, { ...form, id: Date.now() }]);
    }
    setShowForm(false);
  };
  const handleDelete = (id) => saveApps(applications.filter(a => a.id !== id));

  const handleOutreachAdd = () => { setOutreachForm({ name: "", role: "", region: "", status: "Warm", lastContact: "", notes: "", owner: "Jason", nextStep: "" }); setShowOutreachForm(true); };
  const handleOutreachSave = () => { saveOutreach([...outreach, { ...outreachForm, id: Date.now() }]); setShowOutreachForm(false); };
  const handleOutreachDelete = (id) => saveOutreach(outreach.filter(o => o.id !== id));
  const handleOutreachStatusChange = (id, status) => saveOutreach(outreach.map(o => o.id === id ? { ...o, status } : o));

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: 20 }}>
      {/* Header */}
      <div style={{ background: DARK, borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>IOLA TRACKER</div>
          <div style={{ color: TEAL, fontSize: 13 }}>Fundraising and Outreach Dashboard</div>
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 12 }}>April 2026</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Applications", value: stats.total, color: TEAL },
          { label: "Active / Applied", value: stats.inProgress, color: "#3B82F6" },
          { label: "Accepted / Won", value: stats.accepted, color: "#22C55E" },
          { label: "Critical — Not Applied", value: stats.critical, color: "#EF4444" },
        ].map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 10, padding: "16px 18px", borderLeft: `4px solid ${s.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["applications", "outreach"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: activeTab === tab ? TEAL : "white", color: activeTab === tab ? "white" : "#374151", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            {tab === "applications" ? "Applications & Grants" : "Outreach & Contacts"}
          </button>
        ))}
      </div>

      {activeTab === "applications" && (
        <div>
          {/* Filters + Add */}
          <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {[
              { label: "Status", value: filterStatus, set: setFilterStatus, options: ["All", ...Object.keys(STATUS_COLORS)] },
              { label: "Type", value: filterType, set: setFilterType, options: ["All", ...Object.keys(TYPE_COLORS)] },
              { label: "Priority", value: filterPriority, set: setFilterPriority, options: ["All", "Critical", "High", "Medium", "Low"] },
            ].map(f => (
              <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 13, color: "#374151", cursor: "pointer" }}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <button onClick={handleAdd} style={{ marginLeft: "auto", padding: "7px 16px", background: TEAL, color: "white", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Add</button>
          </div>

          {/* Table */}
          <div style={{ background: "white", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Name", "Type", "Region", "Amount", "Priority", "Status", "Deadline", "Owner", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: DARK }}>{row.name}</div>
                      {row.notes && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, maxWidth: 220 }}>{row.notes.slice(0, 80)}{row.notes.length > 80 ? "..." : ""}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ background: TYPE_COLORS[row.type] + "18", color: TYPE_COLORS[row.type], padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.type}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>{row.region}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: TEAL }}>{row.amount}</td>
                    <td style={{ padding: "12px 14px" }}><PriorityBadge p={row.priority} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <select value={row.status} onChange={e => saveApps(applications.map(a => a.id === row.id ? { ...a, status: e.target.value } : a))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, cursor: "pointer", background: STATUS_COLORS[row.status]?.bg || "#F9FAFB", color: STATUS_COLORS[row.status]?.text || "#374151" }}>
                        {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: row.deadline ? "#374151" : "#D1D5DB" }}>{row.deadline || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>{row.owner}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => handleEdit(row)} style={{ padding: "3px 10px", border: "1px solid #E5E7EB", borderRadius: 5, background: "white", cursor: "pointer", fontSize: 11, marginRight: 4 }}>Edit</button>
                      <button onClick={() => handleDelete(row.id)} style={{ padding: "3px 10px", border: "1px solid #FEE2E2", borderRadius: 5, background: "#FFF5F5", color: "#EF4444", cursor: "pointer", fontSize: 11 }}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "outreach" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={handleOutreachAdd} style={{ padding: "7px 16px", background: TEAL, color: "white", border: "none", borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Add Contact</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {outreach.map(c => (
              <div key={c.id} style={{ background: "white", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: `4px solid ${c.status === "Active" ? TEAL : c.status === "Pending" ? AMBER : "#9CA3AF"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: DARK }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{c.role} — {c.region}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select value={c.status} onChange={e => handleOutreachStatusChange(c.id, e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, cursor: "pointer" }}>
                      {["Active", "Pending", "Warm", "Cold", "Done"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{c.owner}</span>
                    <button onClick={() => handleOutreachDelete(c.id)} style={{ padding: "3px 8px", border: "1px solid #FEE2E2", borderRadius: 5, background: "#FFF5F5", color: "#EF4444", cursor: "pointer", fontSize: 11 }}>Del</button>
                  </div>
                </div>
                {c.notes && <div style={{ fontSize: 12, color: "#374151", marginTop: 8, padding: "8px 10px", background: "#F9FAFB", borderRadius: 6 }}>{c.notes}</div>}
                {c.nextStep && <div style={{ fontSize: 12, color: TEAL, marginTop: 6, fontWeight: 600 }}>Next: {c.nextStep}</div>}
                {c.lastContact && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Last contact: {c.lastContact}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 24, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: DARK, marginBottom: 16 }}>{editingId ? "Edit Entry" : "Add New"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["name","Name"],["amount","Amount"],["region","Region"],["contact","Contact"],["deadline","Deadline"],["owner","Owner"]].map(([k,l]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input value={form[k] || ""} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} style={inputStyle} />
                </div>
              ))}
              {[["type","Type",Object.keys(TYPE_COLORS)],["status","Status",Object.keys(STATUS_COLORS)],["priority","Priority",["Critical","High","Medium","Low"]]].map(([k,l,opts]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <select value={form[k] || ""} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} style={inputStyle}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes || ""} onChange={e => setForm(f => ({...f,notes:e.target.value}))} style={{...inputStyle, height: 80, resize: "vertical"}} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "8px 20px", background: TEAL, color: "white", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Outreach Form Modal */}
      {showOutreachForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 24, width: 480 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: DARK, marginBottom: 16 }}>Add Contact</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[["name","Name"],["role","Role"],["region","Region"],["owner","Owner"],["lastContact","Last Contact (YYYY-MM-DD)"],["nextStep","Next Step"]].map(([k,l]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input value={outreachForm[k] || ""} onChange={e => setOutreachForm(f => ({...f,[k]:e.target.value}))} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Status</label>
                <select value={outreachForm.status || "Warm"} onChange={e => setOutreachForm(f => ({...f,status:e.target.value}))} style={inputStyle}>
                  {["Active","Pending","Warm","Cold","Done"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={outreachForm.notes || ""} onChange={e => setOutreachForm(f => ({...f,notes:e.target.value}))} style={{...inputStyle, height: 70, resize: "vertical"}} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setShowOutreachForm(false)} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleOutreachSave} style={{ padding: "8px 20px", background: TEAL, color: "white", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
