import { gerarAlertas, type Alerta } from './alertas';
import { diasFechados, diasNoMes } from './calendario';
import { indiceTracking, statusTracking, type StatusTracking } from './tracking';
import { resumirMes, type ResumoMes } from './resumo';
import type { LancamentoReceita, MetaMes } from './tipos';

/** Formas normalizadas dos dados lidos do WOLFOS (ver src/data/wolfos). */
export interface ClienteCarteira {
  id: string;
  nome: string;
}

export interface SyncCarteira {
  clientId: string;
  diasAtraso: number | null;
  erro: string | null;
}

export interface PdaCarteira {
  clientId: string;
  /** AAAA-MM-DD ou null. */
  dueDate: string | null;
}

export interface ReceitaGa4Dia {
  clientId: string;
  /** AAAA-MM-DD */
  date: string;
  receita: number;
}

export interface EntradaCarteira {
  ano: number;
  mes: number;
  hoje: Date;
  clientes: ClienteCarteira[];
  metas: MetaMes[];
  lancamentos: LancamentoReceita[];
  sync: SyncCarteira[];
  pdas: PdaCarteira[];
  receitaGa4: ReceitaGa4Dia[];
}

export interface LinhaCarteira {
  clientId: string;
  nome: string;
  resumo: ResumoMes;
  receitaGa4: number | null;
  indiceTracking: number | null;
  statusTracking: StatusTracking;
  syncDiasAtraso: number | null;
  syncErro: string | null;
  pdasPendentes: number;
  pdasVencidas: number;
  alertas: Alerta[];
}

const pad2 = (valor: number) => String(valor).padStart(2, '0');

/** Prefixo AAAA-MM para filtrar datas ISO. */
export function prefixoMes(ano: number, mes: number): string {
  return `${ano}-${pad2(mes)}`;
}

/** Data de hoje em AAAA-MM-DD, no fuso local. */
export function dataIso(data: Date): string {
  return `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`;
}

/**
 * Uma linha por cliente com meta, realizado, projeção, grade, tracking, sync, PDAs e alertas.
 * Função pura: recebe tudo pronto e não lê nada.
 */
export function montarLinhasCarteira(entrada: EntradaCarteira): LinhaCarteira[] {
  const { ano, mes, hoje } = entrada;
  const periodoAtual = prefixoMes(ano, mes);
  const periodoAnterior = prefixoMes(ano - 1, mes);
  const diasFechadosMes = diasFechados(ano, mes, hoje);
  const diasDoMes = diasNoMes(ano, mes);
  const hojeIso = dataIso(hoje);

  return entrada.clientes.map((cliente) => {
    const meta = entrada.metas.find((m) => m.clientId === cliente.id && m.ano === ano && m.mes === mes) ?? null;

    const realizado = somar(
      entrada.lancamentos.filter((l) => l.clientId === cliente.id && l.periodoInicio.startsWith(periodoAtual)),
      (l) => l.receitaAprovada,
    );
    const receitaAnoAnterior = somarOuNulo(
      entrada.lancamentos.filter((l) => l.clientId === cliente.id && l.periodoInicio.startsWith(periodoAnterior)),
      (l) => l.receitaAprovada,
    );

    const resumo = resumirMes({
      meta,
      realizado,
      diasFechados: diasFechadosMes,
      diasNoMes: diasDoMes,
      receitaAnoAnterior,
    });

    const receitaGa4 = somarOuNulo(
      entrada.receitaGa4.filter((r) => r.clientId === cliente.id && r.date.startsWith(periodoAtual)),
      (r) => r.receita,
    );
    const indice = indiceTracking(receitaGa4, realizado);
    const tracking = statusTracking(indice);

    const sync = entrada.sync.find((s) => s.clientId === cliente.id) ?? null;
    const pdasCliente = entrada.pdas.filter((p) => p.clientId === cliente.id);
    const pdasVencidas = pdasCliente.filter((p) => p.dueDate !== null && p.dueDate < hojeIso).length;

    const alertas = gerarAlertas({
      diasAtrasoSync: sync ? sync.diasAtraso : null,
      statusTracking: tracking,
      pdasVencidas,
      statusMeta: resumo.status,
    });

    return {
      clientId: cliente.id,
      nome: cliente.nome,
      resumo,
      receitaGa4,
      indiceTracking: indice,
      statusTracking: tracking,
      syncDiasAtraso: sync ? sync.diasAtraso : null,
      syncErro: sync ? sync.erro : null,
      pdasPendentes: pdasCliente.length,
      pdasVencidas,
      alertas,
    };
  });
}

function somar<T>(itens: T[], valor: (item: T) => number): number {
  return itens.reduce((total, item) => total + valor(item), 0);
}

/** Soma, ou null quando não há nenhuma linha (diferente de zero lançado). */
function somarOuNulo<T>(itens: T[], valor: (item: T) => number): number | null {
  return itens.length === 0 ? null : somar(itens, valor);
}
