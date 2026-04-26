const MAP = {
  Critical: "bg-red-900/50 text-red-300",
  High:     "bg-amber-900/50 text-amber-300",
  Medium:   "bg-blue-900/50 text-blue-300",
  Low:      "bg-gray-800 text-gray-400",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${MAP[priority] ?? MAP.Low}`}>
      {priority}
    </span>
  );
}
