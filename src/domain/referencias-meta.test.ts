import { describe, expect, it } from 'vitest';
import {
  mediasBase,
  mesesAnteriores,
  sazonalidadeAnoAnterior,
  variacaoSobre,
  type ResultadoMensal,
} from './referencias-meta';

function mes(ano: number, mesNumero: number, receita: number | null, investimento: number | null = null): ResultadoMensal {
  return {
    ano,
    mes: mesNumero,
    receita,
    investimento,
    pedidos: null,
    sessoes: null,
    cps: null,
    conversao: null,
    ticket: null,
  };
}

describe('mediasBase', () => {
  it('média dos três meses, com ROAS médio e não a razão das médias', () => {
    const esperados = mesesAnteriores({ ano: 2026, mes: 10 }, 3);
    expect(esperados).toEqual([
      { ano: 2026, mes: 7 },
      { ano: 2026, mes: 8 },
      { ano: 2026, mes: 9 },
    ]);
    const serie = [
      mes(2026, 7, 100, 50),
      mes(2026, 8, 300, 100),
      mes(2026, 9, 200, 100),
    ];
    const medias = mediasBase(esperados, serie);
    expect(medias.completa).toBe(true);
    expect(medias.receita).toBe(200);
    expect(medias.investimento).toBeCloseTo(250 / 3, 6);
    // ROAS mensais 2, 3 e 2. A razão das médias seria 2,4.
    expect(medias.roas).toBeCloseTo(7 / 3, 6);
  });

  it('não calcula média se falta um dos três meses', () => {
    const medias = mediasBase(mesesAnteriores({ ano: 2026, mes: 10 }, 3), [mes(2026, 7, 100, 50), mes(2026, 8, 100, 50)]);
    expect(medias.completa).toBe(false);
    expect(medias.mesesFaltantes).toEqual([{ ano: 2026, mes: 9 }]);
    expect(medias.receita).toBeNull();
    expect(medias.roas).toBeNull();
  });
});

describe('sazonalidadeAnoAnterior', () => {
  it('índice e participação só com os 12 meses', () => {
    const serie = Array.from({ length: 12 }, (_, indice) => mes(2025, indice + 1, indice === 9 ? 200 : 100));
    const saz = sazonalidadeAnoAnterior(2025, 10, serie);
    expect(saz.serieCompleta).toBe(true);
    expect(saz.receitaMes).toBe(200);
    const soma = 200 + 100 * 11;
    expect(saz.participacaoReceita).toBeCloseTo(200 / soma, 6);
    expect(saz.indiceVsMediaAnual).toBeCloseTo(200 / (soma / 12), 6);
    expect(saz.variacaoVsMesAnterior).toBeCloseTo(1, 6);
  });

  it('série parcial não vira índice', () => {
    const saz = sazonalidadeAnoAnterior(2025, 10, [mes(2025, 6, 100), mes(2025, 10, 180)]);
    expect(saz.serieCompleta).toBe(false);
    expect(saz.indiceVsMediaAnual).toBeNull();
    expect(saz.participacaoReceita).toBeNull();
    expect(saz.receitaMes).toBe(180);
    expect(saz.mesesComReceita).toBe(2);
  });
});

describe('variacaoSobre', () => {
  it('meta acima, igual e sem base', () => {
    expect(variacaoSobre(110, 100)).toBeCloseTo(0.1, 6);
    expect(variacaoSobre(100, 100)).toBe(0);
    expect(variacaoSobre(100, null)).toBeNull();
    expect(variacaoSobre(100, 0)).toBeNull();
  });
});
