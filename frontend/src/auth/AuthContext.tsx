import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/endpoints';
import { configureApi } from '../api/client';
import { ApiError } from '../api/errors';
import type { ContextInfo, Me, SwitchContextRequest } from '../api/types';
import { clearSession, loadSession, saveSession } from './sessionStore';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
export type EndReason = 'expired' | 'signed_out' | null;

interface AuthValue {
  status: AuthStatus;
  me: Me | null;
  contexts: ContextInfo[];
  suspended: boolean;
  endReason: EndReason;
  login: (email: string, password: string) => Promise<Me>;
  logout: () => void;
  refreshMe: () => Promise<Me | null>;
  switchContext: (target: SwitchContextRequest) => Promise<Me>;
  changePassword: (current: string, next: string) => Promise<Me>;
  clearEndReason: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [suspended, setSuspended] = useState(false);
  const [endReason, setEndReason] = useState<EndReason>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  };

  const endSession = useCallback((reason: EndReason) => {
    stopTimer();
    tokenRef.current = null;
    clearSession();
    setMe(null);
    setContexts([]);
    setSuspended(false);
    setStatus('anonymous');
    setEndReason(reason);
  }, []);

  const adoptToken = useCallback(
    (token: string, expiresInSeconds: number) => {
      stopTimer();
      tokenRef.current = token;
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      saveSession({ token, expiresAt });
      expiryTimer.current = setTimeout(() => endSession('expired'), Math.max(0, expiresAt - Date.now()));
    },
    [endSession],
  );

  const loadMe = useCallback(async (): Promise<Me> => {
    const profile = await authApi.me();
    setMe(profile);
    setContexts(profile.contexts);
    setSuspended(false);
    setStatus('authenticated');
    return profile;
  }, []);

  useEffect(() => {
    configureApi({
      getToken: () => tokenRef.current,
      onUnauthorized: () => endSession('expired'),
      onSuspended: () => setSuspended(true),
    });
  }, [endSession]);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setStatus('anonymous');
      return;
    }
    tokenRef.current = stored.token;
    expiryTimer.current = setTimeout(() => endSession('expired'), Math.max(0, stored.expiresAt - Date.now()));
    authApi
      .me()
      .then((profile) => {
        setMe(profile);
        setContexts(profile.contexts);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 403 && error.code === 'BUSINESS_SUSPENDED') {
          setSuspended(true);
          setStatus('authenticated');
          return;
        }
        endSession(error instanceof ApiError && error.status === 401 ? 'expired' : null);
      });
    return stopTimer;
  }, [endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      adoptToken(result.access_token, result.expires_in);
      setContexts(result.contexts);
      setEndReason(null);
      try {
        return await loadMe();
      } catch (error) {
        if (error instanceof ApiError && error.code === 'BUSINESS_SUSPENDED') {
          setStatus('authenticated');
        }
        throw error;
      }
    },
    [adoptToken, loadMe],
  );

  const logout = useCallback(() => endSession('signed_out'), [endSession]);

  const refreshMe = useCallback(async () => {
    if (!tokenRef.current) return null;
    return loadMe();
  }, [loadMe]);

  const switchContext = useCallback(
    async (target: SwitchContextRequest) => {
      const session = await authApi.switchContext(target);
      adoptToken(session.access_token, session.expires_in);
      return loadMe();
    },
    [adoptToken, loadMe],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      const result = await authApi.changePassword({ current_password: current, new_password: next });
      adoptToken(result.access_token, result.expires_in);
      return loadMe();
    },
    [adoptToken, loadMe],
  );

  const clearEndReason = useCallback(() => setEndReason(null), []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      contexts,
      suspended,
      endReason,
      login,
      logout,
      refreshMe,
      switchContext,
      changePassword,
      clearEndReason,
    }),
    [status, me, contexts, suspended, endReason, login, logout, refreshMe, switchContext, changePassword, clearEndReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
