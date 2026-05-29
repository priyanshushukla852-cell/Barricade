import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../../hooks/useAuth';

function firebaseErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    switch ((err as { code: string }).code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is not enabled. Please contact support.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later or reset your password.';
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(game)/home');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setError('');
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      router.replace('/(game)/home');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(game)/home');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>BARRICADE</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#AAA"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#AAA"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <Pressable
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnPrimaryText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnSecondary, loading && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.btnSecondaryText}>Create Account</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.btn, styles.btnGoogle, loading && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <Text style={styles.btnGoogleText}>Continue with Google</Text>
        </Pressable>

        {error !== '' && <Text style={styles.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#D0C8B8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF',
  },
  btn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: '#4A3728' },
  btnSecondaryText: { color: '#4A3728', fontSize: 16, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D0C8B8' },
  dividerText: { fontSize: 13, color: '#999' },
  btnGoogle: { borderWidth: 1.5, borderColor: '#D0C8B8', backgroundColor: '#FFF' },
  btnGoogleText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
  error: {
    color: '#EE2222',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
