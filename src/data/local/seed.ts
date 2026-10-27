import type { LancamentoReceita, MetaMes } from '@/domain/tipos';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';

/*
 * SEED EDITÁVEL: dados de EXEMPLO da demonstração.
 *
 * As metas reais da Argennti entram aqui quando forem liberadas. Edite só os valores,
 * mantendo a forma (ver docs/ENTREGA_AUGUSTO.md, seção "Como trocar o seed").
 *
 * Argennti out/2026: metas OFICIAIS do Adstart (tela Metas, coluna OUTUBRO DE 26, linha
 * "Argennti Joias"), recebidas em 25/10/2026. Ver METAS_ADSTART_ARGENNTI_OUT26.
 * Pesos por decêndio (reserva/fallback) e os clientes de exemplo A e B são PLACEHOLDERS.
 */

/** Origem das metas oficiais da Argennti em out/2026. */
export const FONTE_METAS_ARGENNTI_OUT26 = 'Adstart — tela Metas, out/26';

/**
 * Valores oficiais exatamente como na tela Metas do Adstart (out/26, Argennti Joias).
 * Só investimento, faturamento, CPS, conversão e ticket entram na meta; ROAS, sessões e
 * pedidos são a referência que a calculadora precisa reproduzir (testado em repositorio.test.ts).
 */
export const METAS_ADSTART_ARGENNTI_OUT26 = {
  investimento: 577_000,
  faturamento: 2_414_530.16,
  roas: 4.18,
  sessoes: 613_830,
  conversao: 0.0151,
  ticket: 260.5,
  pedidos: 9269,
  cps: 0.94,
} as const;

const PESOS_PLACEHOLDER = { d1: 0.33, d2: 0.34, d3: 0.33 };

export function sementeMetas(): MetaMes[] {
  const base = { motivoAlteracao: null, updatedBy: 'seed', updatedAt: null };
  return [
    {
      ...base,
      updatedBy: FONTE_METAS_ARGENNTI_OUT26,
      clientId: CLIENTE_ARGENNTI_ID,
      ano: 2026,
      mes: 10,
      metaReceita: METAS_ADSTART_ARGENNTI_OUT26.faturamento,
      premissas: {
        orcamento: METAS_ADSTART_ARGENNTI_OUT26.investimento,
        cps: METAS_ADSTART_ARGENNTI_OUT26.cps,
        conversao: METAS_ADSTART_ARGENNTI_OUT26.conversao,
        ticket: METAS_ADSTART_ARGENNTI_OUT26.ticket,
      },
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
