import { simularMeta } from './calculadora';
import { escolherPesos, pesosHistoricosDecendio, type PesosAplicados, type SerieDiaria } from './pesos';
import { metaDiariaNecessaria, pesoAcumulado, percentualAtingido, projecaoFechamento, type MetaDiaria } from './projecao';
import type { MetaMes, PesosDecendio } from './tipos';

/**
 * Acompanhamento das métricas do funil além da receita, como na planilha "Projeção de Meta":
 * cada métrica tem os seus pesos históricos por decêndio (aba PESOS POR DECÊNDIO — BASE HISTÓRICA)
 * e a sua meta do mês, derivada das premissas da calculadora.
 */

export type MetricaFunil = 'investimento' | 'sessoes' | 'pedidos';
export type Metrica = 'receita' | MetricaFunil;

export const METRICAS_FUNIL: MetricaFunil[] = ['investimento', 'sessoes', 'pedidos'];

export const ROTULO_METRICA: Record<Metrica, string> = {
  receita: 'Receita',
  investimento: 'Investimento',
  sessoes: 'Sessões',
  pedidos: 'Pedidos',
};

export interface AcompanhamentoMetrica {
  metrica: Metrica;
  /** Meta do mês da métrica. Null se não dá para calcular. */
  meta: number | null;
  /** Realizado até o último dia fechado. Null sem dado. */
  realizado: number | null;
  pesos: PesosAplicados;
  pesoAcumulado: number;
  /** Meta × peso acumulado: quanto deveria ter até agora. */
  esperadoAteAgora: number | null;
  /** Realizado ÷ peso acumulado. */
  projecao: number | null;
  /** Realizado ÷ esperado até agora (1 = no ritmo dos pesos). */
  ritmoVsEsperado: number | null;
  percentualProjetado: number | null;
  /** Ritmo necessário por dia, ponderado pelos pesos dos dias restantes. */
  diaria: MetaDiaria | null;
}

/** Metas do mês das métricas do funil, pela calculadora: orçamento, orçamento ÷ CPS, sessões × conversão. */
export function metasDoFunil(meta: MetaMes): Record<MetricaFunil, number | null> {
  try {
    const s = simularMeta(meta.premissas);
    return { investimento: meta.premissas.orcamento, sessoes: s.sessoes, pedidos: s.pedidos };
  } catch {
    return { investimento: meta.premissas.orcamento, sessoes: null, pedidos: null };
  }
}

/** Acompanhamento de uma métrica com os pesos dela (histórico do ano anterior ou fallback da meta). */
export function acompanharMetrica(entrada: {
  metrica: Metrica;
  meta: number | null;
  realizado: number | null;
  /** Série diária da métrica no mesmo mês do ano anterior (já filtrada por cliente). */
  historico: SerieDiaria[];
  anoAnterior: number;
  mes: number;
  pesosMeta: PesosDecendio;
  diasFechados: number;
  diasNoMes: number;
}): AcompanhamentoMetrica {
  const { metrica, meta, realizado, diasFechados, diasNoMes } = entrada;
  const pesos = escolherPesos(
    pesosHistoricosDecendio(entrada.historico, entrada.anoAnterior, entrada.mes),
    entrada.pesosMeta,
    diasNoMes,
  );
  const peso = pesoAcumulado(pesos.pesos, diasFechados, diasNoMes);
  const temMeta = meta !== null && meta > 0;
  const esperadoAteAgora = temMeta ? meta * peso : null;
  const projecao = realizado === null ? null : projecaoFechamento(realizado, peso);

  return {
    metrica,
    meta,
    realizado,
    pesos,
    pesoAcumulado: peso,
    esperadoAteAgora,
    projecao,
    ritmoVsEsperado:
      realizado !== null && esperadoAteAgora !== null && esperadoAteAgora > 0 ? realizado / esperadoAteAgora : null,
    percentualProjetado: temMeta && projecao !== null ? percentualAtingido(projecao, meta) : null,
    diaria:
      temMeta && realizado !== null
        ? metaDiariaNecessaria({ meta, realizado, diasDecorridos: diasFechados, pesosDiarios: pesos.diarios })
        : null,
  };
}
