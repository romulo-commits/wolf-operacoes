import { describe, expect, it } from 'vitest';
import { calcularMetaReversa } from './calculadora';
import {
  distribuirMetaDiaria,
  EXEMPLO_ANATOMIA,
  fatiasPorCanal,
  percentuaisFecham100,
  planejarFunil,
  type DiaPlano,
} from './planejamento';

describe('planejarFunil', () => {
  it('bruto = pago ÷ aprovação, pedidos = bruto ÷ ticket, sessões = pedidos ÷ conversão', () => {
    const r = planejarFunil({
      faturadoPago: EXEMPLO_ANATOMIA.faturadoPago,
      taxaAprovacao: EXEMPLO_ANATOMIA.taxaAprovacao,
      ticketMedio: EXEMPLO_ANATOMIA.ticketMedio,
      taxaConversao: EXEMPLO_ANATOMIA.taxaConversao,
      cps: 0.8,
    });
    expect(r).not.toBeNull();
    expect(r!.bruto).toBeCloseTo(1_000_000 / 0.92, 6);
    expect(r!.pedidos).toBeCloseTo(r!.bruto / 250, 6);
    expect(r!.sessoes).toBeCloseTo(r!.pedidos / 0.02, 6);
    expect(r!.investimento).toBeCloseTo(r!.sessoes * 0.8, 6);
    expect(r!.roas).toBeCloseTo(1_000_000 / r!.investimento, 6);
  });

  it('com aprovação de 100% coincide com a calculadora da meta (pago ÷ ticket)', () => {
    const pago = 2_414_530.16;
    const funil = planejarFunil({
      faturadoPago: pago,
      taxaAprovacao: 1,
      ticketMedio: 260.5,
      taxaConversao: 0.0151,
      cps: 0.94,
    })!;
    const reverso = calcularMetaReversa({
      metaFaturamento: pago,
      ticketMedio: 260.5,
      taxaConversao: 0.0151,
      cps: 0.94,
    });
    expect(funil.bruto).toBeCloseTo(pago, 6);
    expect(funil.pedidos).toBeCloseTo(reverso.pedidos, 6);
    expect(funil.sessoes).toBeCloseTo(reverso.sessoes, 6);
    expect(funil.investimento).toBeCloseTo(577_000, 2);
  });

  it('devolve null sem os insumos', () => {
    expect(
      planejarFunil({ faturadoPago: 1000, taxaAprovacao: 0, ticketMedio: 100, taxaConversao: 0.01, cps: 1 }),
    ).toBeNull();
  });
});

describe('percentuais dos canais', () => {
  it('aceita a divisão da anatomia e recusa o que não soma 100', () => {
    expect(percentuaisFecham100(Object.values(EXEMPLO_ANATOMIA.origem))).toBe(true);
    expect(percentuaisFecham100([35, 25, 15, 15, 9])).toBe(false);
    expect(percentuaisFecham100([50, 50])).toBe(true);
    expect(percentuaisFecham100([-1, 101])).toBe(false);
  });
});

describe('distribuirMetaDiaria', () => {
  const pesos = { normal: 1, campanha: 2, comercial: 2 };

  it('reparte a meta e a soma fecha, inclusive com resto de centavos', () => {
    const dias: DiaPlano[] = [
      { dia: 1, tipo: 'normal', valorManual: null },
      { dia: 2, tipo: 'normal', valorManual: null },
      { dia: 3, tipo: 'normal', valorManual: null },
    ];
    const r = distribuirMetaDiaria(100, dias, pesos);
    expect(r.fecha).toBe(true);
    expect(r.soma).toBe(100);
    expect(r.dias.map((dia) => dia.valor).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it('dia de campanha com o dobro do peso leva o dobro do dia normal', () => {
    const dias: DiaPlano[] = [
      { dia: 1, tipo: 'normal', valorManual: null },
      { dia: 2, tipo: 'campanha', valorManual: null },
    ];
    const r = distribuirMetaDiaria(90, dias, pesos);
    expect(r.fecha).toBe(true);
    expect(r.dias[0].valor).toBe(30);
    expect(r.dias[1].valor).toBe(60);
  });

  it('valor manual entra na soma; se não fechar a meta, fecha é falso', () => {
    const dias: DiaPlano[] = [
      { dia: 1, tipo: 'normal', valorManual: 40 },
      { dia: 2, tipo: 'normal', valorManual: 50 },
    ];
    const aberto = distribuirMetaDiaria(100, dias, pesos);
    expect(aberto.soma).toBe(90);
    expect(aberto.fecha).toBe(false);

    const fechado = distribuirMetaDiaria(100, [
      { dia: 1, tipo: 'normal', valorManual: 40 },
      { dia: 2, tipo: 'normal', valorManual: null },
    ], pesos);
    expect(fechado.soma).toBe(100);
    expect(fechado.dias[1].valor).toBe(60);
    expect(fechado.fecha).toBe(true);
  });
});

describe('fatiasPorCanal', () => {
  it('investimento do canal = sessões do canal × CPS', () => {
    const origem = EXEMPLO_ANATOMIA.origem;
    const fatias = fatiasPorCanal(200_000, 0.5, 1_000_000, origem, origem);
    const meta = fatias.find((fatia) => fatia.canal === 'meta_ads')!;
    expect(meta.sessoes).toBeCloseTo(70_000, 6);
    expect(meta.investimento).toBeCloseTo(35_000, 6);
    expect(meta.receita).toBeCloseTo(350_000, 6);
    expect(fatias.reduce((total, fatia) => total + fatia.investimento, 0)).toBeCloseTo(100_000, 4);
  });
});
