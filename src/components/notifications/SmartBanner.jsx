import { Link } from "react-router-dom";

export default function SmartBanner({ nudge, onDismiss }) {
  if (!nudge) return null;

  return (
    <div className="editorial-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="micro-label">Nudge</p>
          <p className="mt-2 font-serif text-[18px] font-semibold tracking-tight text-ink leading-tight">
            {nudge.title}
          </p>
          <p className="mt-1 text-[13px] text-caption leading-relaxed">{nudge.body}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-semibold text-caption min-h-0 min-w-0 shrink-0"
          aria-label="Dismiss nudge"
        >
          Dismiss
        </button>
      </div>
      <Link
        to={nudge.href}
        className="mt-4 inline-flex items-center text-[12px] font-bold uppercase tracking-[0.12em] text-clay min-h-[44px]"
      >
        Open
      </Link>
    </div>
  );
}
