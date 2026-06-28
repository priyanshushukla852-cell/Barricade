import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getIdToken,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

// webClientId is the Web application OAuth client from Google Cloud Console.
// Required so the idToken returned by the native SDK is accepted by Firebase Auth.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
});

async function applyUser(user: User): Promise<void> {
  const token = await getIdToken(user);
  useAuthStore.getState().setUser(
    user.uid,
    user.displayName ?? user.email?.split('@')[0] ?? 'User',
    token,
  );
}

// onIdTokenChanged fires on sign-in, sign-out AND whenever Firebase refreshes the
// ID token (~hourly), keeping authStore.token current for socket/REST auth.
onIdTokenChanged(auth, async (user) => {
  if (user) {
    try {
      await applyUser(user);
    } catch {
      useAuthStore.getState().clearUser();
    }
  } else {
    useAuthStore.getState().clearUser();
  }
  useAuthStore.getState().setHydrated();
});

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await applyUser(result.user);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const defaultName = email.split('@')[0];
  await updateProfile(result.user, { displayName: defaultName });
  await applyUser(result.user);
}

export async function updateNickname(name: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not signed in');
  await updateProfile(auth.currentUser, { displayName: name });
  useAuthStore.getState().setNickname(name);
}

export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return;

  const { idToken } = response.data;
  if (!idToken) throw new Error('No id_token received from Google');

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  await applyUser(userCredential.user);
}

export async function resetPassword(email: string): Promise<void> {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  if (methods.length === 0) {
    throw new Error('No account found with this email.');
  }
  if (!methods.includes('password')) {
    throw new Error('This account uses Google Sign-In — no password to reset.');
  }
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  useAuthStore.getState().clearUser();
  router.replace('/(auth)/auth');
}
