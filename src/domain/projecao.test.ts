import { describe, expect, it } from 'vitest';
import {
  diasDoDecendio,
  gapProjetado,
  gapRealizado,
  metaDiariaNecessaria,
  metasPorDecendio,
  pesoAcumulado,
  percentualAtingido,
  projecaoFechamento,
  statusMeta,
  validarPesos,
} from './projecao';

const pesos = { d1: 0.3, d2: 0.3, d3: 0.4 };

describe('diasDoDecendio', () => {
  it('divide o mês em 10, 10 e o resto', () => {
    expect(diasDoDecendio(31)).toEqual({ 1: 10, 2: 10, 3: 11 });
    expect(diasDoDecendio(28)).toEqual({ 1: 10, 2: 10, 3: 8 });
  });
});

describe('validarPesos', () => {
  it('aceita pesos que somam 100%', () => {
    expect(() => validarPesos(pesos)).not.toThrow();
  });

  it('recusa soma diferente de 100%', () => {
    expect(() => validarPesos({ d1: 0.5, d2: 0.5, d3: 0.5 })).toThrow(RangeError);
  });

  it('recusa peso negativo', () => {
    expect(() => validarPesos({ d1: -0.1, d2: 0.6, d3: 0.5 })).toThrow(RangeError);
  });
});

describe('pesoAcumulado', () => {
  it('fecha o decêndio com o peso dele', () => {
    expect(pesoAcumulado(pesos, 10, 31)).toBeCloseTo(0.3, 10);
    expect(pesoAcumulado(pesos, 20, 31)).toBeCloseTo(0.6, 10);
  });

  it('distribui o decêndio uniformemente pelos dias', () => {
    // D2 = 0,30 em 10 dias: dia 15 tem 5 dias de D2 = 0,15
    expect(pesoAcumulado(pesos, 15, 31)).toBeCloseTo(0.45, 10);
  });

  it('dia 24 de outubro (D3 com 11 dias)', () => {
    // 0,30 + 0,30 + 0,40 × 4/11
    expect(pesoAcumulado(pesos, 24, 31)).toBeCloseTo(0.6 + (0.4 * 4) / 11, 10);
  });

  it('começa em zero e termina em 100%', () => {
    expect(pesoAcumulado(pesos, 0, 31)).toBe(0);
    expect(pesoAcumulado(pesos, 31, 31)).toBeCloseTo(1, 10);
    expect(pesoAcumulado(pesos, 28, 28)).toBeCloseTo(1, 10);
  });
});

describe('projecaoFechamento', () => {
  it('realizado ÷ peso acumulado', () => {
    expect(projecaoFechamento(300, 0.6)).toBeCloseTo(500, 6);
  });

  it('sem peso acumulado não há projeção', () => {
    expect(projecaoFechamento(300, 0)).toBeNull();
  });
});

describe('metasPorDecendio', () => {
  it('distribui a meta pelos pesos', () => {
    const r = metasPorDecendio(1000, pesos);
    expect(r[1]).toBeCloseTo(300, 6);
    expect(r[2]).toBeCloseTo(300, 6);
    expect(r[3]).toBeCloseTo(400, 6);
  });
});

describe('gap e atingimento', () => {
  it('gap realizado: negativo quando a meta já foi superada', () => {
    expect(gapRealizado(1000, 1200)).toBe(-200);
  });

  it('gap projetado: positivo quando a projeção fica abaixo da meta', () => {
    expect(gapProjetado(1000, 900)).toBe(100);
    expect(gapProjetado(1000, null)).toBeNull();
  });

  it('percentual sem meta é indefinido', () => {
    expect(percentualAtingido(50, 0)).toBeNull();
    expect(percentualAtingido(500, 1000)).toBe(0.5);
  });
});

describe('metaDiariaNecessaria', () => {
  const uniforme30 = Array.from({ length: 30 }, () => 1 / 30);
  // D1 = 30%, D2 = 30%, D3 = 40% em 30 dias: 0,03 / 0,03 / 0,04 por dia
  const ponderado30 = Array.from({ length: 30 }, (_, i) => (i < 20 ? 0.03 : 0.04));

  it('pesos iguais: falta ÷ dias restantes, como antes', () => {
    // Falta 600 em 20 dias = 30/dia · ritmo atual 400 ÷ 10 = 40/dia
    // Aceleração = (600 ÷ 20/30) ÷ (400 ÷ 10/30) = 900 ÷ 1200 = 0,75
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 400, diasDecorridos: 10, pesosDiarios: uniforme30 });
    expect(r.diasRestantes).toBe(20);
    expect(r.necessaria).toBeCloseTo(30, 10);
    expect(r.necessariaMedia).toBeCloseTo(30, 10);
    expect(r.ritmoAtual).toBeCloseTo(40, 10);
    expect(r.aceleracao).toBeCloseTo(0.75, 10);
  });

  it('distribui o que falta pelos pesos dos dias restantes', () => {
    // Peso restante = 10 × 0,03 + 10 × 0,04 = 0,70
    // Dia 11: 600 × 0,03 ÷ 0,70 = 25,714… · Dia 21: 600 × 0,04 ÷ 0,70 = 34,285…
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 400, diasDecorridos: 10, pesosDiarios: ponderado30 });
    expect(r.cronograma).toHaveLength(20);
    expect(r.cronograma[0]).toMatchObject({ dia: 11 });
    expect(r.necessaria).toBeCloseTo(18 / 0.7, 10);
    expect(r.cronograma[10].dia).toBe(21);
    expect(r.cronograma[10].valor).toBeCloseTo(24 / 0.7, 10);
    const soma = r.cronograma.reduce((t, d) => t + (d.valor ?? 0), 0);
    expect(soma).toBeCloseTo(600, 8);
    expect(r.necessariaMedia).toBeCloseTo(30, 10);
    // (600 ÷ 0,70) ÷ (400 ÷ 0,30) = 857,14 ÷ 1333,33 = 0,642857…
    expect(r.aceleracao).toBeCloseTo(0.642857142857, 9);
  });

  it('meta já batida: nada a vender nos dias restantes', () => {
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 1200, diasDecorridos: 15, pesosDiarios: ponderado30 });
    expect(r.necessaria).toBe(0);
    expect(r.aceleracao).toBe(0);
  });

  it('sem dias restantes não há meta diária', () => {
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 400, diasDecorridos: 30, pesosDiarios: uniforme30 });
    expect(r.necessaria).toBeNull();
    expect(r.diasRestantes).toBe(0);
    expect(r.cronograma).toHaveLength(0);
  });

  it('sem dias fechados não há ritmo', () => {
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 0, diasDecorridos: 0, pesosDiarios: uniforme30 });
    expect(r.ritmoAtual).toBeNull();
    expect(r.aceleracao).toBeNull();
    expect(r.necessaria).toBeCloseTo(1000 / 30, 10);
  });
});

describe('statusMeta', () => {
  it('atingida quando o realizado já bate a meta', () => {
    expect(statusMeta(1000, 1000, null)).toBe('atingida');
  });

  it('no ritmo quando a projeção bate a meta', () => {
    expect(statusMeta(1000, 600, 1200)).toBe('no_ritmo');
  });

  it('em risco quando a projeção não bate a meta', () => {
    expect(statusMeta(1000, 600, 900)).toBe('em_risco');
    expect(statusMeta(1000, 600, null)).toBe('em_risco');
  });
});
