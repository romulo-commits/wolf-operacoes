import { describe, expect, it } from 'vitest';
import { resumirMes } from './resumo';
import type { MetaMes } from './tipos';

const meta: MetaMes = {
  clientId: 'c1',
  ano: 2026,
  mes: 10,
  metaReceita: 1000,
  premissas: { orcamento: 100, cps: 0.5, conversao: 0.01, ticket: 100 },
  pesos: { d1: 0.3, d2: 0.3, d3: 0.4 },
  motivoAlteracao: null,
  updatedBy: null,
  updatedAt: null,
};

describe('resumirMes', () => {
  it('sem meta definida: só o realizado, grade NC', () => {
    const r = resumirMes({ meta: null, realizado: 500, diasFechados: 10, diasNoMes: 30, receitaAnoAnterior: 800 });
    expect(r.temMeta).toBe(false);
    expect(r.projecao).toBeNull();
    expect(r.grade.nota).toBe('NC');
  });

  it('projeta pelo peso acumulado e classifica', () => {
    // Dia 10 de 30 com D1 = 30%: peso 0,30 → projeção 600 ÷ 0,30 = 2000
    const r = resumirMes({ meta, realizado: 600, diasFechados: 10, diasNoMes: 30, receitaAnoAnterior: 1000 });
    expect(r.pesoAcumulado).toBeCloseTo(0.3, 10);
    expect(r.projecao).toBeCloseTo(2000, 6);
    expect(r.percentualProjetado).toBeCloseTo(2, 6);
    expect(r.status).toBe('no_ritmo');
    expect(r.variacaoAnoAnterior).toBeCloseTo(1, 6);
    expect(r.grade.nota).toBe('G0');
    expect(r.diaria?.necessaria).toBeCloseTo(20, 6);
  });

  it('início do mês: sem projeção, grade NC', () => {
    const r = resumirMes({ meta, realizado: 0, diasFechados: 0, diasNoMes: 30, receitaAnoAnterior: null });
    expect(r.projecao).toBeNull();
    expect(r.status).toBe('em_risco');
    expect(r.grade.nota).toBe('NC');
  });
});
