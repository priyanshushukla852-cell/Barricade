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

// Desktop app OAuth clients support the browser-based authorization code +
// PKCE flow and accept custom URI scheme redirect URIs without requiring
// explicit registration in Google Cloud Console. The barricade:// scheme is
// registered in app.json so Android routes the callback back to the app.
const DESKTOP_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const REDIRECT_URI = makeRedirectUri({
  native: 'barricade://oauth',
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
    clientId: DESKTOP_CLIENT_ID,
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
      clientId: DESKTOP_CLIENT_ID,
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
