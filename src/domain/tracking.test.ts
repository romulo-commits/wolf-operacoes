import { describe, expect, it } from 'vitest';
import { indiceTracking, statusTracking } from './tracking';

describe('indiceTracking', () => {
  it('receita GA4 ÷ receita lançada', () => {
    expect(indiceTracking(110, 100)).toBeCloseTo(1.1, 10);
    expect(indiceTracking(0, 100)).toBe(0);
  });

  it('sem GA4 ou sem lançamento não há índice', () => {
    expect(indiceTracking(null, 100)).toBeNull();
    expect(indiceTracking(100, null)).toBeNull();
    expect(indiceTracking(100, 0)).toBeNull();
  });
});

describe('statusTracking', () => {
  it('dentro de ±10% é confiável', () => {
    expect(statusTracking(1.05)).toBe('ok');
    expect(statusTracking(0.95)).toBe('ok');
  });

  it('fora de ±10% diverge', () => {
    expect(statusTracking(1.2)).toBe('divergente');
    expect(statusTracking(0.8)).toBe('divergente');
  });

  it('sem índice não há status', () => {
    expect(statusTracking(null)).toBe('sem_dado');
  });

  it('aceita tolerância própria', () => {
    expect(statusTracking(1.2, 0.25)).toBe('ok');
  });
});
