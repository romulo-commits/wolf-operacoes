import { describe, expect, it } from 'vitest';
import { montarLinhasCarteira, type EntradaCarteira } from './carteira';
import type { LancamentoReceita, MetaMes } from './tipos';

const lancamento = (periodoInicio: string, receitaAprovada: number, ano = 2026): LancamentoReceita => ({
  id: `${periodoInicio}-${receitaAprovada}`,
  clientId: 'argennti',
  periodoInicio,
  periodoFim: periodoInicio,
  pedidosAprovados: 1,
  receitaAprovada,
  fonte: 'plataforma',
  lancadoPor: 'teste',
  createdAt: `${ano}-10-25T00:00:00Z`,
});

const meta: MetaMes = {
  clientId: 'argennti',
  ano: 2026,
  mes: 10,
  metaReceita: 2_000_000,
  premissas: { orcamento: 577000, cps: 0.91, conversao: 0.0143, ticket: 263 },
  pesos: { d1: 0.33, d2: 0.34, d3: 0.33 },
  motivoAlteracao: null,
  updatedBy: null,
  updatedAt: null,
};

const base: EntradaCarteira = {
  ano: 2026,
  mes: 10,
  hoje: new Date(2026, 9, 25), // 25/10: dados fecham em 24/10
  clientes: [{ id: 'argennti', nome: 'Argennti' }],
  metas: [meta],
  lancamentos: [
    lancamento('2026-10-01', 700_000),
    lancamento('2026-10-11', 500_000),
    lancamento('2026-10-21', 200_000),
    lancamento('2025-10-05', 1_600_000, 2025),
  ],
  sync: [{ clientId: 'argennti', diasAtraso: 1, erro: null }],
  pdas: [
    { clientId: 'argennti', dueDate: '2026-10-20' },
    { clientId: 'argennti', dueDate: '2026-11-05' },
  ],
  receitaGa4: [
    { clientId: 'argennti', date: '2026-10-03', receita: 800_000 },
    { clientId: 'argennti', date: '2026-10-15', receita: 700_000 },
  ],
};

describe('montarLinhasCarteira', () => {
  const [linha] = montarLinhasCarteira(base);

  it('projeta o fechamento pelo peso acumulado dos 24 dias fechados', () => {
    // Peso até dia 24: 0,33 + 0,34 + 0,33 × 4/11 = 0,79 · projeção = 1.400.000 ÷ 0,79
    expect(linha.resumo.pesoAcumulado).toBeCloseTo(0.79, 6);
    expect(linha.resumo.projecao).toBeCloseTo(1_400_000 / 0.79, 4);
    expect(linha.resumo.status).toBe('em_risco');
  });

  it('classifica a grade pela projeção contra meta e ano anterior', () => {
    // Projeção ~1,77 mi = 88,6% da meta (faixa C) e +10,8% contra 1,6 mi (faixa A)
    expect(linha.resumo.grade.nota).toBe('G1');
  });

  it('confiabilidade do GA4 contra a receita lançada', () => {
    // GA4 1,5 mi ÷ lançado 1,4 mi = 1,07 → dentro de ±10%
    expect(linha.receitaGa4).toBe(1_500_000);
    expect(linha.indiceTracking).toBeCloseTo(1.5 / 1.4, 6);
    expect(linha.statusTracking).toBe('ok');
  });

  it('conta PDAs pendentes e vencidas (vencida = prazo anterior a hoje)', () => {
    expect(linha.pdasPendentes).toBe(2);
    expect(linha.pdasVencidas).toBe(1);
  });

  it('gera alertas de PDA e de meta em risco', () => {
    expect(linha.alertas.map((a) => a.tipo)).toEqual(['pdas', 'meta']);
  });

  it('sem GA4 do ano anterior, usa os pesos da meta (fallback)', () => {
    expect(linha.resumo.pesos?.origem).toBe('meta');
  });

  it('com GA4 do mesmo mês do ano anterior, projeta pelos pesos históricos', () => {
    // Out/2025: D1 10 × 50k = 500k · D2 10 × 25k = 250k · D3 11 × 25k = 275k · total 1.025k
    // Peso até dia 24 = (500 + 250 + 4 × 25) ÷ 1025 = 850 ÷ 1025
    const historico = Array.from({ length: 31 }, (_, i) => ({
      clientId: 'argennti',
      date: `2025-10-${String(i + 1).padStart(2, '0')}`,
      receita: i < 10 ? 50_000 : 25_000,
    }));
    const outroCliente = historico.map((h) => ({ ...h, clientId: 'outro', receita: 1 }));
    const [comHistorico] = montarLinhasCarteira({ ...base, ga4AnoAnterior: [...historico, ...outroCliente] });
    const r = comHistorico.resumo;
    expect(r.pesos?.origem).toBe('historico');
    expect(r.pesos?.pesos.d1).toBeCloseTo(500 / 1025, 12);
    expect(r.pesoAcumulado).toBeCloseTo(850 / 1025, 10);
    expect(r.projecao).toBeCloseTo((1_400_000 * 1025) / 850, 4);
    expect(r.metasDecendio?.[1]).toBeCloseTo((2_000_000 * 500) / 1025, 4);
    // Falta 600k; peso restante = 7 dias × 25k ÷ 1025k; cada dia pesa 25 ÷ 1025 → 600k ÷ 7
    expect(r.diaria?.necessaria).toBeCloseTo(600_000 / 7, 4);
  });

  it('cliente sem meta: linha existe, sem projeção', () => {
    const [semMeta] = montarLinhasCarteira({ ...base, metas: [] });
    expect(semMeta.resumo.temMeta).toBe(false);
    expect(semMeta.resumo.grade.nota).toBe('NC');
    expect(semMeta.funil).toBeNull();
  });

  describe('funil: investimento, sessões e pedidos com os pesos de cada um', () => {
    const dia = (ano: number, d: number) => `${ano}-10-${String(d).padStart(2, '0')}`;
    // GA4 out/2025: sessões 2.000/dia em D1 e 1.000/dia depois (20k + 21k = 41k);
    // pedidos 10/dia o mês todo (310)
    const ga4AnoAnterior = Array.from({ length: 31 }, (_, i) => ({
      clientId: 'argennti',
      date: dia(2025, i + 1),
      receita: 10_000,
      sessoes: i < 10 ? 2000 : 1000,
      pedidos: 10,
    }));
    const [l] = montarLinhasCarteira({
      ...base,
      receitaGa4: [
        ...base.receitaGa4,
        { clientId: 'argennti', date: '2026-10-05', receita: 0, sessoes: 30_000 },
        { clientId: 'argennti', date: '2026-10-25', receita: 0, sessoes: 99_999 }, // dia aberto: fora
      ],
      ga4AnoAnterior,
      investimento: [
        { clientId: 'argennti', date: '2026-10-05', valor: 100_000 },
        { clientId: 'argennti', date: '2026-10-24', valor: 50_000 },
        { clientId: 'argennti', date: '2026-10-25', valor: 999 }, // dia aberto: fora
        { clientId: 'outro', date: '2026-10-05', valor: 7 },
      ],
      // sem investimento do ano anterior → investimento cai no fallback
    });
    const f = l.funil!;

    it('metas pela calculadora: 577.000 · 577.000 ÷ 0,91 · × 1,43%', () => {
      expect(f.investimento.meta).toBe(577_000);
      expect(f.sessoes.meta).toBeCloseTo(577_000 / 0.91, 6); // 634.065,93
      expect(f.pedidos.meta).toBeCloseTo((577_000 / 0.91) * 0.0143, 6); // 9.067,14
    });

    it('realizado só até o último dia fechado (24/10) e só do cliente', () => {
      expect(f.investimento.realizado).toBe(150_000);
      expect(f.sessoes.realizado).toBe(30_000); // linhas sem sessões não contam
      expect(f.pedidos.realizado).toBe(3); // pedidos aprovados lançados no mês
    });

    it('cada métrica com a sua origem de pesos', () => {
      expect(f.investimento.pesos.origem).toBe('meta');
      expect(f.investimento.pesoAcumulado).toBeCloseTo(0.79, 12); // 0,33 + 0,34 + 0,33 × 4/11
      expect(f.sessoes.pesos.origem).toBe('historico');
      expect(f.sessoes.pesos.pesos.d1).toBeCloseTo(20 / 41, 12);
      // Peso até dia 24 = (20k + 10k + 4k) ÷ 41k
      expect(f.sessoes.pesoAcumulado).toBeCloseTo(34 / 41, 12);
      expect(f.pedidos.pesos.origem).toBe('historico');
      expect(f.pedidos.pesoAcumulado).toBeCloseTo(24 / 31, 12);
    });

    it('esperado, projeção e ritmo necessário de investimento (fallback)', () => {
      expect(f.investimento.esperadoAteAgora).toBeCloseTo(577_000 * 0.79, 6); // 455.830
      expect(f.investimento.projecao).toBeCloseTo(150_000 / 0.79, 6); // 189.873,42
      // Dias 25–31 em D3: cada um pesa 0,33/11 → falta 427.000 ÷ 7
      expect(f.investimento.diaria?.necessaria).toBeCloseTo(427_000 / 7, 6);
    });

    it('ritmo necessário de pedidos ponderado (todos os dias pesam 1/31)', () => {
      const falta = (577_000 / 0.91) * 0.0143 - 3;
      expect(f.pedidos.diaria?.necessaria).toBeCloseTo(falta / 7, 6);
    });
  });
});
