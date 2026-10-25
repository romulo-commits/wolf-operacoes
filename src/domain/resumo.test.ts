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
    // Falta 400; peso restante 0,70; dia 11 pesa 0,03 → 400 × 0,03 ÷ 0,70
    expect(r.diaria?.necessaria).toBeCloseTo(12 / 0.7, 6);
    expect(r.pesos?.origem).toBe('meta');
  });

  it('com histórico do ano anterior, usa os pesos históricos em tudo', () => {
    // Histórico D1 = 50%, D2 = 25%, D3 = 25% (a meta diz 30/30/40, mas não vale)
    const r = resumirMes({
      meta,
      realizado: 600,
      diasFechados: 10,
      diasNoMes: 30,
      receitaAnoAnterior: 1000,
      pesosHistoricos: { d1: 0.5, d2: 0.25, d3: 0.25 },
    });
    expect(r.pesos?.origem).toBe('historico');
    expect(r.pesoAcumulado).toBeCloseTo(0.5, 10);
    expect(r.projecao).toBeCloseTo(1200, 6); // 600 ÷ 0,5
    expect(r.metasDecendio).toEqual({ 1: 500, 2: 250, 3: 250 });
    // Falta 400 em peso restante 0,5; dia 11 pesa 0,025 → 400 × 0,025 ÷ 0,5 = 20
    expect(r.diaria?.necessaria).toBeCloseTo(20, 6);
  });

  it('início do mês: sem projeção, grade NC', () => {
    const r = resumirMes({ meta, realizado: 0, diasFechados: 0, diasNoMes: 30, receitaAnoAnterior: null });
    expect(r.projecao).toBeNull();
    expect(r.status).toBe('em_risco');
    expect(r.grade.nota).toBe('NC');
  });
});
