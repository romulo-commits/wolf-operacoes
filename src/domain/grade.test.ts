import { describe, expect, it } from 'vitest';
import { calcularGrade, faixaDe } from './grade';
import { MATRIZ_GRADE, type Faixa } from './grade-config';

describe('faixaDe', () => {
  it('A: variação de zero para cima', () => {
    expect(faixaDe(0)).toBe('A');
    expect(faixaDe(0.3)).toBe('A');
  });

  it('B: de -5% até antes de 0%', () => {
    expect(faixaDe(-0.0001)).toBe('B');
    expect(faixaDe(-0.05)).toBe('B');
  });

  it('C: de -15% até antes de -5%', () => {
    expect(faixaDe(-0.0501)).toBe('C');
    expect(faixaDe(-0.15)).toBe('C');
  });

  it('D: abaixo de -15%', () => {
    expect(faixaDe(-0.16)).toBe('D');
  });

  it('sem dado não tem faixa', () => {
    expect(faixaDe(null)).toBeNull();
    expect(faixaDe(Number.NaN)).toBeNull();
  });
});

describe('calcularGrade', () => {
  it('meta batida e crescimento: G0', () => {
    expect(calcularGrade({ desvioMeta: 0.02, variacaoAnoAnterior: 0.1 })).toEqual({
      nota: 'G0',
      faixaAtingimento: 'A',
      faixaVariacao: 'A',
    });
  });

  it('92% da meta com ano anterior estável: G1', () => {
    expect(calcularGrade({ desvioMeta: -0.1, variacaoAnoAnterior: 0 }).nota).toBe('G1');
  });

  it('queda forte nos dois eixos: G3', () => {
    expect(calcularGrade({ desvioMeta: -0.2, variacaoAnoAnterior: -0.2 }).nota).toBe('G3');
  });

  it('sem dado em um eixo: NC', () => {
    const r = calcularGrade({ desvioMeta: null, variacaoAnoAnterior: 0.1 });
    expect(r.nota).toBe('NC');
    expect(r.faixaAtingimento).toBeNull();
    expect(r.faixaVariacao).toBe('A');
  });

  it('toda combinação da matriz devolve uma nota válida', () => {
    const faixas: Faixa[] = ['A', 'B', 'C', 'D'];
    const valores: Record<Faixa, number> = { A: 0.01, B: -0.02, C: -0.1, D: -0.3 };
    for (const linha of faixas) {
      for (const coluna of faixas) {
        const r = calcularGrade({ desvioMeta: valores[linha], variacaoAnoAnterior: valores[coluna] });
        expect(r.nota).toBe(MATRIZ_GRADE[linha][coluna]);
      }
    }
  });
});
