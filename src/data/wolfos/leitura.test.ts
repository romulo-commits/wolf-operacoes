import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarLeituraSomenteSelect } from './leitura';

/**
 * REGRA INVIOLÁVEL: os bancos wolfos-ads e wolfos-dev são somente leitura.
 * Estes testes falham se a camada wolfos ganhar qualquer escrita ou chamada de rpc.
 */
const ESCRITAS_PROIBIDAS = ['insert', 'update', 'upsert', 'delete', 'rpc'] as const;

type Resposta = { data: unknown[] | null; error: { message: string } | null };

function criarClienteFalso(respostas: Resposta[]) {
  const chamadas: string[] = [];
  const intervalos: Array<[number, number]> = [];
  let proxima = 0;

  const construirConsulta = (): any => {
    const consulta: any = {};
    for (const metodo of ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'in', 'order']) {
      consulta[metodo] = () => {
        chamadas.push(metodo);
        return consulta;
      };
    }
    consulta.range = (de: number, ate: number) => {
      chamadas.push('range');
      intervalos.push([de, ate]);
      return consulta;
    };
    // Torna a consulta "awaitable", como o PostgREST.
    consulta.then = (resolver: (valor: Resposta) => unknown, rejeitar?: (erro: unknown) => unknown) =>
      Promise.resolve(respostas[proxima++]).then(resolver, rejeitar);
    return consulta;
  };

  const cliente = {
    from: (tabela: string) => {
      chamadas.push(`from:${tabela}`);
      return construirConsulta();
    },
  };

  return { cliente: cliente as unknown as SupabaseClient, chamadas, intervalos };
}

describe('LeituraWolfos: somente select (execução)', () => {
  it('expõe só selecionarTodos, sem escrita nem cliente', () => {
    const { cliente } = criarClienteFalso([]);
    const leitura = criarLeituraSomenteSelect(cliente);
    expect(Object.keys(leitura)).toEqual(['selecionarTodos']);
  });

  it('nunca chama insert, update, upsert, delete nem rpc', async () => {
    const { cliente, chamadas } = criarClienteFalso([{ data: [{ id: 1 }], error: null }]);
    const leitura = criarLeituraSomenteSelect(cliente);
    await leitura.selecionarTodos('clients', {
      colunas: 'id',
      filtros: [{ coluna: 'status', op: 'eq', valor: 'active' }],
      ordenarPor: 'id',
    });
    for (const proibido of ESCRITAS_PROIBIDAS) {
      expect(chamadas).not.toContain(proibido);
    }
    expect(chamadas).toEqual(['from:clients', 'select', 'eq', 'order', 'range']);
  });

  it('pagina por intervalo até a última página incompleta', async () => {
    const primeira = Array.from({ length: 1000 }, (_, i) => ({ i }));
    const segunda = [{ i: 1000 }, { i: 1001 }, { i: 1002 }];
    const { cliente, intervalos } = criarClienteFalso([
      { data: primeira, error: null },
      { data: segunda, error: null },
    ]);
    const linhas = await criarLeituraSomenteSelect(cliente).selecionarTodos<{ i: number }>('pdas', {
      colunas: 'i',
      ordenarPor: 'i',
    });
    expect(linhas).toHaveLength(1003);
    expect(intervalos).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('erro do banco vira exceção com a tabela citada', async () => {
    const { cliente } = criarClienteFalso([{ data: null, error: { message: 'permission denied' } }]);
    await expect(
      criarLeituraSomenteSelect(cliente).selecionarTodos('v_sync_saude', { colunas: '*', ordenarPor: 'client_id' }),
    ).rejects.toThrow('Leitura de v_sync_saude falhou: permission denied');
  });
});

/** Fontes da camada wolfos (sem os próprios testes), lidas como texto. */
const fontes = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('camada wolfos: nenhuma escrita no código-fonte (estático)', () => {
  it('encontra os arquivos da camada (evita passar em branco)', () => {
    const arquivos = Object.keys(fontes).filter((caminho) => !caminho.endsWith('.test.ts'));
    expect(arquivos.length).toBeGreaterThanOrEqual(4);
  });

  it.each(Object.entries(fontes).filter(([caminho]) => !caminho.endsWith('.test.ts')))(
    '%s não contém escrita nem rpc',
    (_caminho, codigo) => {
      for (const metodo of ESCRITAS_PROIBIDAS) {
        expect(codigo).not.toMatch(new RegExp(`\\.${metodo}\\s*\\(`));
      }
    },
  );
});
