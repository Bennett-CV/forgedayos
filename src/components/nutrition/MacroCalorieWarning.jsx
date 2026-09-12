import { macroCalorieWarning } from "@/lib/macroTargets";

export default function MacroCalorieWarning({ targets }) {
  const warning = macroCalorieWarning(targets);
  if (!warning) return null;
  return (
    <p className="text-[12px] leading-relaxed" style={{ color: "oklch(var(--destructive-text))" }}>
      {warning}
    </p>
  );
}
