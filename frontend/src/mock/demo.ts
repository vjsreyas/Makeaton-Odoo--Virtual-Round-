import { demoNotice as notifyUnavailable } from '../lib/notify';

export const DEMO_NOTICE_PREFIX = 'This feature is not available yet.';

export function demoNotice(_message?: string): void {
  notifyUnavailable();
}
