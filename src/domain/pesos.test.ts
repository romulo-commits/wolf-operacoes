import { describe, expect, it } from 'vitest';
import { decendioDoDia, escolherPesos, pesosDiarios, pesosHistoricosDecendio, type SerieDiaria } from './pesos';

/** Receita por dia em D1, D2 e D3 para um mês inteiro. */
function mes(prefixo: string, totalDias: number, porDecendio: [number, number, number]): SerieDiaria[] {
  return Array.from({ length: totalDias }, (_, i) => ({
    date: `${prefixo}-${String(i + 1).padStart(2, '0')}`,
    valor: porDecendio[decendioDoDia(i + 1) - 1],
  }));
}

describe('decendioDoDia', () => {
  it('1–10 = D1, 11–20 = D2, 21–fim = D3', () => {
    expect([1, 10, 11, 20, 21, 31].map(decendioDoDia)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('pesosHistoricosDecendio', () => {
  it('participação de cada decêndio na receita do mês do ano anterior', () => {
    // Out/2025: D1 = 10 × 70k = 700k · D2 = 10 × 50k = 500k · D3 = 11 × 60k = 660k · total 1.860k
    const p = pesosHistoricosDecendio(mes('2025-10', 31, [70_000, 50_000, 60_000]), 2025, 10);
    expect(p?.d1).toBeCloseTo(700 / 1860, 12);
    expect(p?.d2).toBeCloseTo(500 / 1860, 12);
    expect(p?.d3).toBeCloseTo(660 / 1860, 12);
  });

  it('soma os canais do mesmo dia (v_analytics_diario tem uma linha por canal)', () => {
    const umCanal = mes('2025-10', 31, [70_000, 50_000, 60_000]);
    const doisCanais = [...mes('2025-10', 31, [40_000, 20_000, 30_000]), ...mes('2025-10', 31, [30_000, 30_000, 30_000])];
    expect(pesosHistoricosDecendio(doisCanais, 2025, 10)).toEqual(pesosHistoricosDecendio(umCanal, 2025, 10));
  });

  it('ignora dias de outros meses', () => {
    const dados = [...mes('2025-10', 31, [1, 1, 1]), { date: '2025-11-01', valor: 1_000_000 }];
    const p = pesosHistoricosDecendio(dados, 2025, 10);
    expect(p?.d3).toBeCloseTo(11 / 31, 12);
  });

  it('menos de 80% dos dias com dado = sem histórico (fallback)', () => {
    // 31 dias → mínimo 25. Com 24 dias, não usa.
    const dados = mes('2025-10', 31, [1, 1, 1]);
    expect(pesosHistoricosDecendio(dados.slice(0, 24), 2025, 10)).toBeNull();
    expect(pesosHistoricosDecendio(dados.slice(0, 25), 2025, 10)).not.toBeNull();
  });

  it('receita zero ou sem dados = sem histórico', () => {
    expect(pesosHistoricosDecendio(mes('2025-10', 31, [0, 0, 0]), 2025, 10)).toBeNull();
    expect(pesosHistoricosDecendio([], 2025, 10)).toBeNull();
  });
});

describe('pesosDiarios', () => {
  it('reproduz o peso acumulado da planilha (outubro: 37,5% / 28,7% / 33,8%)', () => {
    const d = pesosDiarios({ d1: 0.375, d2: 0.287, d3: 0.338 }, 31);
    expect(d).toHaveLength(31);
    expect(d[0]).toBeCloseTo(0.0375, 12);
    expect(d[20]).toBeCloseTo(0.338 / 11, 12);
    const acumulado = (dia: number) => d.slice(0, dia).reduce((t, p) => t + p, 0);
    // Planilha: dia 11 = 40,4% · dia 21 = 69,3% · dia 31 = 100%
    expect(acumulado(11)).toBeCloseTo(0.4037, 4);
    expect(acumulado(21)).toBeCloseTo(0.69273, 4);
    expect(acumulado(31)).toBeCloseTo(1, 12);
  });

  it('fevereiro bissexto: D3 tem 9 dias', () => {
    const d = pesosDiarios({ d1: 0.3, d2: 0.3, d3: 0.4 }, 29);
    expect(d[28]).toBeCloseTo(0.4 / 9, 12);
  });
});

describe('escolherPesos', () => {
  const pesosMeta = { d1: 0.33, d2: 0.34, d3: 0.33 };

  it('usa o histórico quando existe', () => {
    const r = escolherPesos({ d1: 0.5, d2: 0.25, d3: 0.25 }, pesosMeta, 30);
    expect(r.origem).toBe('historico');
    expect(r.pesos.d1).toBe(0.5);
    expect(r.diarios[0]).toBeCloseTo(0.05, 12);
  });

  it('sem histórico, cai nos pesos d1/d2/d3 da meta', () => {
    const r = escolherPesos(null, pesosMeta, 30);
    expect(r.origem).toBe('meta');
    expect(r.pesos).toEqual(pesosMeta);
  });
});
