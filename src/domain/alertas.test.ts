import { describe, expect, it } from 'vitest';
import { gerarAlertas } from './alertas';

const ok = { diasAtrasoSync: 0, statusTracking: 'ok' as const, pdasVencidas: 0, statusMeta: 'no_ritmo' as const };

describe('gerarAlertas', () => {
  it('sem problemas: nenhum alerta', () => {
    expect(gerarAlertas(ok)).toEqual([]);
  });

  it('sync sem dado é crítico', () => {
    const [alerta] = gerarAlertas({ ...ok, diasAtrasoSync: null });
    expect(alerta).toMatchObject({ tipo: 'sync', severidade: 'critico' });
  });

  it('sync atrasado: 2 dias é atenção, 8 dias é crítico', () => {
    expect(gerarAlertas({ ...ok, diasAtrasoSync: 2 })[0]).toMatchObject({ severidade: 'atencao' });
    expect(gerarAlertas({ ...ok, diasAtrasoSync: 8 })[0]).toMatchObject({ severidade: 'critico' });
  });

  it('tracking divergente, PDA vencida e projeção em risco', () => {
    const tipos = gerarAlertas({
      diasAtrasoSync: 0,
      statusTracking: 'divergente',
      pdasVencidas: 3,
      statusMeta: 'em_risco',
    }).map((a) => a.tipo);
    expect(tipos).toEqual(['tracking', 'pdas', 'meta']);
  });
});
