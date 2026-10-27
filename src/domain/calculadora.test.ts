import { describe, expect, it } from 'vitest';
import { calcularMetaReversa, compararRoas, media, simularMeta } from './calculadora';

describe('simularMeta', () => {
  it('reproduz o exemplo de simulação da planilha de referência', () => {
    // R$ 25.000 ÷ R$ 0,20 = 125.000 sessões · × 0,53% = 662,5 pedidos · × R$ 661,48 = R$ 438.230,50
    const r = simularMeta({ orcamento: 25000, cps: 0.2, conversao: 0.0053, ticket: 661.48 });
    expect(r.sessoes).toBeCloseTo(125000, 6);
    expect(r.pedidos).toBeCloseTo(662.5, 6);
    expect(r.receita).toBeCloseTo(438230.5, 2);
    expect(r.roas).toBeCloseTo(17.53, 2);
    expect(r.cpa).toBeCloseTo(37.74, 1);
  });

  it('sem orçamento: ROAS zero e CPA indefinido', () => {
    const r = simularMeta({ orcamento: 0, cps: 0.2, conversao: 0.01, ticket: 100 });
    expect(r).toEqual({ sessoes: 0, pedidos: 0, receita: 0, roas: 0, cpa: null });
  });

  it('recusa premissas impossíveis', () => {
    const base = { orcamento: 1000, cps: 0.5, conversao: 0.01, ticket: 100 };
    expect(() => simularMeta({ ...base, cps: 0 })).toThrow(RangeError);
    expect(() => simularMeta({ ...base, conversao: 1.5 })).toThrow(RangeError);
    expect(() => simularMeta({ ...base, orcamento: -1 })).toThrow(RangeError);
    expect(() => simularMeta({ ...base, ticket: -1 })).toThrow(RangeError);
  });
});

describe('calcularMetaReversa', () => {
  it('reproduz investimento, pedidos, sessões e ROAS oficiais da Argennti em out/26', () => {
    // De trás para a frente, com os insumos oficiais do Adstart (out/26).
    const r = calcularMetaReversa({
      metaFaturamento: 2_414_530.16,
      ticketMedio: 260.5,
      taxaConversao: 0.0151,
      cps: 0.94,
    });
    expect(Math.round(r.pedidos)).toBe(9269);
    expect(Math.round(r.sessoes)).toBe(613_830);
    expect(r.investimento).toBeCloseTo(577_000, 2);
    expect(r.roas).toBeCloseTo(4.18, 2);
  });

  it('compara o ROAS com histórico e break-even', () => {
    const roas = calcularMetaReversa({
      metaFaturamento: 2_414_530.16,
      ticketMedio: 260.5,
      taxaConversao: 0.0151,
      cps: 0.94,
    }).roas;
    expect(compararRoas(roas, 4.5)).toBe('abaixo');
    expect(compararRoas(roas, 3.09)).toBe('acima');
    expect(compararRoas(roas, roas)).toBe('igual');
    expect(compararRoas(roas, null)).toBe('sem_referencia');
  });

  it('recusa insumos que não fecham a conta', () => {
    const base = { metaFaturamento: 1000, ticketMedio: 100, taxaConversao: 0.01, cps: 0.5 };
    expect(() => calcularMetaReversa({ ...base, metaFaturamento: 0 })).toThrow(RangeError);
    expect(() => calcularMetaReversa({ ...base, ticketMedio: 0 })).toThrow(RangeError);
    expect(() => calcularMetaReversa({ ...base, taxaConversao: 0 })).toThrow(RangeError);
    expect(() => calcularMetaReversa({ ...base, cps: 0 })).toThrow(RangeError);
  });
});

describe('media', () => {
  it('calcula a média simples', () => {
    expect(media([1, 2, 3])).toBe(2);
  });

  it('recusa lista vazia', () => {
    expect(() => media([])).toThrow(RangeError);
  });
});
