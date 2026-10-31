import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetApiConfig } from '../api/client';

beforeEach(() => {
  window.sessionStorage.clear();
  window.alert = vi.fn();
});

afterEach(() => {
  resetApiConfig();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
