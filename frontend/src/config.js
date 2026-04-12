// Configurações do dashboard — ajuste conforme sua realidade
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
  // Paleta fixa pras categorias (cicla se houver mais categorias que cores)
  categoryColors: ['#d4a574', '#c97b5c', '#8b9d7a', '#6b8ca3', '#b8956a', '#9c7b9c', '#7a7a7a'],
};
