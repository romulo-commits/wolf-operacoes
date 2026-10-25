import { describe, expect, it } from 'vitest';
import { media, simularMeta } from './calculadora';

describe('simularMeta', () => {
  it('reproduz a calculadora de referência (Rei das Joias, set)', () => {
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

describe('media', () => {
  it('calcula a média simples', () => {
    expect(media([1, 2, 3])).toBe(2);
  });

  it('recusa lista vazia', () => {
    expect(() => media([])).toThrow(RangeError);
  });
});
