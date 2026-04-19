// Configurações do dashboard — ajuste conforme sua realidade
import { color } from './theme/tokens';

export const CONFIG = {
  // Metas de economia (em BRL)
  savingsGoal: {
    monthly: 11000,
    annual: 120000,
  },
  // Orçamentos por categoria (só usado se você NÃO tiver budget no .journal ainda)
  // Quando ~periodic estiver configurado, o hledger retorna isso pelo endpoint /api/budget
  fallbackBudget: [
    { cat: 'Moradia', limite: 4000 },
    { cat: 'Alimentação', limite: 2200 },
    { cat: 'Transporte', limite: 2000 },
    { cat: 'Lazer', limite: 1200 },
    { cat: 'Saúde', limite: 1500 },
  ],
  // Paleta fixa pras categorias (cicla se houver mais categorias que cores).
  // Getter so the token Proxy is re-read on each access — otherwise the
  // palette freezes to whichever mode was active at module import.
  get categoryColors() {
    return color.chart.category;
  },
};
