import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "./AIAssistant";

const NAV = [
  { to: "/", label: "Mission Control", icon: "⬡", exact: true },
  { to: "/applications", label: "Applications & Grants", icon: "◎" },
  { to: "/outreach", label: "Outreach & Contacts", icon: "◈" },
  { to: "/action-items", label: "Action Items", icon: "◆" },
  { to: "/knowledge", label: "Knowledge Base", icon: "◉" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const firstName = session?.user?.email?.split("@")[0] ?? "";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-800 border-r border-navy-700 flex flex-col fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center flex-shrink-0">
              <span className="text-teal text-sm font-black">✦</span>
            </div>
            <div>
              <div className="text-white text-base font-extrabold tracking-tight leading-none">IOLA</div>
              <div className="text-teal text-xs font-semibold mt-0.5 leading-none">Ikirere Orbital Labs</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal/10 text-teal border border-teal/20"
                    : "text-gray-400 hover:text-white hover:bg-navy-700/60 border border-transparent"
                }`
              }
            >
              <span className="text-base opacity-80">{icon}</span>
              <span className="leading-tight">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
              <span className="text-teal text-xs font-bold uppercase">{firstName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 font-medium truncate">{firstName}</div>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen overflow-auto">
        <Outlet />
      </main>

      <AIAssistant />
    </div>
  );
}
