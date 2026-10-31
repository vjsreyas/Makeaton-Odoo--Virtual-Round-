/** Shared display conventions for the fictional Indian hackathon dataset. */
export const DEMO_TODAY = '2026-10-31';
export const DEMO_MONTH = 'October 2026';
export const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(amount);
export const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const indiaDate = (value: string | Date) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
});
