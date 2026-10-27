import { describe, expect, it } from 'vitest';
import { dataBr, dataBrParaIso, mascararDataBr } from './formatar';

describe('datas em pt-BR', () => {
  it('mostra e grava dd/mm/aaaa', () => {
    expect(dataBr('2026-10-27')).toBe('27/10/2026');
    expect(mascararDataBr('27102026')).toBe('27/10/2026');
    expect(mascararDataBr('27/10')).toBe('27/10');
    expect(dataBrParaIso('27/10/2026')).toBe('2026-10-27');
  });

  it('recusa dia que não existe', () => {
    expect(dataBrParaIso('31/02/2026')).toBeNull();
    expect(dataBrParaIso('10/27/2026')).toBeNull();
    expect(dataBr(null)).toBe('—');
  });
});