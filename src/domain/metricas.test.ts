import { describe, expect, it } from 'vitest';
import { acompanharMetrica, metasDoFunil } from './metricas';
import type { MetaMes } from './tipos';

const out2025 = (porDia: (dia: number) => number, dias = 31) =>
  Array.from({ length: dias }, (_, i) => ({ date: `2025-10-${String(i + 1).padStart(2, '0')}`, valor: porDia(i + 1) }));

const base = {
  anoAnterior: 2025,
  mes: 10,
  pesosMeta: { d1: 0.3, d2: 0.3, d3: 0.4 },
  diasFechados: 24,
  diasNoMes: 31,
};

describe('metasDoFunil', () => {
  it('investimento = orçamento, sessões = orçamento ÷ CPS, pedidos = sessões × conversão', () => {
    const meta = { premissas: { orcamento: 1000, cps: 2, conversao: 0.02, ticket: 100 } } as MetaMes;
    expect(metasDoFunil(meta)).toEqual({ investimento: 1000, sessoes: 500, pedidos: 10 });
  });

  it('premissas inválidas: só o investimento tem meta', () => {
    const meta = { premissas: { orcamento: 1000, cps: 0, conversao: 0.02, ticket: 100 } } as MetaMes;
    expect(metasDoFunil(meta)).toEqual({ investimento: 1000, sessoes: null, pedidos: null });
  });
});

describe('acompanharMetrica', () => {
  // Investimento out/2025: D1 10 × 1.000 = 10k · D2 10 × 2.000 = 20k · D3 11 × 1.000 = 11k · total 41k
  // Pesos 10/41, 20/41, 11/41 · cada dia de D1 e D3 pesa 1/41, cada dia de D2 pesa 2/41
  const historico = out2025((dia) => (dia >= 11 && dia <= 20 ? 2000 : 1000));
  const a = acompanharMetrica({ ...base, metrica: 'investimento', meta: 31_000, realizado: 20_400, historico });

  it('usa os pesos históricos da própria métrica', () => {
    expect(a.pesos.origem).toBe('historico');
    expect(a.pesos.pesos.d1).toBeCloseTo(10 / 41, 12);
    expect(a.pesos.pesos.d2).toBeCloseTo(20 / 41, 12);
    expect(a.pesos.pesos.d3).toBeCloseTo(11 / 41, 12);
  });

  it('esperado até agora = meta × peso acumulado; projeção = realizado ÷ peso acumulado', () => {
    // Peso até o dia 24 = (10 + 20 + 4) ÷ 41 = 34/41
    expect(a.pesoAcumulado).toBeCloseTo(34 / 41, 12);
    expect(a.esperadoAteAgora).toBeCloseTo((31_000 * 34) / 41, 6); // 25.707,32
    expect(a.projecao).toBeCloseTo(24_600, 6); // 20.400 × 41 ÷ 34
    expect(a.percentualProjetado).toBeCloseTo(24_600 / 31_000, 12);
    expect(a.ritmoVsEsperado).toBeCloseTo(20_400 / ((31_000 * 34) / 41), 12);
  });

  it('ritmo necessário por dia é o ponderado (dias 25–31 pesam 1/41 cada)', () => {
    // Falta 10.600; peso restante 7/41; cada dia 1/41 → 10.600 ÷ 7 = 1.514,29
    expect(a.diaria?.necessaria).toBeCloseTo(10_600 / 7, 6);
    expect(a.diaria?.cronograma.map((d) => d.dia)).toEqual([25, 26, 27, 28, 29, 30, 31]);
    // Aceleração = (10.600 ÷ 7/41) ÷ (20.400 ÷ 34/41) = 10.600 × 34 ÷ (7 × 20.400) = 2,5238
    expect(a.diaria?.aceleracao).toBeCloseTo(2.5238095238, 8);
    expect(a.diaria).not.toHaveProperty('necessariaMedia');
  });

  it('histórico com menos de 80% dos dias: fallback para os pesos d1/d2/d3 da meta', () => {
    const curto = out2025(() => 1000, 20); // 20 dias < 25 (80% de 31)
    const f = acompanharMetrica({ ...base, metrica: 'sessoes', meta: 1000, realizado: 600, historico: curto });
    expect(f.pesos.origem).toBe('meta');
    // 0,3 + 0,3 + 0,4 × 4/11 = 0,745454…
    expect(f.pesoAcumulado).toBeCloseTo(0.6 + (0.4 * 4) / 11, 12);
    expect(f.projecao).toBeCloseTo(600 / (0.6 + (0.4 * 4) / 11), 9);
  });

  it('sem meta: projeta, mas sem esperado nem ritmo necessário', () => {
    const s = acompanharMetrica({ ...base, metrica: 'pedidos', meta: null, realizado: 340, historico });
    expect(s.esperadoAteAgora).toBeNull();
    expect(s.diaria).toBeNull();
    expect(s.percentualProjetado).toBeNull();
    expect(s.projecao).toBeCloseTo(410, 9); // 340 × 41 ÷ 34
  });

  it('sem realizado (sem dado): sem projeção', () => {
    const s = acompanharMetrica({ ...base, metrica: 'investimento', meta: 31_000, realizado: null, historico });
    expect(s.projecao).toBeNull();
    expect(s.diaria).toBeNull();
    expect(s.esperadoAteAgora).toBeCloseTo((31_000 * 34) / 41, 6);
  });
});
