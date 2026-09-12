export default function InsightList({ insights }) {
  if (!insights?.length) return null;
  return (
    <div className="editorial-card px-5 py-5 space-y-3">
      <p className="micro-label">This week</p>
      {insights.map(row => (
        <p key={row.id} className="text-[14px] text-ink leading-relaxed">
          {row.text}
        </p>
      ))}
    </div>
  );
}
