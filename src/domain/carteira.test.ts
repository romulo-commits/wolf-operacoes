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

  it('cliente sem meta: linha existe, sem projeção', () => {
    const [semMeta] = montarLinhasCarteira({ ...base, metas: [] });
    expect(semMeta.resumo.temMeta).toBe(false);
    expect(semMeta.resumo.grade.nota).toBe('NC');
  });
});
