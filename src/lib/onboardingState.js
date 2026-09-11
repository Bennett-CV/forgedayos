const STORAGE_KEY = "forgeday.onboarding.draft";
const MAX_STEP = 3;

export const DEFAULT_ONBOARDING_DRAFT = {
  step: 0,
  pillars: [],
  profile: { age: "", gender: "", weight_lbs: "", height_ft: "", height_in: "" },
  goals: { calories: "", protein_g: "", carbs_g: "", fat_g: "", workout_days: 4, activity_level: "moderate" },
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampStep(step) {
  if (!Number.isInteger(step) || step < 0 || step > MAX_STEP) return 0;
  return step;
}

export function loadOnboardingDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING_DRAFT, pillars: [], profile: { ...DEFAULT_ONBOARDING_DRAFT.profile }, goals: { ...DEFAULT_ONBOARDING_DRAFT.goals } };

    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return { ...DEFAULT_ONBOARDING_DRAFT, pillars: [], profile: { ...DEFAULT_ONBOARDING_DRAFT.profile }, goals: { ...DEFAULT_ONBOARDING_DRAFT.goals } };
    }

    const pillars = Array.isArray(parsed.pillars)
      ? parsed.pillars.filter(key => typeof key === "string")
      : [];

    return {
      step: clampStep(parsed.step),
      pillars,
      profile: { ...DEFAULT_ONBOARDING_DRAFT.profile, ...(isPlainObject(parsed.profile) ? parsed.profile : {}) },
      goals: { ...DEFAULT_ONBOARDING_DRAFT.goals, ...(isPlainObject(parsed.goals) ? parsed.goals : {}) },
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_DRAFT, pillars: [], profile: { ...DEFAULT_ONBOARDING_DRAFT.profile }, goals: { ...DEFAULT_ONBOARDING_DRAFT.goals } };
  }
}

export function saveOnboardingDraft(draft) {
  try {
    const step = clampStep(draft?.step);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      step,
      pillars: Array.isArray(draft?.pillars) ? draft.pillars : [],
      profile: { ...DEFAULT_ONBOARDING_DRAFT.profile, ...(isPlainObject(draft?.profile) ? draft.profile : {}) },
      goals: { ...DEFAULT_ONBOARDING_DRAFT.goals, ...(isPlainObject(draft?.goals) ? draft.goals : {}) },
    }));
  } catch {
    // sessionStorage may be unavailable; wizard still works in-memory
  }
}

export function clearOnboardingDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isOnboardingWizardRoute(pathname, user) {
  if (pathname === "/onboarding") return true;
  return pathname === "/" && Boolean(user && !user.onboarding_completed);
}
