export const DEMO_NOTICE_PREFIX = 'DEMO ONLY - not connected to the backend. Nothing was saved or sent.';

export function demoNotice(message: string): void {
  window.alert(`${DEMO_NOTICE_PREFIX}\n\n${message}`);
}
