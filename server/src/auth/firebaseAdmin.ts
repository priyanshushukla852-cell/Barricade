import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import logger from '../logger';

// Firebase ID-token verification.
//
// Enforcement is gated on the FIREBASE_SERVICE_ACCOUNT env var (the service
// account JSON, as a single-line string). When it's absent we run in LEGACY
// mode: tokens are not verified and the server trusts the client-supplied
// userId — this preserves the old (insecure) behaviour so the code can be
// deployed before the credential is configured on the host. Set the env var to
// turn verification ON. Ship the token-sending client build BEFORE enabling it,
// or in-flight clients on older builds will be rejected.
let enforced = false;

function init(): void {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    logger.warn('FIREBASE_SERVICE_ACCOUNT not set — auth verification DISABLED (legacy mode, INSECURE)');
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
    enforced = true;
    logger.info('Firebase Admin initialized — auth verification ENFORCED');
  } catch (err) {
    logger.error({ err }, 'Firebase Admin init failed — auth verification DISABLED');
  }
}
init();

export function isAuthEnforced(): boolean {
  return enforced;
}

/** Returns the verified Firebase UID, or null if the token is missing/invalid. */
export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!enforced || !token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
