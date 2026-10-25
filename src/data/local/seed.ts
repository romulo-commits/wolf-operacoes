import type { LancamentoReceita, MetaMes } from '@/domain/tipos';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';

/*
 * SEED EDITÁVEL: dados de EXEMPLO da demonstração.
 *
 * As metas reais da Argennti entram aqui quando forem liberadas. Edite só os valores,
 * mantendo a forma (ver docs/ENTREGA_AUGUSTO.md, seção "Como trocar o seed").
 *
 * Referências usadas para o piloto (inventário WOLFOS, 25/10/2026):
 * - meta de out/2026 = 2.414.531 (monthly_goals, manual)
 * - orçamento de out/2026 = 577.000 (client_monthly_budget)
 * - CPS, conversão e ticket = médias jul–set/2026 (CPS 0,91 · conversão 1,43% · ticket R$ 263)
 * Pesos por decêndio e os clientes de exemplo A e B são PLACEHOLDERS.
 */

const PESOS_PLACEHOLDER = { d1: 0.33, d2: 0.34, d3: 0.33 };

export function sementeMetas(): MetaMes[] {
  const base = { motivoAlteracao: null, updatedBy: 'seed', updatedAt: null };
  return [
    {
      ...base,
      clientId: CLIENTE_ARGENNTI_ID,
      ano: 2026,
      mes: 10,
      metaReceita: 2_414_531,
      premissas: { orcamento: 577_000, cps: 0.91, conversao: 0.0143, ticket: 263 },
      pesos: { ...PESOS_PLACEHOLDER },
    },
    {
      ...base,
      clientId: CLIENTE_EXEMPLO_A_ID,
      ano: 2026,
      mes: 10,
      metaReceita: 1_300_000,
      premissas: { orcamento: 120_000, cps: 0.25, conversao: 0.006, ticket: 450 },
      pesos: { ...PESOS_PLACEHOLDER },
    },
    {
      ...base,
      clientId: CLIENTE_EXEMPLO_B_ID,
      ano: 2026,
      mes: 10,
      metaReceita: 900_000,
      premissas: { orcamento: 80_000, cps: 0.25, conversao: 0.0045, ticket: 625 },
      pesos: { ...PESOS_PLACEHOLDER },
    },
  ];
}

/** Receita aprovada de exemplo: out/2025 (ano anterior) e out/2026 até o dia 24. */
export function sementeLancamentos(): LancamentoReceita[] {
  const criado = '2026-10-25T09:00:00.000Z';
  const linha = (
    id: string,
    clientId: string,
    periodoInicio: string,
    periodoFim: string,
    pedidosAprovados: number,
    receitaAprovada: number,
  ): LancamentoReceita => ({
    id,
    clientId,
    periodoInicio,
    periodoFim,
    pedidosAprovados,
    receitaAprovada,
    fonte: 'plataforma',
    lancadoPor: 'Exemplo (seed)',
    createdAt: criado,
  });

  return [
    // Ano anterior (out/2025)
    linha('seed-arg-2025-10', CLIENTE_ARGENNTI_ID, '2025-10-01', '2025-10-31', 9464, 2_108_255),
    linha('seed-a-2025-10', CLIENTE_EXEMPLO_A_ID, '2025-10-01', '2025-10-31', 2400, 1_200_000),
    linha('seed-b-2025-10', CLIENTE_EXEMPLO_B_ID, '2025-10-01', '2025-10-31', 1300, 800_000),

    // Out/2026 (1 a 24)
    linha('seed-arg-2026-d1', CLIENTE_ARGENNTI_ID, '2026-10-01', '2026-10-10', 2690, 712_430.15),
    linha('seed-arg-2026-d2', CLIENTE_ARGENNTI_ID, '2026-10-11', '2026-10-20', 2540, 668_910.4),
    linha('seed-arg-2026-d3', CLIENTE_ARGENNTI_ID, '2026-10-21', '2026-10-24', 1210, 319_455.8),
    linha('seed-a-2026-d1', CLIENTE_EXEMPLO_A_ID, '2026-10-01', '2026-10-10', 960, 420_000),
    linha('seed-a-2026-d2', CLIENTE_EXEMPLO_A_ID, '2026-10-11', '2026-10-20', 850, 380_000),
    linha('seed-a-2026-d3', CLIENTE_EXEMPLO_A_ID, '2026-10-21', '2026-10-24', 560, 250_000),
    linha('seed-b-2026-d1', CLIENTE_EXEMPLO_B_ID, '2026-10-01', '2026-10-10', 420, 200_000),
    linha('seed-b-2026-d2', CLIENTE_EXEMPLO_B_ID, '2026-10-11', '2026-10-20', 380, 180_000),
    linha('seed-b-2026-d3', CLIENTE_EXEMPLO_B_ID, '2026-10-21', '2026-10-24', 250, 120_000),
  ];
}
