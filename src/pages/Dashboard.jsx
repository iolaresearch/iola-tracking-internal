import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PriorityBadge, { PRIORITY_COLOR } from "../components/PriorityBadge";
import StatusBadge, { STATUS_STYLE } from "../components/StatusBadge";

const TEAM = [
  { name: "Jason Quist",     role: "Co-Founder & CEO",   initials: "JQ", key: "Jason",    color: "#0ECDB7" },
  { name: "Gideon Salami",   role: "Co-Founder & CTO",   initials: "GS", key: "Salami",   color: "#60A5FA" },
  { name: "Abigail Boateng", role: "Head of Research",   initials: "AB", key: "Abigail",  color: "#C084FC" },
  { name: "Ignatius Balayo", role: "ML Engineer",        initials: "IB", key: "Ignatius", color: "#FCD34D" },
  { name: "Alph Doamekpor",  role: "Strategy & Product", initials: "AD", key: "Alph",     color: "#F472B6" },
];

const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const [expandedMember, setExpandedMember] = useState(null);
  const today = new Date();

  const { data: apps = [] }     = useQuery({ queryKey: ["applications"], queryFn: () => supabase.from("applications").select("*").then(r => r.data ?? []) });
  const { data: items = [] }    = useQuery({ queryKey: ["action_items"],  queryFn: () => supabase.from("action_items").select("*").then(r => r.data ?? []) });
  const { data: contacts = [] } = useQuery({ queryKey: ["outreach"],      queryFn: () => supabase.from("outreach").select("*").then(r => r.data ?? []) });
  const { data: activity = [] } = useQuery({
    queryKey: ["activity_log"],
    queryFn: () => supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10).then(r => r.data ?? []),
  });

  const APP_STATUSES = ["Not Yet Applied","In Progress","Applied","Accepted","Rejected","Pending"];
  const pipeline = APP_STATUSES.map(s => ({ s, n: apps.filter(a => a.status === s).length })).filter(x => x.n > 0);

  const doneCount = items.filter(t => t.status === "Done").length;
  const taskPct   = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const deadlines = [
    ...apps.filter(a => a.deadline && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 14 && !["Accepted","Rejected"].includes(a.status))
           .map(a => ({ name: a.name, days: daysUntil(a.deadline), priority: a.priority, kind: "App" })),
    ...items.filter(t => t.due_date && daysUntil(t.due_date) >= 0 && daysUntil(t.due_date) <= 14 && t.status !== "Done")
            .map(t => ({ name: t.title, days: daysUntil(t.due_date), priority: t.priority, kind: "Task" })),
  ].sort((a, b) => a.days - b.days).slice(0, 8);

  const urgent = deadlines.filter(d => d.days <= 7).slice(0, 6);

  const stats = [
    { n: apps.length, label: "Applications", color: "var(--accent)", to: "/applications" },
    { n: apps.filter(a => ["In Progress","Applied"].includes(a.status)).length, label: "Active", color: "#60A5FA", to: "/applications" },
    { n: apps.filter(a => a.status === "Accepted").length, label: "Accepted", color: "#4ADE80", to: "/applications" },
    { n: apps.filter(a => a.priority === "Critical" && !["Accepted","Rejected"].includes(a.status)).length, label: "Critical", color: "#F87171", to: "/applications" },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--t)" }}>Mission Control</h1>
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 5, fontWeight: 500 }}>
            {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 8, padding: "7px 12px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 8px #4ADE8080" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tm)" }}>Live</span>
        </div>
      </div>

      {/* Urgent alert */}
      {urgent.length > 0 && (
        <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.14)", borderRadius: 10, padding: "14px 18px", marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#F87171", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 11 }}>
            {urgent.length} item{urgent.length !== 1 ? "s" : ""} need attention this week
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {urgent.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PriorityBadge priority={item.priority} dot />
                <span style={{ fontSize: 13, color: "var(--t)", flex: 1, fontWeight: 500 }}>{item.name}</span>
                <span style={{ fontSize: 11, color: "var(--tm)", background: "var(--s1)", padding: "2px 7px", borderRadius: 4 }}>{item.kind}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.days === 0 ? "#F87171" : item.days <= 2 ? "#F5A623" : "var(--tm)", minWidth: 50, textAlign: "right" }}>
                  {item.days === 0 ? "Today" : item.days === 1 ? "Tomorrow" : `${item.days}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <Link key={s.label} to={s.to} style={{
            background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "20px 20px 16px",
            cursor: "pointer", transition: "border-color 0.15s", textDecoration: "none", display: "block",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = s.color + "40"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b)"}>
            <div style={{ fontSize: 40, fontWeight: 800, color: s.color, letterSpacing: "-0.05em", lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Pipeline + Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 13 }}>Application Pipeline</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pipeline.map(p => {
              const s = STATUS_STYLE[p.s] || STATUS_STYLE["Not Yet Applied"];
              return (
                <div key={p.s} style={{ display: "flex", alignItems: "center", gap: 6, background: s.bg, border: `1px solid ${s.c}22`, borderRadius: 8, padding: "6px 12px" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: s.c, letterSpacing: "-0.04em", lineHeight: 1 }}>{p.n}</span>
                  <span style={{ fontSize: 11, color: s.c, opacity: 0.85, fontWeight: 500 }}>{p.s}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 13 }}>Task Progress</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1 }}>{taskPct}%</div>
          <div style={{ marginTop: 12, height: 3, background: "var(--b)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${taskPct}%`, background: "var(--accent)", borderRadius: 3, transition: "width 0.8s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 7 }}>{doneCount} of {items.length} tasks done</div>
        </div>
      </div>

      {/* Deadlines + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Upcoming — 14 days</div>
          {deadlines.length === 0
            ? <p style={{ color: "var(--tf)", fontSize: 13 }}>No deadlines coming up.</p>
            : deadlines.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderBottom: i < deadlines.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <PriorityBadge priority={d.priority} dot />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--t)", fontWeight: 500 }}>{d.name}</span>
                  <span style={{ fontSize: 10, color: "var(--tf)", background: "var(--s2)", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{d.kind}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.days <= 3 ? "#F87171" : d.days <= 7 ? "#F5A623" : "var(--tm)", minWidth: 44, textAlign: "right" }}>
                    {d.days === 0 ? "Today" : d.days === 1 ? "Tmrw" : `${d.days}d`}
                  </span>
                </div>
              ))
          }
        </div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Activity</div>
          {activity.length === 0
            ? <p style={{ color: "var(--tf)", fontSize: 12 }}>No activity yet.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {activity.map(a => {
                  const name = a.user_email?.split("@")[0] ?? "someone";
                  const m = TEAM.find(t => t.key.toLowerCase() === name.toLowerCase()) || { color: "var(--accent)", initials: name[0]?.toUpperCase() ?? "?" };
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 9 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: m.color + "1C", border: `1px solid ${m.color}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: m.color, flexShrink: 0 }}>
                        {m.initials ?? name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <span style={{ color: m.color, fontWeight: 700 }}>{name}</span>
                          <span style={{ color: "var(--tm)" }}> {a.action}</span>
                        </div>
                        {a.entity_name && <div style={{ fontSize: 11, color: "var(--t)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{a.entity_name}</div>}
                        <div style={{ fontSize: 10, color: "var(--tff)", marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Team cards */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Team</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {TEAM.map(m => {
            const myTasks    = items.filter(t => (t.owners ?? [t.owner]).includes(m.key) && t.status !== "Done");
            const myContacts = contacts.filter(c => c.owner === m.key);
            const isExp      = expandedMember === m.name;
            return (
              <div key={m.key}
                style={{ background: "var(--s1)", border: `1px solid ${isExp ? m.color + "50" : "var(--b)"}`, borderRadius: 10, padding: "15px 14px", cursor: "pointer", transition: "border-color 0.15s" }}
                onClick={() => setExpandedMember(isExp ? null : m.name)}
                onMouseEnter={e => { if (!isExp) e.currentTarget.style.borderColor = m.color + "40"; }}
                onMouseLeave={e => { if (!isExp) e.currentTarget.style.borderColor = "var(--b)"; }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.color + "1C", border: `1px solid ${m.color}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.color }}>
                  {m.initials}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--t)" }}>{m.name.split(" ")[0]}</div>
                <div style={{ fontSize: 11, color: "var(--tm)", marginTop: 2, lineHeight: 1.3 }}>{m.role}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--tm)" }}><span style={{ color: "var(--t)", fontWeight: 700 }}>{myTasks.length}</span> tasks</div>
                  <div style={{ fontSize: 11, color: "var(--tm)" }}><span style={{ color: "var(--t)", fontWeight: 700 }}>{myContacts.length}</span> contacts</div>
                </div>
                {isExp && myTasks.slice(0, 4).map(t => (
                  <div key={t.id} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--b)" }}>
                    <div style={{ fontSize: 11, color: "var(--t)", fontWeight: 600, lineHeight: 1.3 }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                      <PriorityBadge priority={t.priority} dot />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
