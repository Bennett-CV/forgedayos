function Section({ title, lines }) {
  if (!lines?.length) return null;
  return (
    <div>
      <p className="micro-label">{title}</p>
      <ul className="mt-2 space-y-1">
        {lines.map(line => (
          <li key={line} className="text-[14px] text-ink leading-relaxed">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WeekDigest({ digest, rangeLabel }) {
  return (
    <div className="editorial-card p-5 space-y-5">
      <div>
        <h2 className="font-serif text-[22px] font-semibold tracking-tight text-ink">Your Forgeday Week</h2>
        {rangeLabel && <p className="mt-1 text-[13px] text-caption">{rangeLabel}</p>}
      </div>

      {!digest?.hasAny ? (
        <p className="text-[14px] text-caption leading-relaxed">
          Not much on the page yet. Log a few days, then this will fill in on its own.
        </p>
      ) : (
        <div className="space-y-5">
          <Section title="Body" lines={digest.body?.lines} />
          <Section title="Mind" lines={digest.mind?.lines} />
          <Section title="Money" lines={digest.money?.lines} />
        </div>
      )}
    </div>
  );
}
