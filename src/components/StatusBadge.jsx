const MAP = {
  Applied:         { bg: "bg-blue-900/40",   text: "text-blue-300",   dot: "bg-blue-400" },
  "In Progress":   { bg: "bg-amber-900/40",  text: "text-amber-300",  dot: "bg-amber-400" },
  Accepted:        { bg: "bg-green-900/40",  text: "text-green-300",  dot: "bg-green-400" },
  Rejected:        { bg: "bg-red-900/40",    text: "text-red-300",    dot: "bg-red-400" },
  Pending:         { bg: "bg-purple-900/40", text: "text-purple-300", dot: "bg-purple-400" },
  "Not Yet Applied": { bg: "bg-gray-800",    text: "text-gray-400",   dot: "bg-gray-500" },
  Active:  { bg: "bg-teal/10",       text: "text-teal",        dot: "bg-teal" },
  Warm:    { bg: "bg-amber-900/40",  text: "text-amber-300",   dot: "bg-amber-400" },
  Cold:    { bg: "bg-gray-800",      text: "text-gray-400",    dot: "bg-gray-500" },
  Done:    { bg: "bg-green-900/40",  text: "text-green-300",   dot: "bg-green-400" },
  "To Do": { bg: "bg-gray-800",      text: "text-gray-400",    dot: "bg-gray-500" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] ?? MAP["Pending"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
}
