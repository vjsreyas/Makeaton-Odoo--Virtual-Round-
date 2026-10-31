import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ActiveContextType } from '../api/types';
import { LoadingScreen } from '../components/ui/States';
import { SuspendedScreen } from '../components/SuspendedScreen';
import { useAuth } from './AuthContext';
import { homePathFor } from './permissions';

export function RequireAuth() {
  const { status, suspended } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen label="Restoring your session" />;
  if (status === 'anonymous') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (suspended) return <SuspendedScreen />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: readonly ActiveContextType[] }) {
  const { me } = useAuth();
  if (!me) return <LoadingScreen label="Loading your account" />;
  if (!roles.includes(me.role)) return <Navigate to={homePathFor(me.role)} replace />;
  return <Outlet />;
}

export function PublicOnly() {
  const { status, me } = useAuth();
  if (status === 'loading') return <LoadingScreen label="Restoring your session" />;
  if (status === 'authenticated' && me) return <Navigate to={homePathFor(me.role)} replace />;
  return <Outlet />;
}

export function RoleHome() {
  const { me } = useAuth();
  return <Navigate to={homePathFor(me?.role)} replace />;
}

export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
