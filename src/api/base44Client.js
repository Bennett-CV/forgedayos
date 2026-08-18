import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// When the app is hosted on the same origin as its base44 backend (base44's own
// hosting), relative API paths work and must stay relative. When hosted elsewhere
// (e.g. Vercel), the SDK needs an absolute serverUrl to reach the backend at all.
const isSameOriginAsBackend =
  typeof window !== 'undefined' &&
  appBaseUrl &&
  window.location.origin === appBaseUrl.replace(/\/+$/, '');

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: isSameOriginAsBackend ? '' : appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});
