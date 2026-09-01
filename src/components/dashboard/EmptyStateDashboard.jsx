import { PILLARS } from "../../lib/constants";
import { CaptureCTA } from "../capture/CaptureChooser";

export default function EmptyStateDashboard({ user }) {
  const focusedPillars = user?.focused_pillars || [];

  return (
    <div className="editorial-card px-5 py-6 text-center space-y-3">
      <p className="text-sm text-caption">
        Log your first activity to start building momentum.
      </p>
      {focusedPillars.length > 0 && (
        <p className="text-[11px] text-faint">
          Focus: {focusedPillars.map(k => PILLARS[k]?.label).filter(Boolean).join(", ")}
        </p>
      )}
      <CaptureCTA label="+ Log" />
    </div>
  );
}
