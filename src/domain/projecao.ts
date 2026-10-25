import type { DecendioNumero, PesosDecendio } from './tipos';

const TOLERANCIA_PESOS = 1e-6;

export type StatusMeta = 'atingida' | 'no_ritmo' | 'em_risco';

export interface DiaNecessario {
  /** Dia do mês (1 a 31). */
  dia: number;
  /** Peso do dia no mês (fração). */
  peso: number;
  /** Quanto precisa vender neste dia. Null se os dias restantes não têm peso. */
  valor: number | null;
}

export interface MetaDiaria {
  /**
   * Ritmo necessário por dia (PONDERADO), lido para o PRÓXIMO dia:
   * falta × (peso do dia ÷ soma dos pesos restantes). Null sem dias restantes.
   * Não existe média simples (falta ÷ dias): o ritmo é sempre o ponderado; os demais dias estão no cronograma.
   */
  necessaria: number | null;
  /** Ritmo ATUAL: realizado ÷ dias já fechados (o que já aconteceu). Null sem dias fechados. */
  ritmoAtual: number | null;
  /**
   * Quanto o ritmo precisa mudar, já descontando o peso dos dias:
   * (falta ÷ peso restante) ÷ (realizado ÷ peso acumulado). Acima de 1 = precisa acelerar.
   */
  aceleracao: number | null;
  diasRestantes: number;
  /** Meta de cada dia restante, distribuída pelos pesos. */
  cronograma: DiaNecessario[];
}

/** Dias de cada decêndio: 1–10, 11–20 e 21 até o fim do mês. */
export function diasDoDecendio(diasNoMes: number): Record<DecendioNumero, number> {
  return { 1: 10, 2: 10, 3: diasNoMes - 20 };
}

/** Pesos precisam ser não negativos e somar 100%. */
export function validarPesos(pesos: PesosDecendio): void {
  const valores = [pesos.d1, pesos.d2, pesos.d3];
  if (valores.some((valor) => !Number.isFinite(valor) || valor < 0)) {
    throw new RangeError('Pesos precisam ser números não negativos');
  }
  const soma = valores.reduce((total, valor) => total + valor, 0);
  if (Math.abs(soma - 1) > TOLERANCIA_PESOS) {
    throw new RangeError(`Pesos precisam somar 100% (soma atual: ${(soma * 100).toFixed(2)}%)`);
  }
}

/**
 * Peso acumulado até o dia `dia` do mês, em fração de 0 a 1.
 * Dentro de cada decêndio, o peso é distribuído uniformemente pelos dias
 * (mesma regra da planilha de referência).
 */
export function pesoAcumulado(pesos: PesosDecendio, dia: number, diasNoMes: number): number {
  validarPesos(pesos);
  const diaLimitado = Math.min(Math.max(Math.floor(dia), 0), diasNoMes);
  const tamanhos = diasDoDecendio(diasNoMes);
  const pesosPorDecendio: Record<DecendioNumero, number> = { 1: pesos.d1, 2: pesos.d2, 3: pesos.d3 };

  let acumulado = 0;
  let diasAntes = 0;
  for (const decendio of [1, 2, 3] as const) {
    const tamanho = tamanhos[decendio];
    const decorridosNoDecendio = Math.min(Math.max(diaLimitado - diasAntes, 0), tamanho);
    acumulado += pesosPorDecendio[decendio] * (decorridosNoDecendio / tamanho);
    diasAntes += tamanho;
  }
  return acumulado;
}

/** Realizado ÷ peso acumulado. Null quando ainda não há peso (início do mês). */
export function projecaoFechamento(realizado: number, pesoAcum: number): number | null {
  if (pesoAcum <= 0) return null;
  return realizado / pesoAcum;
}

/** Meta de cada decêndio: meta do mês × peso do decêndio. */
export function metasPorDecendio(meta: number, pesos: PesosDecendio): Record<DecendioNumero, number> {
  validarPesos(pesos);
  return { 1: meta * pesos.d1, 2: meta * pesos.d2, 3: meta * pesos.d3 };
}

/** Valor ÷ meta. Null sem meta. */
export function percentualAtingido(valor: number, meta: number): number | null {
  return meta > 0 ? valor / meta : null;
}

/** Meta − realizado até agora. Negativo = meta já superada. */
export function gapRealizado(meta: number, realizado: number): number {
  return meta - realizado;
}

/** Meta − projeção de fechamento. Positivo = projeção abaixo da meta. */
export function gapProjetado(meta: number, projecao: number | null): number | null {
  return projecao === null ? null : meta - projecao;
}

/**
 * Meta diária necessária distribuída pelos pesos dos dias que faltam
 * (mesmos pesos da projeção: histórico do ano anterior ou fallback da meta).
 */
export function metaDiariaNecessaria(entrada: {
  meta: number;
  realizado: number;
  diasDecorridos: number;
  /** Peso de cada dia do mês (ver pesosDiarios em pesos.ts). O tamanho é o nº de dias do mês. */
  pesosDiarios: number[];
}): MetaDiaria {
  const { meta, realizado, pesosDiarios } = entrada;
  const totalDias = pesosDiarios.length;
  const decorridos = Math.min(Math.max(Math.floor(entrada.diasDecorridos), 0), totalDias);
  const diasRestantes = totalDias - decorridos;
  const falta = Math.max(meta - realizado, 0);

  const restantes = pesosDiarios.slice(decorridos);
  const pesoRestante = restantes.reduce((soma, peso) => soma + peso, 0);
  const pesoFeito = pesosDiarios.slice(0, decorridos).reduce((soma, peso) => soma + peso, 0);

  const cronograma: DiaNecessario[] = restantes.map((peso, i) => ({
    dia: decorridos + 1 + i,
    peso,
    valor: falta === 0 ? 0 : pesoRestante > 0 ? (falta * peso) / pesoRestante : null,
  }));

  const ritmoAtual = decorridos > 0 ? realizado / decorridos : null;
  const aceleracao =
    diasRestantes > 0 && pesoRestante > 0 && pesoFeito > 0 && realizado > 0
      ? falta / pesoRestante / (realizado / pesoFeito)
      : null;

  return {
    necessaria: cronograma[0]?.valor ?? null,
    ritmoAtual,
    aceleracao,
    diasRestantes,
    cronograma,
  };
}

/** Atingida: já bateu. No ritmo: a projeção bate. Em risco: a projeção não bate. */
export function statusMeta(meta: number, realizado: number, projecao: number | null): StatusMeta {
  if (realizado >= meta) return 'atingida';
  if (projecao !== null && projecao >= meta) return 'no_ritmo';
  return 'em_risco';
}
