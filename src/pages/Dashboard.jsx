import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";

const TEAM = [
  { name: "Jason Quist",      role: "Co-Founder & CEO",       initials: "JQ", key: "Jason",    ring: "border-teal/40",    avatar: "bg-teal/10 text-teal" },
  { name: "Gideon Salami",    role: "Co-Founder & CTO",       initials: "GS", key: "Salami",   ring: "border-blue-400/40",  avatar: "bg-blue-900/40 text-blue-300" },
  { name: "Abigail Boateng",  role: "Head of Research",       initials: "AB", key: "Abigail",  ring: "border-purple-400/40",avatar: "bg-purple-900/40 text-purple-300" },
  { name: "Ignatius Balayo",  role: "ML Engineer",            initials: "IB", key: "Ignatius", ring: "border-yellow-400/40",avatar: "bg-yellow-900/40 text-yellow-300" },
  { name: "Alph Doamekpor",   role: "Strategy & Product",     initials: "AD", key: "Alph",     ring: "border-pink-400/40",  avatar: "bg-pink-900/40 text-pink-300" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [expandedMember, setExpandedMember] = useState(null);
  const today = new Date();

  const { data: apps = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => supabase.from("applications").select("*").then((r) => r.data ?? []),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["action_items"],
    queryFn: () => supabase.from("action_items").select("*").then((r) => r.data ?? []),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => supabase.from("outreach").select("*").then((r) => r.data ?? []),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["activity_log"],
    queryFn: () =>
      supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
        .then((r) => r.data ?? []),
  });

  const in14 = new Date(today);
  in14.setDate(today.getDate() + 14);

  const upcomingDeadlines = [
    ...apps
      .filter((a) => a.deadline && new Date(a.deadline) >= today && new Date(a.deadline) <= in14)
      .map((a) => ({ id: a.id, name: a.name, deadline: a.deadline, kind: "Application", priority: a.priority })),
    ...items
      .filter((i) => i.due_date && new Date(i.due_date) >= today && new Date(i.due_date) <= in14 && i.status !== "Done")
      .map((i) => ({ id: i.id, name: i.title, deadline: i.due_date, kind: "Task", priority: i.priority })),
  ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const stats = [
    {
      label: "Total Applications",
      value: apps.length,
      border: "border-l-teal",
      text: "text-teal",
      link: "/applications",
    },
    {
      label: "Active / Applied",
      value: apps.filter((a) => ["In Progress", "Applied"].includes(a.status)).length,
      border: "border-l-blue-400",
      text: "text-blue-400",
      link: "/applications",
    },
    {
      label: "Accepted / Won",
      value: apps.filter((a) => a.status === "Accepted").length,
      border: "border-l-green-400",
      text: "text-green-400",
      link: "/applications",
    },
    {
      label: "Critical — Not Applied",
      value: apps.filter((a) => a.priority === "Critical" && a.status === "Not Yet Applied").length,
      border: "border-l-red-400",
      text: "text-red-400",
      link: "/applications",
    },
  ];

  const getMemberData = (key) => ({
    tasks: items.filter((i) => i.owner?.toLowerCase().includes(key.toLowerCase())),
    contacts: contacts.filter((c) => c.owner?.toLowerCase().includes(key.toLowerCase())),
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Mission Control</h1>
          <p className="text-gray-500 text-sm mt-1">
            {today.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className={`bg-navy-800 rounded-xl p-5 border-l-4 ${s.border} border border-navy-700 hover:border-navy-600 transition-colors group`}
          >
            <div className={`text-3xl font-extrabold ${s.text} group-hover:scale-105 transition-transform inline-block`}>
              {s.value}
            </div>
            <div className="text-gray-400 text-xs mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 bg-navy-800 rounded-xl p-5 border border-navy-700">
          <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-4">
            Upcoming Deadlines — Next 14 Days
          </h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 text-sm">No deadlines in the next 14 days.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.deadline) - today) / 86400000
                );
                const urgent = daysLeft <= 7;
                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                      urgent
                        ? "bg-red-900/20 border border-red-900/40"
                        : "bg-navy/50 border border-navy-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-500 text-xs">{item.kind}</span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold ml-4 shrink-0 ${
                        urgent ? "text-red-400" : "text-amber"
                      }`}
                    >
                      {daysLeft === 0
                        ? "Today"
                        : daysLeft === 1
                        ? "Tomorrow"
                        : `${daysLeft} days`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-4">
            Recent Activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet. Start editing records.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="text-xs">
                  <div>
                    <span className="text-teal font-semibold">
                      {a.user_email?.split("@")[0]}
                    </span>{" "}
                    <span className="text-gray-400">{a.action}</span>
                  </div>
                  {a.entity_name && (
                    <div className="text-gray-300 font-medium truncate mt-0.5">
                      {a.entity_name}
                    </div>
                  )}
                  <div className="text-gray-600 mt-0.5">{timeAgo(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Cards */}
      <div>
        <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TEAM.map((member) => {
            const { tasks, contacts: mc } = getMemberData(member.key);
            const isExpanded = expandedMember === member.name;
            const pending = tasks.filter((t) => t.status !== "Done");

            return (
              <div
                key={member.name}
                className={`bg-navy-800 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                  isExpanded
                    ? `${member.ring} border-2`
                    : "border-navy-700 hover:border-navy-600"
                }`}
                onClick={() => setExpandedMember(isExpanded ? null : member.name)}
              >
                <div className="p-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3 ${member.avatar}`}
                  >
                    {member.initials}
                  </div>
                  <div className="text-white font-semibold text-sm leading-tight">{member.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{member.role}</div>
                  <div className="flex gap-3 mt-3 text-xs text-gray-500">
                    <span>
                      <span className="text-white font-bold">{pending.length}</span> open tasks
                    </span>
                    <span>
                      <span className="text-white font-bold">{mc.length}</span> contacts
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-navy-700 px-4 py-3 space-y-2 bg-navy/30">
                    {pending.length === 0 && (
                      <p className="text-gray-600 text-xs">All tasks done.</p>
                    )}
                    {pending.slice(0, 5).map((t) => (
                      <div key={t.id} className="text-xs">
                        <div className="text-gray-300 font-medium leading-snug">{t.title}</div>
                        <div className="flex gap-1.5 mt-1">
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    ))}
                    {pending.length > 5 && (
                      <Link
                        to="/action-items"
                        className="text-teal text-xs hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        +{pending.length - 5} more →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
