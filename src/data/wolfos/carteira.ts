import type { ClienteCarteira, PdaCarteira, ReceitaGa4Dia, SyncCarteira } from '@/domain/carteira';
import { dataIso, prefixoMes } from '@/domain/carteira';
import { obterLeiturasWolfos, type LeiturasWolfos } from './conexao';
import { dadosExemplo } from './exemplo';

export type FonteDados = 'wolfos' | 'exemplo';

/** Uma linha por cliente × plataforma, como v_sync_saude. */
export interface SyncPlataforma {
  clientId: string;
  platform: string;
  diasAtraso: number | null;
  erro: string | null;
  ultimaDataComDado: string | null;
}

export interface DadosWolfos {
  fonte: FonteDados;
  clientes: ClienteCarteira[];
  syncPlataformas: SyncPlataforma[];
  pdas: PdaCarteira[];
  receitaGa4: ReceitaGa4Dia[];
}

interface LinhaCliente {
  id: string;
  name: string;
}

interface LinhaSync {
  client_id: string;
  platform: string;
  dias_atrasado: number | null;
  last_sync_error: string | null;
  ultima_data_com_dado: string | null;
}

interface LinhaPda {
  client_id: string;
  due_date: string | null;
}

interface LinhaGa4 {
  client_id: string;
  date: string;
  revenue: number | string | null;
}

/**
 * Dados da carteira para o mês. Com credenciais, lê o WOLFOS; sem, devolve o exemplo.
 * Só leituras (select). Nada é gravado.
 */
export async function carregarDadosWolfos(ano: number, mes: number, hoje: Date): Promise<DadosWolfos> {
  const leituras = obterLeiturasWolfos();
  if (!leituras) return dadosExemplo(ano, mes);
  return lerDoWolfos(leituras, ano, mes, hoje);
}

async function lerDoWolfos(
  leituras: LeiturasWolfos,
  ano: number,
  mes: number,
  hoje: Date,
): Promise<DadosWolfos> {
  const prefixo = prefixoMes(ano, mes);

  const [clientes, sync, pdas, ga4] = await Promise.all([
    leituras.dev.selecionarTodos<LinhaCliente>('clients', {
      colunas: 'id,name',
      filtros: [{ coluna: 'status', op: 'eq', valor: 'active' }],
      ordenarPor: 'name',
    }),
    leituras.ads.selecionarTodos<LinhaSync>('v_sync_saude', {
      colunas: 'client_id,platform,dias_atrasado,last_sync_error,ultima_data_com_dado',
      ordenarPor: 'client_id',
    }),
    leituras.dev.selecionarTodos<LinhaPda>('pdas', {
      colunas: 'client_id,due_date',
      filtros: [
        { coluna: 'status', op: 'eq', valor: 'pendente' },
        { coluna: 'trashed', op: 'eq', valor: false },
      ],
      ordenarPor: 'client_id',
    }),
    leituras.ads.selecionarTodos<LinhaGa4>('v_analytics_diario', {
      colunas: 'client_id,date,revenue',
      filtros: [
        { coluna: 'date', op: 'gte', valor: `${prefixo}-01` },
        { coluna: 'date', op: 'lte', valor: dataIso(hoje) },
      ],
      ordenarPor: 'date',
    }),
  ]);

  return {
    fonte: 'wolfos',
    clientes: clientes.map((c) => ({ id: c.id, nome: c.name })),
    syncPlataformas: sync.map((s) => ({
      clientId: s.client_id,
      platform: s.platform,
      diasAtraso: s.dias_atrasado,
      erro: s.last_sync_error,
      ultimaDataComDado: s.ultima_data_com_dado,
    })),
    pdas: pdas.map((p) => ({ clientId: p.client_id, dueDate: p.due_date })),
    receitaGa4: ga4.map((r) => ({ clientId: r.client_id, date: r.date, receita: Number(r.revenue ?? 0) })),
  };
}

/**
 * Uma linha por cliente a partir das plataformas: maior atraso entre elas
 * e primeiro erro encontrado. Sem nenhum dado de atraso = null (sem dado).
 */
export function consolidarSync(plataformas: SyncPlataforma[]): SyncCarteira[] {
  const porCliente = new Map<string, SyncCarteira>();
  for (const p of plataformas) {
    const atual = porCliente.get(p.clientId) ?? { clientId: p.clientId, diasAtraso: null, erro: null };
    if (p.diasAtraso !== null) {
      atual.diasAtraso = Math.max(atual.diasAtraso ?? 0, p.diasAtraso);
    }
    if (p.erro && !atual.erro) {
      atual.erro = p.erro;
    }
    porCliente.set(p.clientId, atual);
  }
  return [...porCliente.values()];
}
