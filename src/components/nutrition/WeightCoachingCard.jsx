import { Link } from "react-router-dom";

export default function WeightCoachingCard({ coaching }) {
  if (!coaching) return null;

  return (
    <div className="editorial-card px-5 py-5 space-y-3">
      <p className="micro-label">Trend</p>
      {coaching.sparse ? (
        <p className="text-[14px] text-caption leading-relaxed">{coaching.trendLabel}</p>
      ) : (
        <>
          <p className="font-serif text-[20px] font-semibold tracking-tight text-ink leading-tight">
            {coaching.call}
          </p>
          <p className="text-[13px] text-caption leading-relaxed">{coaching.trendLabel}</p>
        </>
      )}
      {coaching.nextAction ? (
        <Link
          to={coaching.nextAction.href}
          className="inline-flex items-center min-h-[40px] text-[12px] font-bold uppercase tracking-[0.12em] text-clay"
        >
          {coaching.nextAction.label} →
        </Link>
      ) : null}
    </div>
  );
}
