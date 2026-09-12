import { useState } from "react";
import { Link } from "react-router-dom";

const ORDER = ["body", "money", "mind", "consistency"];

function Bar({ value }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-[6px] rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full bg-clay"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function ForgedayScoreCard({ score, compact = false }) {
  const [open, setOpen] = useState(!compact);

  if (!score) return null;

  const visible = ORDER.filter(k => score.weights?.[k] > 0);
  const empty = score.total == null;

  return (
    <div className="editorial-card px-5 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="micro-label">Forgeday Score</p>
          {empty ? (
            <p className="mt-2 font-serif text-[22px] font-semibold tracking-tight text-ink leading-tight">
              Not enough logs yet
            </p>
          ) : (
            <p className="mt-2 font-serif text-[32px] font-semibold tracking-tight text-ink leading-none">
              {score.total}
              <span className="text-[14px] font-sans font-semibold text-caption ml-1">/ 100</span>
            </p>
          )}
        </div>
        {compact ? (
          <Link
            to="/score"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-caption min-h-[36px] inline-flex items-center"
          >
            Details
          </Link>
        ) : null}
      </div>

      {empty ? (
        <p className="text-[13px] text-caption leading-relaxed">
          Score uses this week’s meals, lifts, mind, spend, and weigh-ins — only when you logged them. Nothing is inferred from a blank day.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map(key => {
            const pillar = score.pillars[key];
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-[13px] font-semibold text-ink">{pillar.label}</p>
                  <p className="font-mono text-[12px] text-caption">
                    {pillar.score == null ? "—" : pillar.score}
                    <span className="ml-1 text-[10px] uppercase tracking-[0.12em]">
                      {Math.round((pillar.weight || 0) * 100)}%
                    </span>
                  </p>
                </div>
                <Bar value={pillar.score} />
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-[12px] font-bold uppercase tracking-[0.12em] text-caption min-h-[40px]"
      >
        {open ? "Hide how scored" : "How scored"}
      </button>

      {open ? (
        <div className="space-y-3 pt-1">
          {visible.map(key => {
            const pillar = score.pillars[key];
            if (!pillar.explain?.length) return null;
            return (
              <div key={`${key}-explain`}>
                <p className="text-[13px] font-semibold text-ink">{pillar.label}</p>
                {pillar.explain.map(line => (
                  <p key={line} className="text-[12px] text-caption leading-relaxed mt-0.5">{line}</p>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
