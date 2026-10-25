/**
 * FONTES DE INVESTIMENTO EM MÍDIA usadas no cálculo (realizado, pesos históricos e quebra por fonte).
 *
 * Por enquanto: Meta e Google. Para somar outra fonte (ex.: TikTok, Pinterest), acrescente uma
 * entrada aqui. Se a fonte já vem em `v_metrics_daily` (outro valor de `platform`), basta isso:
 * a leitura filtra por estas plataformas e o domínio soma todas as fontes desta lista e mostra
 * cada uma na quebra por fonte. Se vier de outra view/tabela, use outro `origem` e acrescente a
 * leitura correspondente em `src/data/wolfos/carteira.ts` (`lerInvestimento`). O domínio não muda.
 * Ver docs/ENTREGA_AUGUSTO.md, seção 4.6.
 */

/** Views/tabelas de onde o investimento pode vir. Hoje só `v_metrics_daily`. */
export type OrigemInvestimento = 'v_metrics_daily';

export interface FonteInvestimento {
  /** Identificador interno da fonte (usado na quebra por fonte). */
  id: string;
  /** Nome exibido na tela. */
  rotulo: string;
  /** View/tabela lida (somente select). */
  origem: OrigemInvestimento;
  /** Valor da coluna `platform` na origem. [?] confirmar valores no banco. */
  platform: string;
}

export const FONTES_INVESTIMENTO: readonly FonteInvestimento[] = [
  { id: 'meta', rotulo: 'Meta Ads', origem: 'v_metrics_daily', platform: 'meta' },
  { id: 'google', rotulo: 'Google Ads', origem: 'v_metrics_daily', platform: 'google' },
  // Exemplos para o futuro (descomente quando a fonte existir e o valor de platform for confirmado):
  // { id: 'tiktok', rotulo: 'TikTok Ads', origem: 'v_metrics_daily', platform: 'tiktok' },
  // { id: 'pinterest', rotulo: 'Pinterest Ads', origem: 'v_metrics_daily', platform: 'pinterest' },
];

/** Ids das fontes configuradas. */
export const IDS_FONTES_INVESTIMENTO: string[] = FONTES_INVESTIMENTO.map((f) => f.id);
