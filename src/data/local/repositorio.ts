import { simularMeta } from '@/domain/calculadora';
import { validarPesos } from '@/domain/projecao';
import type { FonteLancamento, LancamentoReceita, MetaMes, PesosDecendio, Premissas } from '@/domain/tipos';
import { criarCiclo, type RepositorioCiclo } from './ciclo';
import { sementeLancamentos, sementeMetas } from './seed';

/**
 * Repositório LOCAL de metas e lançamentos (sem banco próprio ainda).
 * A interface é a mesma que o Supabase terá depois: trocar a implementação não muda as telas.
 */

export const MOTIVO_MINIMO_CARACTERES = 10;
export const CHAVE_METAS = 'wolf-operacoes:metas:v1';
export const CHAVE_LANCAMENTOS = 'wolf-operacoes:lancamentos:v1';

export interface DadosMeta {
  clientId: string;
  ano: number;
  mes: number;
  metaReceita: number;
  premissas: Premissas;
  pesos: PesosDecendio;
}

export interface NovaMeta extends DadosMeta {
  autor: string;
}

export interface AlteracaoMeta extends DadosMeta {
  /** Obrigatório: a meta é fixa depois de definida. */
  motivo: string;
  autor: string;
}

export type NovoLancamento = Omit<LancamentoReceita, 'id' | 'createdAt'>;

export interface RepositorioMetas {
  listar(): Promise<MetaMes[]>;
  /** Cria a meta do mês. Falha se já existir: depois de definida, ela só muda via alterar. */
  criar(nova: NovaMeta): Promise<MetaMes>;
  /** Edição manual explícita, com motivo. */
  alterar(alteracao: AlteracaoMeta): Promise<MetaMes>;
}

export interface RepositorioLancamentos {
  listar(): Promise<LancamentoReceita[]>;
  /** Lançamentos são append-only: não há editar nem excluir nesta versão. */
  criar(novo: NovoLancamento): Promise<LancamentoReceita>;
}

export interface Repositorios extends RepositorioCiclo {
  metas: RepositorioMetas;
  lancamentos: RepositorioLancamentos;
}

/** Subconjunto de localStorage usado pelo repositório (facilita testes). */
export interface ArmazenamentoLocal {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const FONTES: FonteLancamento[] = ['adstart', 'plataforma'];

/** Erros de validação da meta (lista vazia = válida). */
export function validarDadosMeta(dados: DadosMeta): string[] {
  const erros: string[] = [];
  if (!Number.isInteger(dados.ano) || dados.ano < 2000) erros.push('Ano inválido.');
  if (!Number.isInteger(dados.mes) || dados.mes < 1 || dados.mes > 12) erros.push('Mês deve ser de 1 a 12.');
  if (!(dados.metaReceita > 0) || !Number.isFinite(dados.metaReceita)) erros.push('A meta de receita precisa ser maior que zero.');
  try {
    validarPesos(dados.pesos);
  } catch (erro) {
    erros.push(erro instanceof Error ? erro.message : 'Pesos inválidos.');
  }
  try {
    simularMeta(dados.premissas);
  } catch (erro) {
    erros.push(erro instanceof Error ? erro.message : 'Premissas inválidas.');
  }
  return erros;
}

/** Erros do lançamento de receita (lista vazia = válido). */
export function validarLancamento(novo: NovoLancamento): string[] {
  const erros: string[] = [];
  if (!novo.clientId) erros.push('Escolha o cliente.');
  if (!DATA_ISO.test(novo.periodoInicio) || !DATA_ISO.test(novo.periodoFim)) {
    erros.push('Informe as datas do período.');
  } else if (novo.periodoFim < novo.periodoInicio) {
    erros.push('O fim do período não pode ser antes do início.');
  }
  if (!Number.isInteger(novo.pedidosAprovados) || novo.pedidosAprovados < 0) {
    erros.push('Pedidos aprovados precisa ser um número inteiro, zero ou mais.');
  }
  if (!Number.isFinite(novo.receitaAprovada) || novo.receitaAprovada < 0) {
    erros.push('Receita aprovada precisa ser zero ou mais.');
  }
  if (!FONTES.includes(novo.fonte)) erros.push('Fonte inválida.');
  if (!novo.lancadoPor.trim()) erros.push('Informe quem está lançando.');
  return erros;
}

function lerLista<T>(armazenamento: ArmazenamentoLocal, chave: string, semente: () => T[]): T[] {
  const bruto = armazenamento.getItem(chave);
  if (bruto !== null) return JSON.parse(bruto) as T[];
  const inicial = semente();
  armazenamento.setItem(chave, JSON.stringify(inicial));
  return inicial;
}

function mesmoPeriodo(meta: MetaMes, dados: DadosMeta): boolean {
  return meta.clientId === dados.clientId && meta.ano === dados.ano && meta.mes === dados.mes;
}

function gerarId(): string {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** localStorage do navegador; em ambiente sem ele, memória (testes). */
export function armazenamentoPadrao(): ArmazenamentoLocal {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  const memoria = new Map<string, string>();
  return {
    getItem: (chave) => memoria.get(chave) ?? null,
    setItem: (chave, valor) => {
      memoria.set(chave, valor);
    },
  };
}

export function criarRepositoriosLocais(
  armazenamento: ArmazenamentoLocal = armazenamentoPadrao(),
  agora: () => string = () => new Date().toISOString(),
  novoId: () => string = gerarId,
): Repositorios {
  const lerMetas = () => lerLista(armazenamento, CHAVE_METAS, sementeMetas);
  const lerLancamentos = () => lerLista(armazenamento, CHAVE_LANCAMENTOS, sementeLancamentos);
  const gravar = (chave: string, lista: unknown[]) => armazenamento.setItem(chave, JSON.stringify(lista));
  const ciclo = criarCiclo(armazenamento, agora);

  return {
    ...ciclo,
    metas: {
      async listar() {
        return lerMetas();
      },

      async criar(nova) {
        const erros = validarDadosMeta(nova);
        if (erros.length > 0) throw new Error(erros.join(' '));

        const lista = lerMetas();
        if (lista.some((m) => mesmoPeriodo(m, nova))) {
          throw new Error('Já existe meta para este cliente neste mês. Para mudar, use a alteração com motivo.');
        }

        const meta: MetaMes = {
          clientId: nova.clientId,
          ano: nova.ano,
          mes: nova.mes,
          metaReceita: nova.metaReceita,
          premissas: { ...nova.premissas },
          pesos: { ...nova.pesos },
          motivoAlteracao: null,
          updatedBy: nova.autor,
          updatedAt: agora(),
        };
        gravar(CHAVE_METAS, [...lista, meta]);
        return meta;
      },

      async alterar(alteracao) {
        const erros = validarDadosMeta(alteracao);
        if (alteracao.motivo.trim().length < MOTIVO_MINIMO_CARACTERES) {
          erros.push(`Informe o motivo da alteração (mínimo ${MOTIVO_MINIMO_CARACTERES} caracteres).`);
        }
        if (erros.length > 0) throw new Error(erros.join(' '));

        const lista = lerMetas();
        const indice = lista.findIndex((m) => mesmoPeriodo(m, alteracao));
        if (indice < 0) throw new Error('Meta não definida para este mês. Crie a meta antes de alterar.');

        const atualizada: MetaMes = {
          ...lista[indice],
          metaReceita: alteracao.metaReceita,
          premissas: { ...alteracao.premissas },
          pesos: { ...alteracao.pesos },
          motivoAlteracao: alteracao.motivo.trim(),
          updatedBy: alteracao.autor,
          updatedAt: agora(),
        };
        const proxima = [...lista];
        proxima[indice] = atualizada;
        gravar(CHAVE_METAS, proxima);
        return atualizada;
      },
    },

    lancamentos: {
      async listar() {
        return lerLancamentos();
      },

      async criar(novo) {
        const erros = validarLancamento(novo);
        if (erros.length > 0) throw new Error(erros.join(' '));

        const lancamento: LancamentoReceita = { ...novo, id: novoId(), createdAt: agora() };
        gravar(CHAVE_LANCAMENTOS, [...lerLancamentos(), lancamento]);
        return lancamento;
      },
    },
  };
}
