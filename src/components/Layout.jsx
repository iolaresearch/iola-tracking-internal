import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "./AIAssistant";

const IC = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.2"/><rect x="8.5" y="1.5" width="5" height="5" rx="1.2"/>
      <rect x="1.5" y="8.5" width="5" height="5" rx="1.2"/><rect x="8.5" y="8.5" width="5" height="5" rx="1.2"/>
    </svg>
  ),
  apps: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 3.5h11M2 7.5h7.5M2 11.5h5"/><circle cx="12.5" cy="10" r="2"/>
    </svg>
  ),
  outreach: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7.5" cy="3.5" r="2.2"/><path d="M7.5 5.7v2.8"/>
      <circle cx="2.5" cy="12" r="1.8"/><circle cx="12.5" cy="12" r="1.8"/>
      <path d="M7.5 8.5l-3.5 2M7.5 8.5l3.5 2"/>
    </svg>
  ),
  tasks: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 4.5h9M3 7.5h6M3 10.5h4"/><path d="M11 8l1.5 1.5L15 7"/>
    </svg>
  ),
  kb: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1.5h9v12H3z"/><path d="M5.5 5h4M5.5 7.5h4M5.5 10h2.5"/>
    </svg>
  ),
};

const NAV = [
  { to: "/",             label: "Mission Control", icon: IC.dashboard, exact: true },
  { to: "/applications", label: "Applications",    icon: IC.apps },
  { to: "/outreach",     label: "Outreach",        icon: IC.outreach },
  { to: "/action-items", label: "Action Items",    icon: IC.tasks },
  { to: "/knowledge",    label: "Knowledge Base",  icon: IC.kb },
];

const TEAM = [
  { initials: "JQ", color: "#0ECDB7", name: "Jason Quist",     role: "Co-Founder & CEO" },
  { initials: "GS", color: "#60A5FA", name: "Gideon Salami",   role: "Co-Founder & CTO" },
  { initials: "AB", color: "#C084FC", name: "Abigail Boateng", role: "Head of Research" },
  { initials: "IB", color: "#FCD34D", name: "Ignatius Balayo", role: "ML Engineer" },
  { initials: "AD", color: "#F472B6", name: "Alph Doamekpor",  role: "Strategy & Product" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const firstName = session?.user?.email?.split("@")[0] ?? "";
  const initial = firstName[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, flexShrink: 0,
        height: "100vh", position: "sticky", top: 0,
        background: "var(--s1)", borderRight: "1px solid var(--b)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 15px 15px", borderBottom: "1px solid var(--b)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: "var(--a-dim)", border: "1px solid var(--a-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img src="/iola-logo.png" alt="IOLA" style={{ width: 20, height: 20, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t)", lineHeight: 1 }}>IOLA</div>
              <div style={{ fontSize: 9.5, color: "rgba(14,205,183,0.65)", fontWeight: 600, letterSpacing: "0.01em", marginTop: 2 }}>Ikirere Orbital Labs</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 7px" }}>
          {NAV.map(({ to, label, icon, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "8px 10px", borderRadius: 7,
              border: "none", cursor: "pointer",
              background: isActive ? "var(--a-dim)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--tm)",
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              transition: "all 0.12s", textAlign: "left",
              marginBottom: 1, fontFamily: "var(--font)",
              textDecoration: "none",
            })}>
              <span style={{ flexShrink: 0, display: "flex", opacity: 0.75 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Team dots */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--b)" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--tff)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Team</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {TEAM.map(m => (
              <div key={m.initials} title={`${m.name} — ${m.role}`}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: m.color + "1C", border: `1px solid ${m.color}38`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 7, fontWeight: 700, color: m.color, flexShrink: 0,
                }}>
                {m.initials}
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div style={{ padding: "10px 12px 14px", borderTop: "1px solid var(--b)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--a-dim)", border: "1px solid var(--a-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t)" }}>{firstName}</div>
            <button onClick={handleSignOut} style={{
              fontSize: 10, color: "var(--tff)", background: "none", border: "none",
              cursor: "pointer", padding: 0, fontFamily: "var(--font)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--tff)"}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px 40px", minWidth: 0 }}>
        <Outlet />
      </main>

      <AIAssistant />
    </div>
  );
}
