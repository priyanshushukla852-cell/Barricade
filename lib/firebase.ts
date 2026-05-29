import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// getReactNativePersistence exists in firebase/auth v10+ at runtime but its type
// declaration is missing in some builds. Access it safely via the module object.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => import('firebase/auth').Persistence;
};

// initializeAuth throws if auth was already initialized for this app (e.g. hot reload).
// Fall back to getAuth which returns the existing instance.
function getOrInitAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = getOrInitAuth();
