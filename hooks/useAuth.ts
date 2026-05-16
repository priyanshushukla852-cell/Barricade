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
import { AuthRequest, makeRedirectUri } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

// Required so the in-app browser can complete the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

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
  // Build a SHA-256 nonce to bind the id_token to this request.
  const rawNonce = `${Date.now()}-${Math.random()}`;
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const redirectUri = makeRedirectUri();

  const request = new AuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: 'id_token',
    usePKCE: false,
    extraParams: { nonce },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') return;
  if (result.type !== 'success') throw new Error('Google sign-in failed');

  const idToken = result.params.id_token;
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
