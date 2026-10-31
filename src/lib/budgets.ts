import { Budget, BudgetPeriod, Transaction } from '@/types';
import { addMoney, calcPercent, subtractMoney } from './utils';
import { findPillarAlert, PILLAR_PICK_TYPES, PillarAlert, ToPen } from './pillars';

export const BUDGET_PERIODS: { id: BudgetPeriod; label: string }[] = [
  { id: 'DAILY', label: 'Día' },
  { id: 'WEEKLY', label: 'Semana' },
  { id: 'BIWEEKLY', label: 'Quincena' },
  { id: 'MONTHLY', label: 'Mes' },
  { id: 'CUSTOM', label: 'Otro' },
];

export const BUDGET_ALERT_LEVELS = [50, 80, 100];

export const periodLabel = (b: Pick<Budget, 'period' | 'days'>) =>
  b.period === 'CUSTOM' ? `${b.days} días` : BUDGET_PERIODS.find((p) => p.id === b.period)?.label ?? '';

// Amounts without trailing zeros: "S/ 80 / 100"
export const fmtAmount = (v: number) => v.toLocaleString('es-PE', { maximumFractionDigits: 2 });

const DAY_MS = 24 * 60 * 60 * 1000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

export interface BudgetWindow {
  start: Date;
  end: Date; // exclusive
}

type PeriodShape = Pick<Budget, 'period' | 'days' | 'startDate'>;

// Period that contains the date: calendar day / week (Mon-Sun) / half-month / month,
// or blocks of N days counted from startDate
export const windowContaining = (b: PeriodShape, date: Date): BudgetWindow => {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (b.period) {
    case 'DAILY':
      return { start: d, end: addDays(d, 1) };
    case 'WEEKLY': {
      const start = addDays(d, -((d.getDay() + 6) % 7));
      return { start, end: addDays(start, 7) };
    }
    case 'BIWEEKLY':
      return d.getDate() <= 15
        ? { start: new Date(y, m, 1), end: new Date(y, m, 16) }
        : { start: new Date(y, m, 16), end: new Date(y, m + 1, 1) };
    case 'MONTHLY':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'CUSTOM': {
      const n = Math.max(1, b.days || 1);
      const anchor = startOfDay(b.startDate);
      const start = addDays(anchor, Math.floor(daysBetween(anchor, d) / n) * n);
      return { start, end: addDays(start, n) };
    }
  }
};

// Period the budget is counting on that date; null before it starts or after a one-time budget ended
export const budgetWindowAt = (b: Budget, date: Date): BudgetWindow | null => {
  if (startOfDay(date) < startOfDay(b.startDate)) return null;
  const w = windowContaining(b, date);
  if (!b.repeat && w.start.getTime() !== windowContaining(b, b.startDate).start.getTime()) return null;
  return w;
};

// Roughly how much it allows per month, to compare with the pillar
export const monthlyEquivalent = (amount: number, period: BudgetPeriod, days?: number) => {
  const length = { DAILY: 1, WEEKLY: 7, BIWEEKLY: 15, MONTHLY: 30, CUSTOM: Math.max(1, days || 1) }[period];
  return period === 'MONTHLY' ? amount : (amount * 30) / length;
};

// Counts from the start date on, even when its first period began earlier
const spentIn = (b: Budget, txs: Transaction[], w: BudgetWindow, toPen: ToPen) => {
  const from = Math.max(w.start.getTime(), startOfDay(b.startDate).getTime());
  return txs
    .filter((t) =>
      !t.isAdjustment &&
      t.pillar === b.pillar &&
      PILLAR_PICK_TYPES.includes(t.type) &&
      (b.categoryIds.length === 0 || (!!t.categoryId && b.categoryIds.includes(t.categoryId))) &&
      t.date.getTime() >= from && t.date < w.end
    )
    .reduce((sum, t) => addMoney(sum, toPen(t, t.amount)), 0);
};

export type BudgetState = 'ok' | 'near' | 'limit' | 'over';

export interface BudgetStatus {
  budget: Budget;
  window: BudgetWindow;
  spent: number;
  percent: number;
  state: BudgetState;
  ended: boolean; // one-time budget whose period is over
  upcoming: boolean; // starts after today
}

const stateOf = (percent: number): BudgetState =>
  percent > 100 ? 'over' : percent >= 100 ? 'limit' : percent >= 80 ? 'near' : 'ok';

const whenText = (w: BudgetWindow, now: Date) => {
  const left = daysBetween(now, w.end);
  return left <= 1 ? 'hoy' : `quedan ${left} días`;
};

// Status of the period running on `at` (today unless looking at another month)
export const computeBudgetStatus = (b: Budget, txs: Transaction[], toPen: ToPen, now = new Date(), at = now): BudgetStatus => {
  const current = budgetWindowAt(b, at);
  const upcoming = startOfDay(b.startDate) > startOfDay(now);
  const window = current ?? windowContaining(b, b.startDate);
  const spent = spentIn(b, txs, window, toPen);
  const percent = b.amount > 0 ? calcPercent(spent, b.amount) : 0;
  return { budget: b, window, spent, percent, state: stateOf(percent), ended: !current && !upcoming, upcoming };
};

// Date whose period a budget shows when looking at a month: today in the current month, the last day
// of past months, and in future months the first period that starts there. null: not running that month.
export const monthViewDate = (b: Budget, year: number, month: number, now = new Date()): Date | null => {
  const first = new Date(year, month, 1);
  const next = new Date(year, month + 1, 1);
  if (now >= first && now < next) return now;
  if (next <= now) return addDays(next, -1);
  const date = startOfDay(b.startDate) > first ? startOfDay(b.startDate) : first;
  if (date >= next) return null;
  const w = windowContaining(b, date);
  return w.start < first && w.end < next ? w.end : date;
};

// ---- Alerts when a movement crosses 50 / 80 / 100% or goes over ----

const crossed = (levels: number[], before: number, after: number): number | null => {
  if (before <= 100 && after > 100) return 101;
  return [...levels].sort((a, b) => b - a).find((l) => before < l && after >= l) ?? null;
};

const TONE: Record<number, PillarAlert['tone']> = { 50: 'info', 80: 'warning', 100: 'danger', 101: 'danger' };

export const findBudgetAlert = (
  budgets: Budget[],
  before: Transaction[],
  after: Transaction[],
  saved: Transaction[],
  toPen: ToPen,
  now = new Date()
): PillarAlert | null => {
  let best: { level: number; alert: PillarAlert } | null = null;
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    for (const tx of saved) {
      const w = budgetWindowAt(b, tx.date);
      if (!w) continue;
      const spentBefore = spentIn(b, before, w, toPen);
      const spent = spentIn(b, after, w, toPen);
      const level = crossed(b.alerts, calcPercent(spentBefore, b.amount), calcPercent(spent, b.amount));
      if (level === null || (best && best.level >= level)) continue;
      const isCurrent = now >= w.start && now < w.end;
      const when = b.period === 'DAILY' && isCurrent ? 'hoy' : isCurrent ? whenText(w, now) : periodLabel(b).toLowerCase();
      best = {
        level,
        alert: {
          pillar: b.pillar,
          title: level === 101 ? `${b.name} · te pasaste` : b.name,
          detail: `S/ ${fmtAmount(spent)} / ${fmtAmount(b.amount)} · ${when}`,
          tone: TONE[level],
          badge: level === 101 ? `+${fmtAmount(subtractMoney(spent, b.amount))}` : `${level}%`,
        },
      };
    }
  }
  return best ? (best as { level: number; alert: PillarAlert }).alert : null;
};

// One toast per save: a budget alert unless the pillar has a more serious one
export const findMovementAlert = (
  budgets: Budget[],
  before: Transaction[],
  after: Transaction[],
  saved: Transaction[],
  pillarDates: Date[],
  toPen: ToPen
): PillarAlert | null => {
  const pillarAlert = findPillarAlert(before, after, pillarDates, toPen);
  const budgetAlert = findBudgetAlert(budgets, before, after, saved, toPen);
  if (budgetAlert && (budgetAlert.tone === 'danger' || pillarAlert?.tone !== 'danger')) return budgetAlert;
  return pillarAlert ?? budgetAlert;
};
