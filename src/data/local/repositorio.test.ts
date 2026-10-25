import { describe, expect, it } from 'vitest';
import {
  criarRepositoriosLocais,
  validarDadosMeta,
  validarLancamento,
  type ArmazenamentoLocal,
  type NovaMeta,
  type NovoLancamento,
} from './repositorio';
import { METAS_ADSTART_ARGENNTI_OUT26, sementeLancamentos, sementeMetas } from './seed';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';
import { simularMeta } from '@/domain/calculadora';

function memoria(): ArmazenamentoLocal {
  const mapa = new Map<string, string>();
  return {
    getItem: (chave) => mapa.get(chave) ?? null,
    setItem: (chave, valor) => {
      mapa.set(chave, valor);
    },
  };
}

const novaMeta = (sobrescrever: Partial<NovaMeta> = {}): NovaMeta => ({
  clientId: 'cliente-teste',
  ano: 2026,
  mes: 11,
  metaReceita: 500_000,
  premissas: { orcamento: 50_000, cps: 0.5, conversao: 0.01, ticket: 300 },
  pesos: { d1: 0.3, d2: 0.3, d3: 0.4 },
  autor: 'Analista teste',
  ...sobrescrever,
});

const novoLancamento = (sobrescrever: Partial<NovoLancamento> = {}): NovoLancamento => ({
  clientId: 'cliente-teste',
  periodoInicio: '2026-11-01',
  periodoFim: '2026-11-10',
  pedidosAprovados: 100,
  receitaAprovada: 30_000,
  fonte: 'adstart',
  lancadoPor: 'Analista teste',
  ...sobrescrever,
});

describe('sementes de exemplo', () => {
  it('todas as metas de exemplo são válidas', () => {
    for (const meta of sementeMetas()) {
      expect(validarDadosMeta(meta)).toEqual([]);
    }
  });

  it('o piloto Argennti tem a meta oficial do Adstart de out/2026', () => {
    const meta = sementeMetas().find((m) => m.clientId === CLIENTE_ARGENNTI_ID);
    expect(meta).toMatchObject({
      ano: 2026,
      mes: 10,
      metaReceita: 2_414_530.16,
      premissas: { orcamento: 577_000, cps: 0.94, conversao: 0.0151, ticket: 260.5 },
      pesos: { d1: 0.33, d2: 0.34, d3: 0.33 },
      updatedBy: 'Adstart — tela Metas, out/26',
      motivoAlteracao: null,
    });
  });

  it('a calculadora reproduz sessões, pedidos, receita e ROAS do Adstart (arredondamento)', () => {
    const meta = sementeMetas().find((m) => m.clientId === CLIENTE_ARGENNTI_ID)!;
    const s = simularMeta(meta.premissas);
    // 577.000 ÷ 0,94 = 613.829,79 (Adstart 613.830)
    expect(s.sessoes).toBeCloseTo(613_829.787234, 5);
    expect(Math.round(s.sessoes)).toBe(METAS_ADSTART_ARGENNTI_OUT26.sessoes);
    // × 1,51% = 9.268,83 (Adstart 9.269)
    expect(s.pedidos).toBeCloseTo(9_268.829787, 5);
    expect(Math.round(s.pedidos)).toBe(METAS_ADSTART_ARGENNTI_OUT26.pedidos);
    // × 260,50 = 2.414.530,1596 (meta fixa 2.414.530,16: diferença < 1 centavo)
    expect(s.receita).toBeCloseTo(2_414_530.16, 2);
    // ROAS 2.414.530 ÷ 577.000 = 4,1846 (Adstart 4,18)
    expect(s.roas).toBeCloseTo(METAS_ADSTART_ARGENNTI_OUT26.roas, 2);
  });

  it('o seed tem só a Argennti como cliente real (A e B são exemplos)', () => {
    expect(sementeMetas().map((m) => m.clientId)).toEqual([CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID]);
  });

  it('lançamentos de exemplo são válidos', () => {
    for (const { id, createdAt, ...novo } of sementeLancamentos()) {
      expect(validarLancamento(novo), id).toEqual([]);
      expect(createdAt).toBeTruthy();
    }
  });
});

describe('metas: fixas depois de definidas', () => {
  it('cria e lista a meta', async () => {
    const repo = criarRepositoriosLocais(memoria(), () => '2026-10-25T00:00:00Z');
    const criada = await repo.metas.criar(novaMeta());
    expect(criada.motivoAlteracao).toBeNull();
    expect(criada.updatedBy).toBe('Analista teste');
    const lista = await repo.metas.listar();
    expect(lista.some((m) => m.clientId === 'cliente-teste' && m.mes === 11)).toBe(true);
  });

  it('não cria duas metas para o mesmo cliente e mês', async () => {
    const repo = criarRepositoriosLocais(memoria());
    await repo.metas.criar(novaMeta());
    await expect(repo.metas.criar(novaMeta())).rejects.toThrow('Já existe meta');
  });

  it('alteração sem motivo é recusada', async () => {
    const repo = criarRepositoriosLocais(memoria());
    await repo.metas.criar(novaMeta());
    await expect(
      repo.metas.alterar({ ...novaMeta(), metaReceita: 600_000, motivo: '' }),
    ).rejects.toThrow('Informe o motivo');
  });

  it('alteração com motivo curto demais é recusada', async () => {
    const repo = criarRepositoriosLocais(memoria());
    await repo.metas.criar(novaMeta());
    await expect(
      repo.metas.alterar({ ...novaMeta(), metaReceita: 600_000, motivo: 'ajuste' }),
    ).rejects.toThrow('mínimo 10 caracteres');
  });

  it('alteração com motivo grava motivo, autor e data', async () => {
    const repo = criarRepositoriosLocais(memoria(), () => '2026-11-03T12:00:00Z');
    await repo.metas.criar(novaMeta());
    const alterada = await repo.metas.alterar({
      ...novaMeta(),
      metaReceita: 600_000,
      motivo: 'Verba aprovada pelo cliente em reunião',
      autor: 'Gestora teste',
    });
    expect(alterada.metaReceita).toBe(600_000);
    expect(alterada.motivoAlteracao).toBe('Verba aprovada pelo cliente em reunião');
    expect(alterada.updatedBy).toBe('Gestora teste');
    expect(alterada.updatedAt).toBe('2026-11-03T12:00:00Z');
  });

  it('alterar meta inexistente é recusado', async () => {
    const repo = criarRepositoriosLocais(memoria());
    await expect(
      repo.metas.alterar({ ...novaMeta(), motivo: 'Motivo válido aqui', clientId: 'outro' }),
    ).rejects.toThrow('Meta não definida');
  });
});

describe('lançamentos de receita (append-only)', () => {
  it('cria com id e data, e aparece na listagem', async () => {
    const repo = criarRepositoriosLocais(memoria(), () => '2026-11-11T08:00:00Z', () => 'id-1');
    const criado = await repo.lancamentos.criar(novoLancamento());
    expect(criado).toMatchObject({ id: 'id-1', createdAt: '2026-11-11T08:00:00Z' });
    const lista = await repo.lancamentos.listar();
    expect(lista.map((l) => l.id)).toContain('id-1');
  });

  it('dados persistem entre instâncias do mesmo armazenamento', async () => {
    const armazenamento = memoria();
    await criarRepositoriosLocais(armazenamento, undefined, () => 'persistido').lancamentos.criar(novoLancamento());
    const lista = await criarRepositoriosLocais(armazenamento).lancamentos.listar();
    expect(lista.some((l) => l.id === 'persistido')).toBe(true);
  });

  it('recusa período invertido, receita negativa e fonte desconhecida', () => {
    expect(validarLancamento(novoLancamento({ periodoInicio: '2026-11-10', periodoFim: '2026-11-01' }))).not.toEqual([]);
    expect(validarLancamento(novoLancamento({ receitaAprovada: -1 }))).not.toEqual([]);
    expect(validarLancamento(novoLancamento({ fonte: 'shopify' as never }))).not.toEqual([]);
  });

  it('pedidos precisam ser inteiros', () => {
    expect(validarLancamento(novoLancamento({ pedidosAprovados: 10.5 }))).not.toEqual([]);
  });
});
