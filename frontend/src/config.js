// Dashboard configuration — tune to taste.
import { color } from './theme/tokens';

export const CONFIG = {
  // Savings targets (BRL). Can be overridden per-request via query params
  // on /api/savings-goal.
  savingsGoal: {
    monthly: 11000,
    annual: 120000,
  },
  // Category palette (cycles when there are more categories than colours).
  // Getter so the token Proxy is re-read on each access — otherwise the
  // palette freezes to whichever mode was active at module import.
  get categoryColors() {
    return color.chart.category;
  },
};
