import { describe, expect, it } from 'vitest';
import { diasFechados, diasNoMes } from './calendario';

describe('diasNoMes', () => {
  it('conta dias respeitando fevereiro bissexto', () => {
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2024, 2)).toBe(29);
    expect(diasNoMes(2026, 10)).toBe(31);
  });
});

describe('diasFechados', () => {
  it('mês corrente: dados fecham no dia anterior', () => {
    expect(diasFechados(2026, 10, new Date(2026, 9, 25))).toBe(24);
  });

  it('primeiro dia do mês: nada fechado ainda', () => {
    expect(diasFechados(2026, 10, new Date(2026, 9, 1))).toBe(0);
  });

  it('mês passado: todos os dias', () => {
    expect(diasFechados(2026, 9, new Date(2026, 9, 25))).toBe(30);
  });

  it('mês futuro: zero', () => {
    expect(diasFechados(2026, 11, new Date(2026, 9, 25))).toBe(0);
  });
});
