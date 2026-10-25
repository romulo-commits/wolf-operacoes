import { gerarAlertas, type Alerta } from './alertas';
import { diasFechados, diasNoMes } from './calendario';
import { indiceTracking, statusTracking, type StatusTracking } from './tracking';
import { acompanharMetrica, metasDoFunil, METRICAS_FUNIL, type AcompanhamentoMetrica, type MetricaFunil } from './metricas';
import { pesosHistoricosDecendio, type SerieDiaria } from './pesos';
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

/** GA4 diário por cliente (canais já podem vir separados; o domínio soma). */
export interface ReceitaGa4Dia {
  clientId: string;
  /** AAAA-MM-DD */
  date: string;
  receita: number;
  /** Sessões do GA4. Ausente = sem dado. */
  sessoes?: number;
  /** Transações do GA4. Ausente = sem dado. */
  pedidos?: number;
}

/** Investimento diário em mídia por cliente (soma das plataformas). */
export interface InvestimentoDia {
  clientId: string;
  /** AAAA-MM-DD */
  date: string;
  valor: number;
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
  /**
   * GA4 diário do MESMO mês do ano anterior (v_analytics_diario): receita, sessões e pedidos.
   * Base dos pesos históricos de cada métrica. Ausente/vazio = pesos da meta (fallback).
   */
  ga4AnoAnterior?: ReceitaGa4Dia[];
  /** Investimento diário do mês (v_metrics_daily). Realizado de investimento. */
  investimento?: InvestimentoDia[];
  /** Investimento diário do mesmo mês do ano anterior. Base dos pesos de investimento. */
  investimentoAnoAnterior?: InvestimentoDia[];
}

export interface LinhaCarteira {
  clientId: string;
  nome: string;
  resumo: ResumoMes;
  /** Investimento, sessões e pedidos com os pesos históricos de cada um. Null sem meta. */
  funil: Record<MetricaFunil, AcompanhamentoMetrica> | null;
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

    const ga4AnoAnterior = (entrada.ga4AnoAnterior ?? []).filter((r) => r.clientId === cliente.id);
    const pesosHistoricos = pesosHistoricosDecendio(
      ga4AnoAnterior.map((r) => ({ date: r.date, valor: r.receita })),
      ano - 1,
      mes,
    );

    const resumo = resumirMes({
      meta,
      realizado,
      diasFechados: diasFechadosMes,
      diasNoMes: diasDoMes,
      receitaAnoAnterior,
      pesosHistoricos,
    });

    const funil = meta
      ? montarFunil({
          meta,
          ano,
          mes,
          diasFechados: diasFechadosMes,
          diasNoMes: diasDoMes,
          pedidosLancados: somar(
            entrada.lancamentos.filter((l) => l.clientId === cliente.id && l.periodoInicio.startsWith(periodoAtual)),
            (l) => l.pedidosAprovados,
          ),
          ga4Mes: entrada.receitaGa4.filter((r) => r.clientId === cliente.id),
          ga4AnoAnterior,
          investimentoMes: (entrada.investimento ?? []).filter((r) => r.clientId === cliente.id),
          investimentoAnoAnterior: (entrada.investimentoAnoAnterior ?? []).filter((r) => r.clientId === cliente.id),
        })
      : null;

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
      funil,
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

/**
 * Investimento, sessões e pedidos. Metas pela calculadora; pesos de cada métrica pelo
 * mesmo mês do ano anterior (fallback: d1/d2/d3 da meta). Realizado até o último dia fechado:
 * investimento (v_metrics_daily), sessões (GA4) e pedidos aprovados lançados (como a receita).
 */
function montarFunil(e: {
  meta: MetaMes;
  ano: number;
  mes: number;
  diasFechados: number;
  diasNoMes: number;
  pedidosLancados: number;
  ga4Mes: ReceitaGa4Dia[];
  ga4AnoAnterior: ReceitaGa4Dia[];
  investimentoMes: InvestimentoDia[];
  investimentoAnoAnterior: InvestimentoDia[];
}): Record<MetricaFunil, AcompanhamentoMetrica> {
  const metas = metasDoFunil(e.meta);
  const prefixo = `${prefixoMes(e.ano, e.mes)}-`;
  const fechado = (date: string) => date.startsWith(prefixo) && Number(date.slice(8, 10)) <= e.diasFechados;

  const ga4Sessoes = e.ga4Mes.filter((r) => r.sessoes !== undefined && fechado(r.date));
  const realizados: Record<MetricaFunil, number | null> = {
    investimento: somarOuNulo(e.investimentoMes.filter((r) => fechado(r.date)), (r) => r.valor),
    sessoes: somarOuNulo(ga4Sessoes, (r) => r.sessoes ?? 0),
    pedidos: e.pedidosLancados,
  };
  const historicos: Record<MetricaFunil, SerieDiaria[]> = {
    investimento: e.investimentoAnoAnterior.map((r) => ({ date: r.date, valor: r.valor })),
    sessoes: e.ga4AnoAnterior.filter((r) => r.sessoes !== undefined).map((r) => ({ date: r.date, valor: r.sessoes ?? 0 })),
    pedidos: e.ga4AnoAnterior.filter((r) => r.pedidos !== undefined).map((r) => ({ date: r.date, valor: r.pedidos ?? 0 })),
  };

  const resultado = {} as Record<MetricaFunil, AcompanhamentoMetrica>;
  for (const metrica of METRICAS_FUNIL) {
    resultado[metrica] = acompanharMetrica({
      metrica,
      meta: metas[metrica],
      realizado: realizados[metrica],
      historico: historicos[metrica],
      anoAnterior: e.ano - 1,
      mes: e.mes,
      pesosMeta: e.meta.pesos,
      diasFechados: e.diasFechados,
      diasNoMes: e.diasNoMes,
    });
  }
  return resultado;
}

function somar<T>(itens: T[], valor: (item: T) => number): number {
  return itens.reduce((total, item) => total + valor(item), 0);
}

/** Soma, ou null quando não há nenhuma linha (diferente de zero lançado). */
function somarOuNulo<T>(itens: T[], valor: (item: T) => number): number | null {
  return itens.length === 0 ? null : somar(itens, valor);
}
