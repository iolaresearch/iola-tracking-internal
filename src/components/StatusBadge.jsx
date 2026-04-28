const STATUS_STYLE = {
  "Not Yet Applied": { bg: "rgba(232,238,244,0.06)", c: "rgba(232,238,244,0.38)" },
  "In Progress":     { bg: "rgba(245,166,35,0.12)",  c: "#F5A623" },
  "Applied":         { bg: "rgba(96,165,250,0.12)",  c: "#60A5FA" },
  "Accepted":        { bg: "rgba(74,222,128,0.12)",  c: "#4ADE80" },
  "Rejected":        { bg: "rgba(248,113,113,0.12)", c: "#F87171" },
  "Pending":         { bg: "rgba(192,132,252,0.12)", c: "#C084FC" },
  "Active":          { bg: "rgba(14,205,183,0.12)",  c: "#0ECDB7" },
  "Warm":            { bg: "rgba(245,166,35,0.1)",   c: "#F5A623" },
  "Cold":            { bg: "rgba(232,238,244,0.05)", c: "rgba(232,238,244,0.3)" },
  "Done":            { bg: "rgba(74,222,128,0.1)",   c: "#4ADE80" },
  "To Do":           { bg: "rgba(232,238,244,0.06)", c: "rgba(232,238,244,0.38)" },
};

export { STATUS_STYLE };

export default function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE["Not Yet Applied"];
  return (
    <span className="iola-pill" style={{ background: s.bg, color: s.c }}>{status}</span>
  );
}
