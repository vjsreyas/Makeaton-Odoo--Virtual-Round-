import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import type { ActiveContextType, ContextInfo, LoginResult, Me } from '../api/types';
import { AppRoutes } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { saveSession } from '../auth/sessionStore';

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: any;
  headers: Headers;
}

export interface MockReply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type RouteHandler = MockReply | ((request: MockRequest) => MockReply | Promise<MockReply>);

export interface FetchMock {
  calls: MockRequest[];
  routes: Record<string, RouteHandler>;
}

export function installFetch(routes: Record<string, RouteHandler>): FetchMock {
  const mock: FetchMock = { calls: [], routes };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      let body: unknown;
      if (typeof init?.body === 'string') body = JSON.parse(init.body);
      const request: MockRequest = {
        method,
        path: url.pathname,
        query: url.searchParams,
        body,
        headers: new Headers(init?.headers as HeadersInit),
      };
      mock.calls.push(request);
      const handler = mock.routes[`${method} ${url.pathname}`];
      if (!handler) {
        return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not Found', details: [], request_id: 'mock' } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      const reply = typeof handler === 'function' ? await handler(request) : handler;
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status ?? 200,
        headers: { 'content-type': 'application/json', ...(reply.headers ?? {}) },
      });
    }),
  );
  return mock;
}

export function apiError(status: number, code: string, message: string, details: { field: string; message: string }[] = [], headers: Record<string, string> = {}): MockReply {
  return { status, headers, body: { error: { code, message, details, request_id: 'req-test' } } };
}

export const BUSINESS_A = { id: '11111111-1111-4111-8111-111111111111', name: 'Acme Cloud', currency: 'INR', timezone: 'Asia/Kolkata' };
export const BUSINESS_B = { id: '22222222-2222-4222-8222-222222222222', name: 'Northwind Fitness', currency: 'INR', timezone: 'Asia/Kolkata' };

export function context(type: ActiveContextType, business = BUSINESS_A, status: 'active' | 'suspended' = 'active'): ContextInfo {
  if (type === 'platform') return { type: 'platform', business_id: null, business_name: null, business_status: null };
  return { type: type as ContextInfo['type'], business_id: business.id, business_name: business.name, business_status: status };
}

export function makeMe(role: ActiveContextType, permissions: string[], contexts: ContextInfo[] = [], business: typeof BUSINESS_A | null = BUSINESS_A): Me {
  const hasBusiness = role !== 'platform' && role !== 'none';
  return {
    user: { id: 'user-1', full_name: 'Test Person', email: 'test@demo.example' },
    active_context: { type: role, business_id: hasBusiness ? business!.id : null },
    role,
    permissions,
    business: hasBusiness ? business : null,
    contexts: contexts.length ? contexts : role === 'none' ? [] : [context(role, business ?? BUSINESS_A)],
  };
}

export function makeLogin(me: Me, token = 'token-1'): LoginResult {
  return { access_token: token, expires_in: 28800, active_context: me.active_context, user: me.user, contexts: me.contexts };
}

export function storeToken(token = 'stored-token', expiresInMs = 3600_000): void {
  saveSession({ token, expiresAt: Date.now() + expiresInMs });
}

export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}
