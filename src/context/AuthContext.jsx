import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signIn, signInWithGoogle, signOut, subscribeToAuth } from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => subscribeToAuth((next) => {
    setSession(next);
    setAuthLoading(false);
    if (next?.profileError) setAuthError(`Signed in, but the account profile could not be loaded: ${next.profileError}`);
    else if (next?.profileMissing) setAuthError('Signed in, but no union profile exists for this account. Contact the union office.');
    else setAuthError('');
  }), []);

  const login = useCallback(async (email, password) => {
    setAuthError('');
    try {
      return { ok: true, session: await signIn(email, password) };
    } catch (error) {
      const messages = {
        'auth/invalid-credential': 'That email and password combination is not recognised.',
        'auth/user-disabled': 'This account is disabled. Contact the union office.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.'
      };
      const message = messages[error.code] || error.message || 'Sign-in failed. Please try again.';
      setAuthError(message);
      return { ok: false, error: message };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError('');
    try {
      return { ok: true, session: await signInWithGoogle() };
    } catch (error) {
      const messages = {
        'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
        'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
        'auth/unauthorized-domain': 'This website domain is not authorized for Firebase sign-in.'
      };
      const message = messages[error.code] || error.message || 'Google sign-in failed. Please try again.';
      setAuthError(message);
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(() => signOut(), []);

  const value = useMemo(
    () => ({ session, authLoading, authError, login, loginWithGoogle, logout }),
    [session, authLoading, authError, login, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
