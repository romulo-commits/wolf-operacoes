import type { Premissas } from './tipos';

export interface ResultadoSimulacao {
  sessoes: number;
  pedidos: number;
  receita: number;
  /** Receita ÷ orçamento. */
  roas: number;
  /** Orçamento ÷ pedidos. Null sem pedidos. */
  cpa: number | null;
}

/**
 * Simulador de meta, sem estado nem persistência.
 * Sessões = orçamento ÷ CPS · Pedidos = sessões × conversão · Receita = pedidos × ticket.
 */
export function simularMeta(premissas: Premissas): ResultadoSimulacao {
  const { orcamento, cps, conversao, ticket } = premissas;
  if (orcamento < 0) throw new RangeError('Orçamento não pode ser negativo');
  if (cps <= 0) throw new RangeError('CPS precisa ser maior que zero');
  if (conversao < 0 || conversao > 1) throw new RangeError('Conversão precisa estar entre 0% e 100%');
  if (ticket < 0) throw new RangeError('Ticket não pode ser negativo');

  const sessoes = orcamento / cps;
  const pedidos = sessoes * conversao;
  const receita = pedidos * ticket;

  return {
    sessoes,
    pedidos,
    receita,
    roas: orcamento > 0 ? receita / orcamento : 0,
    cpa: pedidos > 0 ? orcamento / pedidos : null,
  };
}

/** Média simples. Usada para a média base dos últimos meses. */
export function media(valores: number[]): number {
  if (valores.length === 0) throw new RangeError('Média de lista vazia');
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

export interface EntradaMetaReversa {
  metaFaturamento: number;
  /** Ticket médio (R$). */
  ticketMedio: number;
  /** Fração: 0,0151 = 1,51%. */
  taxaConversao: number;
  /** Custo por sessão (R$). */
  cps: number;
}

export interface ResultadoMetaReversa {
  pedidos: number;
  sessoes: number;
  investimento: number;
  roas: number;
}

/**
 * Calculadora de trás para a frente.
 * Pedidos = meta ÷ ticket · Sessões = pedidos ÷ conversão · Investimento = sessões × CPS ·
 * ROAS = faturamento ÷ investimento.
 */
export function calcularMetaReversa(entrada: EntradaMetaReversa): ResultadoMetaReversa {
  const { metaFaturamento, ticketMedio, taxaConversao, cps } = entrada;
  if (!(metaFaturamento > 0) || !Number.isFinite(metaFaturamento)) {
    throw new RangeError('Meta de faturamento precisa ser maior que zero');
  }
  if (!(ticketMedio > 0) || !Number.isFinite(ticketMedio)) {
    throw new RangeError('Ticket médio precisa ser maior que zero');
  }
  if (!(taxaConversao > 0) || taxaConversao > 1 || !Number.isFinite(taxaConversao)) {
    throw new RangeError('Taxa de conversão precisa estar entre 0% e 100%');
  }
  if (!(cps > 0) || !Number.isFinite(cps)) {
    throw new RangeError('CPS precisa ser maior que zero');
  }

  const pedidos = metaFaturamento / ticketMedio;
  const sessoes = pedidos / taxaConversao;
  const investimento = sessoes * cps;

  return {
    pedidos,
    sessoes,
    investimento,
    roas: investimento > 0 ? metaFaturamento / investimento : 0,
  };
}

/** ROAS = receita ÷ investimento. Null sem os dois números ou com investimento zero. */
export function roasDe(receita: number | null, investimento: number | null): number | null {
  if (receita === null || investimento === null) return null;
  if (!Number.isFinite(receita) || !Number.isFinite(investimento) || !(investimento > 0)) return null;
  return receita / investimento;
}

export type PosicaoRoas = 'acima' | 'igual' | 'abaixo' | 'sem_referencia';

export const ROTULO_POSICAO_ROAS: Record<PosicaoRoas, string> = {
  acima: 'Acima',
  igual: 'Igual',
  abaixo: 'Abaixo',
  sem_referencia: 'Sem referência',
};

/** Compara um ROAS com histórico ou break-even. Sem número de referência, não inventa posição. */
export function compararRoas(roas: number, referencia: number | null): PosicaoRoas {
  if (referencia === null || !Number.isFinite(referencia) || !Number.isFinite(roas)) return 'sem_referencia';
  const delta = roas - referencia;
  if (Math.abs(delta) <= 1e-9) return 'igual';
  return delta > 0 ? 'acima' : 'abaixo';
}
