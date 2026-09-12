import { formatMacroMismatch, macroCalorieMismatch } from "@/lib/macroTargets";

export default function MacroMismatchNote({ targets }) {
  const mismatch = macroCalorieMismatch(targets);
  if (!mismatch) return null;
  return (
    <p className="text-[12px] text-caption leading-relaxed">
      {formatMacroMismatch(mismatch)}
    </p>
  );
}
