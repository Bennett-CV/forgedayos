import { useRef, useState } from "react";
import { MIND_CHECKS, MIND_NOTE_MAX } from "@/lib/mindChecks";

export default function MindChecks({
  checks,
  note = "",
  photoUrl = "",
  weekLine = "",
  saving = false,
  onToggle,
  onNote,
  onPhoto,
  onClearPhoto,
}) {
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(note);
  const [noteFocused, setNoteFocused] = useState(false);
  const shownNote = noteFocused ? draft : note;

  return (
    <div className="editorial-card px-5 py-5">
      <p className="micro-label">Mind</p>
      <p className="mt-2 text-[13px] text-caption leading-relaxed">
        Paper journal and The Way. Tap when each one happened.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {MIND_CHECKS.map((check) => {
          const on = Boolean(checks?.[check.key]);
          return (
            <button
              key={check.key}
              type="button"
              aria-pressed={on}
              disabled={saving}
              onClick={() => onToggle?.(check.key)}
              className={`min-h-[52px] rounded-[4px] border px-1.5 text-[12px] font-semibold leading-tight ${
                on ? "border-clay text-ink bg-card" : "border-border text-caption bg-card"
              }`}
            >
              <span
                className="mx-auto mb-1.5 block h-[6px] w-[6px] rounded-full"
                style={{ background: on ? "oklch(var(--clay))" : "oklch(var(--border-strong))" }}
              />
              {check.label}
            </button>
          );
        })}
      </div>
      {weekLine ? (
        <p className="mt-3 text-[13px] text-ink leading-relaxed">{weekLine}</p>
      ) : null}
      <label className="mt-4 block">
        <span className="micro-label mb-1.5 block">Note</span>
        <input
          value={shownNote}
          maxLength={MIND_NOTE_MAX}
          placeholder="One line for today"
          className="flex h-10 w-full rounded-[4px] border border-input bg-transparent px-3 text-[14px] text-ink placeholder:text-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onFocus={() => {
            setDraft(note);
            setNoteFocused(true);
          }}
          onChange={(event) => setDraft(event.target.value.replace(/[\r\n]+/g, " "))}
          onBlur={() => {
            setNoteFocused(false);
            onNote?.(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => fileRef.current?.click()}
          className="min-h-[44px] rounded-[4px] border border-border px-3 text-[12px] font-semibold text-ink"
        >
          {photoUrl ? "Replace photo" : "Add photo"}
        </button>
        {photoUrl ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onClearPhoto?.()}
            className="min-h-[44px] text-[12px] font-semibold text-caption"
          >
            Remove photo
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPhoto?.(file);
          }}
        />
      </div>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Today"
          className="mt-3 max-h-40 w-full rounded-[4px] object-cover"
        />
      ) : null}
    </div>
  );
}
