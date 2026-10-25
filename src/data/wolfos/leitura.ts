import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * LEITURA do WOLFOS. Regra inviolável: os bancos wolfos-ads e wolfos-dev são SOMENTE LEITURA.
 *
 * Esta camada só faz select. Não existe insert, update, upsert, delete nem rpc,
 * e leitura.test.ts garante isso. Não adicione método de escrita nem exponha o cliente.
 */

export type OperadorFiltro = 'eq' | 'neq' | 'gte' | 'lte' | 'lt' | 'in';

export interface Filtro {
  coluna: string;
  op: OperadorFiltro;
  valor: string | number | boolean | Array<string | number>;
}

export interface OpcoesLeitura {
  colunas: string;
  filtros?: Filtro[];
  /**
   * Coluna de ordenação. Obrigatória: a paginação por intervalo depende de ordem.
   * Pendência para F1: usar chave única quando a tabela tiver uma.
   */
  ordenarPor: string;
}

/** Único contrato de leitura exposto ao restante do app. */
export interface LeituraWolfos {
  selecionarTodos<T>(tabela: string, opcoes: OpcoesLeitura): Promise<T[]>;
}

const TAMANHO_PAGINA = 1000;

// Tipagem genérica do PostgREST: a consulta é montada em etapas.
type Consulta = any;

function aplicarFiltro(consulta: Consulta, filtro: Filtro): Consulta {
  switch (filtro.op) {
    case 'eq':
      return consulta.eq(filtro.coluna, filtro.valor);
    case 'neq':
      return consulta.neq(filtro.coluna, filtro.valor);
    case 'gte':
      return consulta.gte(filtro.coluna, filtro.valor);
    case 'lte':
      return consulta.lte(filtro.coluna, filtro.valor);
    case 'lt':
      return consulta.lt(filtro.coluna, filtro.valor);
    case 'in':
      return consulta.in(filtro.coluna, filtro.valor);
  }
}

/**
 * Envolve o cliente Supabase e devolve só o contrato de leitura.
 * O cliente recebido não é guardado nem devolvido.
 */
export function criarLeituraSomenteSelect(cliente: SupabaseClient): LeituraWolfos {
  return {
    async selecionarTodos<T>(tabela: string, opcoes: OpcoesLeitura): Promise<T[]> {
      const linhas: T[] = [];
      for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
        let consulta: Consulta = cliente.from(tabela).select(opcoes.colunas);
        for (const filtro of opcoes.filtros ?? []) {
          consulta = aplicarFiltro(consulta, filtro);
        }
        consulta = consulta
          .order(opcoes.ordenarPor, { ascending: true })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);

        const { data, error } = await consulta;
        if (error) {
          throw new Error(`Leitura de ${tabela} falhou: ${error.message}`);
        }
        const pagina = (data ?? []) as T[];
        linhas.push(...pagina);
        if (pagina.length < TAMANHO_PAGINA) return linhas;
      }
    },
  };
}
