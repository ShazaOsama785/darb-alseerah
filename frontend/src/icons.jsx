export const Flame = ({ off }) => (
  <svg viewBox="0 0 24 24" className={off ? "off" : ""}><path d="M12 2c1 3.2 4.6 5.2 4.6 9.6A4.6 4.6 0 0 1 12 16.2a4.6 4.6 0 0 1-4.6-4.6c0-1.6.6-2.8 1.4-3.8.2 1.4 1 2.2 1.8 2.4C10.2 7.6 10.6 4.4 12 2Z" fill="#E07A5F" /><path d="M12 22a6.6 6.6 0 0 1-6.6-6.6c0-1.2.4-2.4 1-3.4.6 1.4 1.8 2.2 3 2.4-.2 1.2.4 2.4 1.6 2.8 1.6.2 2.8-.8 2.6-2.4.6.6 1 1.6 1 2.6A6.6 6.6 0 0 1 12 22Z" fill="#F2CC8F" /></svg>
);
export const TrailIc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2.2" strokeLinecap="round"><path d="M5 21c0-5 14-5 14-10S9 8 12 3" /><circle cx="12" cy="3" r="1.4" fill="#E07A5F" /></svg>
);
export const Check = ({ cls = "" }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ChevR = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>;
export const ChevL = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>;
export const HomeIc = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></svg>;
export const PlayIc = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
export const StopIc = () => <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2" /></svg>;
