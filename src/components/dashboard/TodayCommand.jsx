import { Link } from "react-router-dom";

function StatusDot({ complete }) {
  return (
    <span
      className="h-[7px] w-[7px] rounded-full shrink-0"
      style={{ background: complete ? "oklch(var(--clay))" : "oklch(var(--border-strong))" }}
      aria-hidden
    />
  );
}

export default function TodayCommand({ snapshot }) {
  if (!snapshot) return null;
  const { items, completeCount, totalCount, next, insight } = snapshot;

  return (
    <div className="space-y-[22px]">
      <div className="editorial-card px-5 py-5">
        <p className="micro-label">Today</p>
        <p className="mt-2 font-serif text-[22px] font-semibold tracking-tight text-ink leading-tight">
          {completeCount} of {totalCount} complete
        </p>

        <div className="mt-5 space-y-4">
          {items.map(item => (
            <Link
              key={item.key}
              to={item.href}
              className="flex items-start gap-3 min-h-[44px]"
            >
              <StatusDot complete={item.complete} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-semibold text-ink">{item.label}</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint shrink-0">
                    {item.complete ? "Done" : "Open"}
                  </p>
                </div>
                <p className="text-[12px] text-caption mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {insight ? (
        <p className="text-[13px] text-caption leading-relaxed px-0.5">{insight}</p>
      ) : null}

      {next ? (
        <Link
          to={next.href}
          className="flex items-center justify-center w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover"
        >
          {next.label}
        </Link>
      ) : null}

      <div className="flex items-center justify-between px-0.5">
        <Link
          to="/review"
          className="text-[12px] font-bold uppercase tracking-[0.12em] text-caption min-h-[44px] inline-flex items-center"
        >
          Weekly Review
        </Link>
        {snapshot.reviewReady ? (
          <span className="text-[11px] text-clay font-semibold">Ready</span>
        ) : null}
      </div>
    </div>
  );
}
