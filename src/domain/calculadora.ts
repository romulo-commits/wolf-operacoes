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
