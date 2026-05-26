import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  getIdToken,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { AuthRequest, exchangeCodeAsync, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

// Required so the in-app browser can complete the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Android OAuth clients use a reversed-domain redirect URI and don't need a
// client_secret — PKCE alone is sufficient. The intent filter in app.json
// registers this scheme so Android can route the callback back to the app.
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const ANDROID_CLIENT_PREFIX = ANDROID_CLIENT_ID.split('.apps.')[0];
const REDIRECT_URI = makeRedirectUri({
  native: `com.googleusercontent.apps.${ANDROID_CLIENT_PREFIX}:/oauth2redirect`,
});

async function applyUser(user: User): Promise<void> {
  const token = await getIdToken(user);
  useAuthStore.getState().setUser(
    user.uid,
    user.displayName ?? user.email?.split('@')[0] ?? 'User',
    token,
  );
}

// Restore session on module load and keep it in sync.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      await applyUser(user);
    } catch {
      useAuthStore.getState().clearUser();
    }
  } else {
    useAuthStore.getState().clearUser();
  }
});

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await applyUser(result.user);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await applyUser(result.user);
}

export async function signInWithGoogle(): Promise<void> {
  const request = new AuthRequest({
    clientId: ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: REDIRECT_URI,
    responseType: 'code',
    usePKCE: true,
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') return;
  if (result.type !== 'success') throw new Error('Google sign-in failed');

  const tokenResult = await exchangeCodeAsync(
    {
      clientId: ANDROID_CLIENT_ID,
      code: result.params.code,
      redirectUri: REDIRECT_URI,
      extraParams: { code_verifier: request.codeVerifier! },
    },
    GOOGLE_DISCOVERY,
  );

  const idToken = tokenResult.idToken;
  if (!idToken) throw new Error('No id_token received from Google');

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  await applyUser(userCredential.user);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  useAuthStore.getState().clearUser();
  router.replace('/(auth)/auth');
}
