/** Decêndio do mês: D1 = dias 1–10, D2 = 11–20, D3 = 21 até o fim. */
export type DecendioNumero = 1 | 2 | 3;

export interface PesosDecendio {
  d1: number;
  d2: number;
  d3: number;
}

export interface Premissas {
  orcamento: number;
  /** Custo por sessão (R$). Sessões = orçamento ÷ CPS. */
  cps: number;
  /** Fração: 0,0143 = 1,43%. */
  conversao: number;
  /** Ticket médio (R$). */
  ticket: number;
}

/**
 * Meta do mês. Depois de definida ela é FIXA: só muda por edição manual
 * explícita, com motivo (ver src/data/local/repositorio.ts).
 */
export interface MetaMes {
  clientId: string;
  ano: number;
  /** 1 a 12. */
  mes: number;
  metaReceita: number;
  premissas: Premissas;
  pesos: PesosDecendio;
  motivoAlteracao: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export type FonteLancamento = 'adstart' | 'plataforma';

/** Receita oficial aprovada, lançada pelo analista. */
export interface LancamentoReceita {
  id: string;
  clientId: string;
  /** AAAA-MM-DD */
  periodoInicio: string;
  /** AAAA-MM-DD */
  periodoFim: string;
  pedidosAprovados: number;
  receitaAprovada: number;
  fonte: FonteLancamento;
  lancadoPor: string;
  createdAt: string;
}
