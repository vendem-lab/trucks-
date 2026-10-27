import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signIn, signOut, subscribeToAuth } from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => subscribeToAuth((next) => {
    setSession(next);
    setAuthLoading(false);
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

  const logout = useCallback(() => signOut(), []);

  const value = useMemo(
    () => ({ session, authLoading, authError, login, logout }),
    [session, authLoading, authError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
