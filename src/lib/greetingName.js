const FALLBACK = "there";
const STORAGE_KEY = "forgeday.profile.first_name";

function cleanToken(value) {
  if (value == null) return "";
  return String(value).trim().replace(/[.,!?;:]+$/, "");
}

/** True for email local-parts and handle-style strings like "christian.votta". */
export function looksLikeEmailLocalPart(token, email) {
  const t = cleanToken(token);
  if (!t) return true;
  if (t.includes("@")) return true;
  if (email) {
    const local = String(email).split("@")[0];
    if (local && t.toLowerCase() === local.toLowerCase()) return true;
  }
  if (/\s/.test(t)) return false;
  return /^[a-z0-9]+[._][a-z0-9._-]+$/i.test(t);
}

function firstProperToken(value, email) {
  const raw = cleanToken(value);
  if (!raw) return "";
  const token = cleanToken(raw.split(/\s+/)[0]);
  if (!token || looksLikeEmailLocalPart(token, email)) return "";
  return token;
}

export function rememberGreetingFirstName(name) {
  try {
    const token = cleanToken(name);
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function storedGreetingFirstName() {
  try {
    return cleanToken(localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

/**
 * First name for greetings.
 * Prefer profile.first_name; else first token of a real display name.
 * Never uses a raw email local-part when a proper name exists.
 */
export function greetingFirstName(user) {
  const email = user?.email || "";
  const profile = user?.profile && typeof user.profile === "object" ? user.profile : {};

  const profileCandidates = [
    profile.first_name,
    profile.firstName,
    profile.preferred_name,
    user?.first_name,
    user?.firstName,
  ];
  for (const candidate of profileCandidates) {
    const token = firstProperToken(candidate, email);
    if (token) return token;
  }

  const stored = firstProperToken(storedGreetingFirstName(), email);
  if (stored) return stored;

  const displayCandidates = [user?.full_name, user?.display_name, user?.name];
  for (const candidate of displayCandidates) {
    const token = firstProperToken(candidate, email);
    if (token) return token;
  }

  return FALLBACK;
}

export function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
