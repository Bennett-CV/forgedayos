import { base44 } from "@/api/base44Client";

let pending = null;

/** Coalesce a burst of set saves into one full, idempotent rewrite. */
export function requestTrainingSheetSync() {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    base44.functions.invoke("syncTrainingSheet", {}).catch(() => {});
  }, 1500);
}
