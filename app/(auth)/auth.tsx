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
import { resetPassword, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../../hooks/useAuth';

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

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

  async function handleResetPassword() {
    if (!email.trim()) {
      setError('Enter your email above first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
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

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#AAA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </Pressable>
        </View>

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

        <Pressable onPress={handleResetPassword} disabled={loading} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
        {resetSent && (
          <Text style={styles.resetSent}>Password reset email sent — check your inbox.</Text>
        )}

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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0C8B8',
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 13, color: '#888', fontWeight: '500' },
  resetSent: { fontSize: 13, color: '#22AA66', textAlign: 'center' },
  error: {
    color: '#EE2222',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
