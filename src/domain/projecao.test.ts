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
  it('calcula ritmo atual, necessário e aceleração', () => {
    // Falta 600 em 20 dias = 30/dia · ritmo atual 400 ÷ 10 = 40/dia
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 400, diasDecorridos: 10, diasNoMes: 30 });
    expect(r.diasRestantes).toBe(20);
    expect(r.necessaria).toBeCloseTo(30, 10);
    expect(r.ritmoAtual).toBeCloseTo(40, 10);
    expect(r.aceleracao).toBeCloseTo(0.75, 10);
  });

  it('sem dias restantes não há meta diária', () => {
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 400, diasDecorridos: 30, diasNoMes: 30 });
    expect(r.necessaria).toBeNull();
    expect(r.diasRestantes).toBe(0);
  });

  it('sem dias fechados não há ritmo', () => {
    const r = metaDiariaNecessaria({ meta: 1000, realizado: 0, diasDecorridos: 0, diasNoMes: 30 });
    expect(r.ritmoAtual).toBeNull();
    expect(r.aceleracao).toBeNull();
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
