import { describe, expect, it } from 'vitest';
import { consolidarSync, type SyncPlataforma } from './carteira';
import { lerConfigWolfos } from './conexao';
import { dadosExemplo } from './exemplo';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';

const plataforma = (clientId: string, diasAtraso: number | null, erro: string | null = null): SyncPlataforma => ({
  clientId,
  platform: 'x',
  diasAtraso,
  erro,
  ultimaDataComDado: null,
});

describe('consolidarSync', () => {
  it('usa o maior atraso entre plataformas', () => {
    const [sync] = consolidarSync([plataforma('a', 0), plataforma('a', 5), plataforma('a', 2)]);
    expect(sync.diasAtraso).toBe(5);
  });

  it('sem nenhum atraso conhecido = sem dado', () => {
    const [sync] = consolidarSync([plataforma('a', null)]);
    expect(sync.diasAtraso).toBeNull();
  });

  it('guarda o primeiro erro encontrado', () => {
    const [sync] = consolidarSync([plataforma('a', 1, 'primeiro'), plataforma('a', 2, 'segundo')]);
    expect(sync.erro).toBe('primeiro');
  });
});

describe('lerConfigWolfos', () => {
  it('sem as quatro variáveis, não há configuração (modo exemplo)', () => {
    expect(lerConfigWolfos({ VITE_WOLFOS_ADS_URL: 'https://x' })).toBeNull();
    expect(lerConfigWolfos({})).toBeNull();
  });

  it('com as quatro variáveis, devolve a configuração', () => {
    const config = lerConfigWolfos({
      VITE_WOLFOS_ADS_URL: 'https://ads',
      VITE_WOLFOS_ADS_KEY: 'k1',
      VITE_WOLFOS_DEV_URL: 'https://dev',
      VITE_WOLFOS_DEV_KEY: 'k2',
    });
    expect(config).toEqual({ adsUrl: 'https://ads', adsKey: 'k1', devUrl: 'https://dev', devKey: 'k2' });
  });
});

describe('dadosExemplo', () => {
  const dados = dadosExemplo(2026, 10);

  it('é marcado como exemplo', () => {
    expect(dados.fonte).toBe('exemplo');
  });

  it('o piloto Argennti usa o client_id do core', () => {
    expect(dados.clientes.map((c) => c.id)).toContain(CLIENTE_ARGENNTI_ID);
    expect(CLIENTE_ARGENNTI_ID).toBe('d1f68699-a607-4fbd-b7d5-e34a8cfa0200');
  });

  it('inclui um cliente com token expirado para mostrar o alerta de sync', () => {
    const sync = consolidarSync(dados.syncPlataformas).find((s) => s.clientId === CLIENTE_EXEMPLO_B_ID);
    expect(sync?.erro).toContain('Token expirado');
    expect(sync?.diasAtraso).toBe(9);
  });
});
