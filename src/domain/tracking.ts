/** Desvio aceito entre GA4 e receita oficial (±10%). Ajustável por cliente no futuro. */
export const TOLERANCIA_TRACKING = 0.1;

export type StatusTracking = 'sem_dado' | 'ok' | 'divergente';

/**
 * Índice de confiabilidade do tracking: receita GA4 ÷ receita aprovada lançada.
 * 1,00 = GA4 bate com a receita oficial. Null sem lançamento ou sem GA4.
 * A receita oficial é sempre a lançada; o GA4 só mede a confiança do tracking.
 */
export function indiceTracking(receitaGa4: number | null, receitaLancada: number | null): number | null {
  if (receitaGa4 === null || receitaLancada === null || receitaLancada <= 0) return null;
  return receitaGa4 / receitaLancada;
}

export function statusTracking(indice: number | null, tolerancia: number = TOLERANCIA_TRACKING): StatusTracking {
  if (indice === null) return 'sem_dado';
  return Math.abs(indice - 1) <= tolerancia ? 'ok' : 'divergente';
}
