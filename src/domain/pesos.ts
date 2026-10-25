import { diasNoMes } from './calendario';
import { diasDoDecendio, validarPesos } from './projecao';
import type { DecendioNumero, PesosDecendio } from './tipos';

/**
 * PESOS DO MÊS — mesma regra da planilha "Projeção de Meta" (Rei da Cutelaria).
 *
 * A planilha guarda, para cada mês do ano, os pesos por decêndio da BASE HISTÓRICA
 * (aba "PESOS POR DECÊNDIO — BASE HISTÓRICA"): a participação de D1 (dias 1–10),
 * D2 (11–20) e D3 (21–fim) na receita daquele mês no ano anterior.
 * No acompanhamento diário, o peso de cada decêndio é dividido igualmente pelos dias
 * dele (ex.: outubro, D1 = 37,5% → 3,75% por dia; D3 = 33,8% ÷ 11 dias).
 *
 * Por isso o histórico é agregado por decêndio e não usado dia a dia: os dias da semana
 * não caem nas mesmas datas de um ano para o outro e o mês pode ter tamanho diferente
 * (fevereiro bissexto). O decêndio absorve essas diferenças; o D3 vai sempre do dia 21 ao fim.
 */

export type OrigemPesos = 'historico' | 'meta';

/** Valor diário de uma métrica (receita, investimento, sessões ou pedidos). */
export interface SerieDiaria {
  /** AAAA-MM-DD */
  date: string;
  valor: number;
}

export interface PesosAplicados {
  /** 'historico' = mesmo mês do ano anterior; 'meta' = d1/d2/d3 da meta_mes (fallback). */
  origem: OrigemPesos;
  pesos: PesosDecendio;
  /** Peso de cada dia do mês (índice 0 = dia 1). Soma 1. */
  diarios: number[];
}

/** Fração mínima de dias do mês com dado no ano anterior para usar o histórico. */
export const COBERTURA_MINIMA_HISTORICO = 0.8;

export function decendioDoDia(dia: number): DecendioNumero {
  if (dia <= 10) return 1;
  if (dia <= 20) return 2;
  return 3;
}

/**
 * Pesos por decêndio de uma métrica a partir da série diária do mês de referência (normalmente
 * o mesmo mês do ano anterior). Várias linhas no mesmo dia (canais do GA4, plataformas de mídia)
 * são somadas. Vale para receita, investimento, sessões e pedidos: cada uma tem os seus pesos.
 *
 * Devolve null (usar o fallback) quando: total ≤ 0, menos de 80% dos dias com dado,
 * ou algum decêndio sem nenhum dia com dado.
 */
export function pesosHistoricosDecendio(
  serie: SerieDiaria[],
  ano: number,
  mes: number,
): PesosDecendio | null {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}-`;
  const totalDias = diasNoMes(ano, mes);
  const porDia = new Map<number, number>();
  for (const linha of serie) {
    if (!linha.date.startsWith(prefixo)) continue;
    const dia = Number(linha.date.slice(8, 10));
    if (!Number.isInteger(dia) || dia < 1 || dia > totalDias) continue;
    const valor = Number.isFinite(linha.valor) ? linha.valor : 0;
    porDia.set(dia, (porDia.get(dia) ?? 0) + valor);
  }

  if (porDia.size < Math.ceil(totalDias * COBERTURA_MINIMA_HISTORICO)) return null;

  const somas: Record<DecendioNumero, number> = { 1: 0, 2: 0, 3: 0 };
  const diasComDado: Record<DecendioNumero, number> = { 1: 0, 2: 0, 3: 0 };
  for (const [dia, valor] of porDia) {
    const d = decendioDoDia(dia);
    somas[d] += Math.max(valor, 0);
    diasComDado[d] += 1;
  }
  if (diasComDado[1] === 0 || diasComDado[2] === 0 || diasComDado[3] === 0) return null;

  const total = somas[1] + somas[2] + somas[3];
  if (total <= 0) return null;
  return { d1: somas[1] / total, d2: somas[2] / total, d3: somas[3] / total };
}

/** Peso de cada dia: peso do decêndio ÷ dias do decêndio (igual à planilha). */
export function pesosDiarios(pesos: PesosDecendio, totalDias: number): number[] {
  validarPesos(pesos);
  const tamanhos = diasDoDecendio(totalDias);
  const porDecendio: Record<DecendioNumero, number> = { 1: pesos.d1, 2: pesos.d2, 3: pesos.d3 };
  return Array.from({ length: totalDias }, (_, i) => {
    const d = decendioDoDia(i + 1);
    return porDecendio[d] / tamanhos[d];
  });
}

/** Histórico quando houver; senão os pesos d1/d2/d3 da meta do mês. */
export function escolherPesos(
  historico: PesosDecendio | null,
  pesosMeta: PesosDecendio,
  totalDias: number,
): PesosAplicados {
  const origem: OrigemPesos = historico ? 'historico' : 'meta';
  const pesos = historico ?? pesosMeta;
  return { origem, pesos, diarios: pesosDiarios(pesos, totalDias) };
}
