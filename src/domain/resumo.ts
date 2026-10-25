import type { ResultadoGrade } from './grade';
import { calcularGrade } from './grade';
import {
  gapProjetado,
  gapRealizado,
  metaDiariaNecessaria,
  metasPorDecendio,
  percentualAtingido,
  pesoAcumulado,
  projecaoFechamento,
  statusMeta,
  type MetaDiaria,
  type StatusMeta,
} from './projecao';
import type { DecendioNumero, MetaMes } from './tipos';

export interface EntradaResumoMes {
  meta: MetaMes | null;
  /** Soma da receita aprovada lançada no mês. */
  realizado: number;
  diasFechados: number;
  diasNoMes: number;
  /** Receita aprovada do mesmo mês do ano anterior. Null sem histórico lançado. */
  receitaAnoAnterior: number | null;
}

export interface ResumoMes {
  temMeta: boolean;
  metaReceita: number | null;
  realizado: number;
  percentualAtingido: number | null;
  pesoAcumulado: number | null;
  projecao: number | null;
  percentualProjetado: number | null;
  gapRealizado: number | null;
  gapProjetado: number | null;
  status: StatusMeta | null;
  diaria: MetaDiaria | null;
  metasDecendio: Record<DecendioNumero, number> | null;
  variacaoAnoAnterior: number | null;
  grade: ResultadoGrade;
}

/**
 * Tudo que o quadro mostra sobre a meta de um cliente num mês.
 * A projeção usa o realizado ÷ peso acumulado; a grade usa a projeção (não o realizado parcial).
 */
export function resumirMes(entrada: EntradaResumoMes): ResumoMes {
  const { meta, realizado, diasFechados, diasNoMes, receitaAnoAnterior } = entrada;

  if (meta === null) {
    return {
      temMeta: false,
      metaReceita: null,
      realizado,
      percentualAtingido: null,
      pesoAcumulado: null,
      projecao: null,
      percentualProjetado: null,
      gapRealizado: null,
      gapProjetado: null,
      status: null,
      diaria: null,
      metasDecendio: null,
      variacaoAnoAnterior: null,
      grade: calcularGrade({ desvioMeta: null, variacaoAnoAnterior: null }),
    };
  }

  const peso = pesoAcumulado(meta.pesos, diasFechados, diasNoMes);
  const projecao = projecaoFechamento(realizado, peso);
  const percentualProjetado = projecao === null ? null : percentualAtingido(projecao, meta.metaReceita);
  const variacaoAnoAnterior =
    projecao !== null && receitaAnoAnterior !== null && receitaAnoAnterior > 0
      ? projecao / receitaAnoAnterior - 1
      : null;

  return {
    temMeta: true,
    metaReceita: meta.metaReceita,
    realizado,
    percentualAtingido: percentualAtingido(realizado, meta.metaReceita),
    pesoAcumulado: peso,
    projecao,
    percentualProjetado,
    gapRealizado: gapRealizado(meta.metaReceita, realizado),
    gapProjetado: gapProjetado(meta.metaReceita, projecao),
    status: statusMeta(meta.metaReceita, realizado, projecao),
    diaria: metaDiariaNecessaria({
      meta: meta.metaReceita,
      realizado,
      diasDecorridos: diasFechados,
      diasNoMes,
    }),
    metasDecendio: metasPorDecendio(meta.metaReceita, meta.pesos),
    variacaoAnoAnterior,
    grade: calcularGrade({
      desvioMeta: percentualProjetado === null ? null : percentualProjetado - 1,
      variacaoAnoAnterior,
    }),
  };
}
