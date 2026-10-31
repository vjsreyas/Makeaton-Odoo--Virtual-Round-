const KEY = 'brightloop.session';

export interface StoredSession {
  token: string;
  expiresAt: number;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  storage()?.setItem(KEY, JSON.stringify(session));
}

export function loadSession(now: number = Date.now()): StoredSession | null {
  const raw = storage()?.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.token === 'string' && typeof parsed.expiresAt === 'number' && parsed.expiresAt > now) {
      return { token: parsed.token, expiresAt: parsed.expiresAt };
    }
  } catch {
    return null;
  }
  clearSession();
  return null;
}

export function clearSession(): void {
  storage()?.removeItem(KEY);
}
