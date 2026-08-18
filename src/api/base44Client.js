import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// base44's own hosting relies on same-origin relative API paths and doesn't always
// provide an appBaseUrl. Only force an absolute serverUrl when we can confirm we're
// actually cross-origin from the backend (e.g. hosted on Vercel).
const normalizedAppBaseUrl = appBaseUrl ? appBaseUrl.replace(/\/+$/, '') : '';
const isCrossOrigin =
  typeof window !== 'undefined' &&
  normalizedAppBaseUrl &&
  window.location.origin !== normalizedAppBaseUrl;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: isCrossOrigin ? normalizedAppBaseUrl : '',
  requiresAuth: false,
  appBaseUrl
});
