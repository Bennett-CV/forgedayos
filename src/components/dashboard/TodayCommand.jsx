import { Link } from "react-router-dom";

function TrackRow({ item }) {
  return (
    <Link
      to={item.href}
      className="flex items-start justify-between gap-3 py-3 min-h-0 min-w-0"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink">{item.label}</p>
        <p className="text-[12px] text-caption mt-0.5">{item.detail}</p>
      </div>
      <span
        className="mt-1 h-[7px] w-[7px] rounded-full shrink-0"
        style={{ background: item.complete ? "oklch(var(--clay))" : "oklch(var(--border-strong))" }}
        aria-hidden
      />
    </Link>
  );
}

export default function TodayCommand({ view }) {
  if (!view) return null;

  return (
    <div className="space-y-[22px]">
      <div>
        <p className="text-[12px] text-caption">{view.dateLabel}</p>
        <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight text-ink leading-tight">
          {view.greeting}, {view.firstName}.
        </h1>
        {view.totalCount > 0 && (
          <p className="mt-2 text-[13px] text-caption">
            {view.completeCount} of {view.totalCount} complete
          </p>
        )}
      </div>

      {view.items.length > 0 && (
        <div className="editorial-card px-4 divide-y divide-border">
          {view.items.map(item => (
            <TrackRow key={item.key} item={item} />
          ))}
        </div>
      )}

      {view.next && (
        <div className="editorial-card p-5">
          <p className="micro-label">Next</p>
          <p className="mt-2 font-serif text-[20px] font-semibold tracking-tight text-ink leading-tight">
            {view.next.label}
          </p>
          {view.next.hint && (
            <p className="mt-1.5 text-[13px] text-caption leading-relaxed">{view.next.hint}</p>
          )}
          <Link
            to={view.next.href}
            className="mt-4 flex items-center justify-center w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover"
          >
            {view.next.label === "You're clear" ? "Open weekly review" : "Continue"}
          </Link>
        </div>
      )}

      {view.insight && (
        <p className="text-[13px] text-caption leading-relaxed px-0.5">{view.insight}</p>
      )}

      <Link
        to="/review"
        className="block text-[12px] font-semibold text-caption min-h-0"
      >
        Weekly Review
      </Link>
    </div>
  );
}
