import { formatWeekSectionLines } from "@/lib/weekSynthesis";

const SECTIONS = [
  { key: "body", label: "Body" },
  { key: "mind", label: "Mind" },
  { key: "money", label: "Money" },
];

export default function WeekSynthesisCard({ synthesis, answers }) {
  if (!synthesis) return null;
  const lines = formatWeekSectionLines(synthesis);
  const visible = SECTIONS.filter(s => lines[s.key].length > 0);
  const hasNotes = Boolean(answers?.win || answers?.change || answers?.next);

  if (!visible.length && !hasNotes) {
    return (
      <div className="editorial-card px-5 py-6">
        <p className="micro-label">Your Forgeday Week</p>
        <p className="mt-3 text-[14px] text-caption leading-relaxed">
          Nothing logged this week yet. The review will fill in from lifts, food, mind, and spending as you go.
        </p>
      </div>
    );
  }

  return (
    <div className="editorial-card px-5 py-5 space-y-5">
      <p className="micro-label">Your Forgeday Week</p>
      {visible.map(section => (
        <div key={section.key}>
          <p className="text-[14px] font-semibold text-ink">{section.label}</p>
          <div className="mt-1.5 space-y-1">
            {lines[section.key].map(line => (
              <p key={line} className="text-[13px] text-caption leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      ))}
      {hasNotes ? (
        <div>
          <p className="text-[14px] font-semibold text-ink">Notes</p>
          <div className="mt-1.5 space-y-1">
            {answers.win ? <p className="text-[13px] text-caption leading-relaxed">Went well — {answers.win}</p> : null}
            {answers.change ? <p className="text-[13px] text-caption leading-relaxed">Change — {answers.change}</p> : null}
            {answers.next ? <p className="text-[13px] text-caption leading-relaxed">Next week — {answers.next}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
