import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const CAPTURE_DESTINATIONS = [
  {
    key: "meal",
    label: "Meal",
    caption: "Food & macros",
    to: "/nutrition?add=breakfast",
  },
  {
    key: "workout",
    label: "Workout",
    caption: "Today's lifts",
    to: "/lifts?view=log",
  },
  {
    key: "note",
    label: "Note",
    caption: "Morning, sit, read",
    to: "/mindfulness?compose=morning",
  },
  {
    key: "other",
    label: "Other activity",
    caption: "Career, finance, custom",
    to: "/log?pillar=career",
  },
];

export default function CaptureChooser() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2">
      {CAPTURE_DESTINATIONS.map(dest => (
        <button
          key={dest.key}
          type="button"
          onClick={() => navigate(dest.to)}
          className="editorial-card p-3 text-left min-h-[64px]"
        >
          <p className="text-[14px] font-semibold text-ink">{dest.label}</p>
          <p className="text-[11px] text-caption mt-0.5">{dest.caption}</p>
        </button>
      ))}
    </div>
  );
}

export function CaptureCTA({ label = "+ Log" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover"
      >
        {open ? "Close" : label}
      </button>
      {open && <CaptureChooser />}
    </div>
  );
}
