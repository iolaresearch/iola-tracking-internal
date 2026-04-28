const PRIORITY_COLOR = {
  Critical: "#F87171",
  High:     "#F5A623",
  Medium:   "#60A5FA",
  Low:      "rgba(232,238,244,0.25)",
};

export { PRIORITY_COLOR };

export default function PriorityBadge({ priority, dot = false }) {
  const color = PRIORITY_COLOR[priority] ?? "rgba(232,238,244,0.25)";
  if (dot) return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
      boxShadow: (priority === "Critical" || priority === "High") ? `0 0 7px ${color}70` : "none",
    }} title={priority} />
  );
  return (
    <span className="iola-pill" style={{
      background: color + "18",
      color,
    }}>{priority}</span>
  );
}
