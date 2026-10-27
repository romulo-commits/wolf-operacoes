import { describe, expect, it } from 'vitest';
import { consolidarSync, lerDoWolfos, lerInvestimento, type SyncPlataforma } from './carteira';
import type { LeituraWolfos, OpcoesLeitura } from './leitura';
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

describe('dadosExemplo · ano anterior', () => {
  const dados = dadosExemplo(2026, 10);

  it('traz GA4 diário do mesmo mês do ano anterior para os pesos históricos', () => {
    const argennti = dados.ga4AnoAnterior.filter((r) => r.clientId === CLIENTE_ARGENNTI_ID);
    expect(argennti).toHaveLength(31);
    expect(argennti.every((r) => r.date.startsWith('2025-10-'))).toBe(true);
    expect(argennti.every((r) => r.sessoes !== undefined && r.pedidos !== undefined)).toBe(true);
  });

  it('traz investimento do ano anterior só da Argennti (Exemplo A mostra o fallback de investimento)', () => {
    const clientes = new Set(dados.investimentoAnoAnterior.map((r) => r.clientId));
    expect([...clientes]).toEqual([CLIENTE_ARGENNTI_ID]);
    const mes = dados.investimento.filter((r) => r.clientId === CLIENTE_ARGENNTI_ID);
    expect(mes).toHaveLength(48); // 24 dias × Meta e Google
    expect(new Set(mes.map((r) => r.fonte))).toEqual(new Set(['meta', 'google']));
  });

  it('o Exemplo B fica sem histórico para mostrar o fallback', () => {
    expect(dados.ga4AnoAnterior.some((r) => r.clientId === CLIENTE_EXEMPLO_B_ID)).toBe(false);
  });
});

describe('lerDoWolfos · leituras de mídia e GA4 (somente select, leitor falso)', () => {
  const chamadas: Array<{ banco: string; tabela: string; opcoes: OpcoesLeitura }> = [];
  const respostas: Record<string, unknown[]> = {
    'v_analytics_diario:2026-10-01': [
      { client_id: 'c1', date: '2026-10-01', revenue: '100', sessions: '50', transactions: '2' },
      { client_id: 'c1', date: '2026-10-02', revenue: 10, sessions: null, transactions: null },
    ],
    'v_metrics_daily:2025-10-01': [
      { client_id: 'c1', date: '2025-10-03', platform: 'meta', spend: '12.5' },
      { client_id: 'c1', date: '2025-10-03', platform: 'google', spend: 7 },
    ],
  };
  const leitor = (banco: string): LeituraWolfos => ({
    async selecionarTodos<T>(tabela: string, opcoes: OpcoesLeitura): Promise<T[]> {
      chamadas.push({ banco, tabela, opcoes });
      const inicio = opcoes.filtros?.find((f) => f.coluna === 'date' && f.op === 'gte')?.valor;
      return (respostas[`${tabela}:${String(inicio)}`] ?? []) as T[];
    },
  });

  it('lê sessões e transações do GA4 e o spend de Meta + Google do mês e do ano anterior', async () => {
    const dados = await lerDoWolfos({ ads: leitor('ads'), dev: leitor('dev') }, 2026, 10, new Date(2026, 9, 25));
    const ga4 = chamadas.filter((c) => c.tabela === 'v_analytics_diario');
    expect(ga4.map((c) => c.opcoes.colunas)).toEqual([
      'client_id,date,revenue,sessions,transactions',
      'client_id,date,revenue,sessions,transactions',
    ]);
    const midia = chamadas.filter((c) => c.tabela === 'v_metrics_daily');
    expect(midia).toHaveLength(2);
    expect(midia.every((c) => c.banco === 'ads' && c.opcoes.colunas === 'client_id,date,platform,spend')).toBe(true);
    expect(midia[0].opcoes.filtros).toContainEqual({ coluna: 'platform', op: 'in', valor: ['meta', 'google'] });
    expect(midia.map((c) => c.opcoes.filtros?.filter((f) => f.coluna === 'date').map((f) => f.valor))).toEqual([
      ['2026-10-01', '2026-10-25'],
      ['2025-10-01', '2025-10-31'],
    ]);

    expect(dados.receitaGa4[0]).toEqual({ clientId: 'c1', date: '2026-10-01', receita: 100, sessoes: 50, pedidos: 2 });
    expect(dados.receitaGa4[1].sessoes).toBeUndefined(); // nulo = sem dado
    expect(dados.investimentoAnoAnterior).toEqual([
      { clientId: 'c1', date: '2025-10-03', fonte: 'meta', valor: 12.5 },
      { clientId: 'c1', date: '2025-10-03', fonte: 'google', valor: 7 },
    ]);
    expect(dados.investimento).toEqual([]);
  });
});

describe('lerInvestimento · fontes configuráveis', () => {
  it('filtra e rotula pelas fontes passadas (ex.: TikTok acrescentado na config)', async () => {
    const chamadas: OpcoesLeitura[] = [];
    const ads: LeituraWolfos = {
      async selecionarTodos<T>(_tabela: string, opcoes: OpcoesLeitura): Promise<T[]> {
        chamadas.push(opcoes);
        return [
          { client_id: 'c1', date: '2026-10-01', platform: 'tiktok', spend: '30' },
          { client_id: 'c1', date: '2026-10-01', platform: 'pinterest', spend: '99' }, // fora da lista
        ] as T[];
      },
    };
    const linhas = await lerInvestimento({ ads, dev: ads }, '2026-10-01', '2026-10-24', [
      { id: 'tiktok', rotulo: 'TikTok Ads', origem: 'v_metrics_daily', platform: 'tiktok' },
    ]);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].filtros?.[0]).toEqual({ coluna: 'platform', op: 'in', valor: ['tiktok'] });
    expect(linhas).toEqual([{ clientId: 'c1', date: '2026-10-01', fonte: 'tiktok', valor: 30 }]);
  });
});
