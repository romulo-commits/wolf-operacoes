import { diasNoMes } from './calendario';
import type { ControleMeta, RegistroLancamento } from './controle-meta';
import { validarRegistroLancamento } from './controle-meta';
import {
  calendarioInicial,
  distribuirMetaDiaria,
  lerPercentuais,
  percentuaisFecham100,
  percentuaisVazios,
  PESOS_DIA_INICIAIS,
  planejarFunil,
  semanasVazias,
  type Canal,
  type CriativoPlano,
  type DiaPlano,
  type PesosTipoDia,
  type SemanaPlano,
} from './planejamento';

/**
 * Fluxo do plano de mídia mensal, nesta ordem.
 * Só se avança um passo. Não há salto.
 */
export const STATUS_PLANO = [
  'em_elaboracao',
  'em_revisao',
  'aprovada_revisor',
  'enviada_cliente',
  'aprovada_cliente',
  'lancada',
] as const;

export type StatusPlano = (typeof STATUS_PLANO)[number];

export const ROTULO_STATUS_PLANO: Record<StatusPlano, string> = {
  em_elaboracao: 'Em elaboração',
  em_revisao: 'Em revisão',
  aprovada_revisor: 'Aprovada pelo revisor',
  enviada_cliente: 'Enviada ao cliente',
  aprovada_cliente: 'Aprovada pelo cliente',
  lancada: 'Lançada',
};

export type TierCliente = 'alpha' | 'beta' | 'gamma';

/** Papel, não pessoa. Os nomes ainda não estão definidos. */
export type PapelRevisor = 'gerente' | 'coordenador';

export const ROTULO_TIER: Record<TierCliente, string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  gamma: 'Gamma',
};

export const ROTULO_PAPEL_REVISOR: Record<PapelRevisor, string> = {
  gerente: 'Gerente de Performance',
  coordenador: 'Coordenador',
};

/** Alpha → gerente. Beta e Gamma → coordenador. */
export function papelRevisorDoTier(tier: TierCliente): PapelRevisor {
  return tier === 'alpha' ? 'gerente' : 'coordenador';
}

export const PREMISSAS_PLANO = ['investimento', 'cps', 'sessoes', 'conversao', 'pedidos', 'ticket'] as const;
export type PremissaPlano = (typeof PREMISSAS_PLANO)[number];

export const ROTULO_PREMISSA: Record<PremissaPlano, string> = {
  investimento: 'Investimento',
  cps: 'CPS',
  sessoes: 'Sessões',
  conversao: 'Taxa de conversão',
  pedidos: 'Pedidos',
  ticket: 'Ticket médio',
};

/** Mesma régua da alteração de meta: motivo curto demais não explica a decisão. */
export const MOTIVO_NAO_SUPERA_MINIMO = 10;

export interface ValorPremissa {
  realizadoAnterior: number | null;
  projetado: number | null;
  fonte: string;
  motivo: string;
}

export interface AcaoMacro {
  id: string;
  descricao: string;
  /** Premissa que a ação move. */
  premissa: PremissaPlano;
}

export interface AcaoMicro {
  id: string;
  descricao: string;
  /** Sem integração com o PDA nesta versão. O destino é só o registro. */
  destino: 'pda';
}

export interface PlanoMidia {
  clientId: string;
  ano: number;
  mes: number;
  tier: TierCliente | null;
  analista: string;
  status: StatusPlano;
  faturamentoMesAnterior: number | null;
  faturamentoAnoAnterior: number | null;
  mediaReceita3m: number | null;
  indiceSazonalidade: number | null;
  notaSazonalidade: string;
  investimentoBase: number | null;
  roasBase: number | null;
  breakEven: number | null;
  fonteBase: string;
  /** Meta de faturado pago. É a meta de faturamento do bloco Meta (Adstart). */
  metaFaturamento: number | null;
  /** Fração. Bruto necessário = meta ÷ taxa de aprovação. */
  taxaAprovacao: number | null;
  fonteAprovacao: string;
  motivoAprovacao: string;
  motivoNaoSupera: string;
  premissas: Record<PremissaPlano, ValorPremissa>;
  /** Percentuais de origem das sessões (0 a 100). Somam 100. */
  origemSessoes: Record<Canal, number | null>;
  /** Percentuais de aquisição do faturado pago (0 a 100). Somam 100. */
  aquisicao: Record<Canal, number | null>;
  pesosDia: PesosTipoDia;
  dias: DiaPlano[];
  semanas: SemanaPlano[];
  criativos: CriativoPlano[];
  capacidadeVerba: string;
  restricoesCliente: string;
  acoesMacro: AcaoMacro[];
  acoesMicro: AcaoMicro[];
  papelRevisor: PapelRevisor | null;
  revisorData: string | null;
  clienteForma: string;
  clienteData: string | null;
  updatedAt: string | null;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function premissaVazia(): ValorPremissa {
  return { realizadoAnterior: null, projetado: null, fonte: '', motivo: '' };
}

export function premissasVazias(): Record<PremissaPlano, ValorPremissa> {
  return {
    investimento: premissaVazia(),
    cps: premissaVazia(),
    sessoes: premissaVazia(),
    conversao: premissaVazia(),
    pedidos: premissaVazia(),
    ticket: premissaVazia(),
  };
}

export function planoVazio(clientId: string, ano: number, mes: number): PlanoMidia {
  return {
    clientId,
    ano,
    mes,
    tier: null,
    analista: '',
    status: 'em_elaboracao',
    faturamentoMesAnterior: null,
    faturamentoAnoAnterior: null,
    mediaReceita3m: null,
    indiceSazonalidade: null,
    notaSazonalidade: '',
    investimentoBase: null,
    roasBase: null,
    breakEven: null,
    fonteBase: '',
    metaFaturamento: null,
    taxaAprovacao: null,
    fonteAprovacao: '',
    motivoAprovacao: '',
    motivoNaoSupera: '',
    premissas: premissasVazias(),
    origemSessoes: percentuaisVazios(),
    aquisicao: percentuaisVazios(),
    pesosDia: { ...PESOS_DIA_INICIAIS },
    dias: calendarioInicial(ano, mes),
    semanas: semanasVazias(),
    criativos: [],
    capacidadeVerba: '',
    restricoesCliente: '',
    acoesMacro: [],
    acoesMicro: [],
    papelRevisor: null,
    revisorData: null,
    clienteForma: '',
    clienteData: null,
    updatedAt: null,
  };
}

export function proximoStatus(status: StatusPlano): StatusPlano | null {
  const indice = STATUS_PLANO.indexOf(status);
  if (indice < 0 || indice >= STATUS_PLANO.length - 1) return null;
  return STATUS_PLANO[indice + 1];
}

/** A meta não supera o mesmo mês do ano anterior (igual também não supera). */
export function metaNaoSuperaAnoAnterior(meta: number | null, anoAnterior: number | null): boolean {
  if (meta === null || anoAnterior === null) return false;
  if (!Number.isFinite(meta) || !Number.isFinite(anoAnterior)) return false;
  return meta <= anoAnterior;
}

export function validarMotivoNaoSupera(meta: number | null, anoAnterior: number | null, motivo: string): string[] {
  if (!metaNaoSuperaAnoAnterior(meta, anoAnterior)) return [];
  if (motivo.trim().length < MOTIVO_NAO_SUPERA_MINIMO) {
    return [
      `A meta não supera o mesmo mês do ano anterior. Informe o motivo (mínimo ${MOTIVO_NAO_SUPERA_MINIMO} caracteres).`,
    ];
  }
  return [];
}

function numeroFinito(valor: number | null): boolean {
  return valor !== null && Number.isFinite(valor);
}

function validarPapel(plano: PlanoMidia): string[] {
  if (!plano.tier) return ['Escolha o tier do cliente (Alpha, Beta ou Gamma).'];
  const esperado = papelRevisorDoTier(plano.tier);
  if (plano.papelRevisor !== esperado) {
    return [`O revisor deste tier é o papel ${ROTULO_PAPEL_REVISOR[esperado]}. O nome da pessoa ainda não entra aqui.`];
  }
  return [];
}

const PREMISSAS_DERIVADAS: PremissaPlano[] = ['investimento', 'sessoes', 'pedidos'];

function validarPremissaPronta(chave: PremissaPlano, valor: ValorPremissa): string[] {
  const rotulo = ROTULO_PREMISSA[chave];
  const erros: string[] = [];
  if (!valor.fonte.trim()) erros.push(`Informe a fonte da premissa ${rotulo}.`);
  // Investimento, sessões e pedidos saem do funil. Ticket, CPS e conversão são insumo.
  if (PREMISSAS_DERIVADAS.includes(chave)) {
    if (valor.realizadoAnterior !== null && (!Number.isFinite(valor.realizadoAnterior) || valor.realizadoAnterior < 0)) {
      erros.push(`O realizado anterior de ${rotulo} não pode ser negativo.`);
    }
    return erros;
  }
  if (!numeroFinito(valor.projetado)) {
    erros.push(`Informe o projetado da premissa ${rotulo}.`);
    return erros;
  }
  const projetado = valor.projetado as number;
  if (chave === 'conversao' && (projetado <= 0 || projetado > 1)) {
    erros.push('A taxa de conversão projetada precisa estar entre 0% e 100%.');
  } else if ((chave === 'cps' || chave === 'ticket') && !(projetado > 0)) {
    erros.push(`O projetado de ${rotulo} precisa ser maior que zero.`);
  } else if (projetado < 0) {
    erros.push(`O projetado de ${rotulo} não pode ser negativo.`);
  }
  if (valor.realizadoAnterior !== null && (!Number.isFinite(valor.realizadoAnterior) || valor.realizadoAnterior < 0)) {
    erros.push(`O realizado anterior de ${rotulo} não pode ser negativo.`);
  }
  return erros;
}

function validarAnatomia(plano: PlanoMidia): string[] {
  const erros: string[] = [];
  if (plano.taxaAprovacao === null || !(plano.taxaAprovacao > 0) || plano.taxaAprovacao > 1) {
    erros.push('Informe a taxa de aprovação esperada.');
  }
  if (!plano.fonteAprovacao.trim()) erros.push('Informe a fonte da taxa de aprovação.');

  const funil = planejarFunil({
    faturadoPago: plano.metaFaturamento ?? Number.NaN,
    taxaAprovacao: plano.taxaAprovacao ?? Number.NaN,
    ticketMedio: plano.premissas.ticket.projetado ?? Number.NaN,
    taxaConversao: plano.premissas.conversao.projetado ?? Number.NaN,
    cps: plano.premissas.cps.projetado ?? Number.NaN,
  });
  if (!funil) erros.push('O funil precisa de faturado pago, aprovação, ticket, conversão e CPS.');

  const origem = lerPercentuais(plano.origemSessoes);
  if (!origem || !percentuaisFecham100(origem)) {
    erros.push('A origem das sessões precisa somar 100%.');
  }
  const aquisicao = lerPercentuais(plano.aquisicao);
  if (!aquisicao || !percentuaisFecham100(aquisicao)) {
    erros.push('A aquisição por canal precisa somar 100%.');
  }

  if (plano.dias.length !== diasNoMes(plano.ano, plano.mes)) {
    erros.push('O calendário diário não cobre o mês.');
  } else if (funil && numeroFinito(plano.metaFaturamento)) {
    const distribuicao = distribuirMetaDiaria(plano.metaFaturamento as number, plano.dias, plano.pesosDia);
    if (!distribuicao.fecha) erros.push('A soma dos dias precisa ser igual à meta de faturado pago.');
  }

  if (plano.semanas.length !== 4) erros.push('O calendário comercial tem quatro semanas.');
  plano.semanas.forEach((semana) => {
    if (!semana.foco.trim()) erros.push(`Informe o foco da semana ${semana.numero}.`);
    if (!semana.acoes.some((acao) => acao.trim())) erros.push(`Inclua ao menos uma ação na semana ${semana.numero}.`);
  });

  const criativosValidos = plano.criativos.filter((item) => item.nome.trim() && item.quantidade !== null && item.quantidade >= 1);
  if (criativosValidos.length === 0) erros.push('Inclua ao menos um criativo com quantidade.');

  return erros;
}

/** Quadro completo o bastante para sair de elaboração. */
export function validarProntoParaRevisao(plano: PlanoMidia): string[] {
  const erros: string[] = [];
  if (!plano.analista.trim()) erros.push('Informe o analista.');
  erros.push(...validarPapel(plano));
  if (!numeroFinito(plano.metaFaturamento) || !(plano.metaFaturamento! > 0)) {
    erros.push('Informe a meta de faturamento.');
  }
  if (!numeroFinito(plano.faturamentoAnoAnterior) || plano.faturamentoAnoAnterior! < 0) {
    erros.push('Informe o faturamento do mesmo mês do ano anterior.');
  }
  if (!numeroFinito(plano.faturamentoMesAnterior) || plano.faturamentoMesAnterior! < 0) {
    erros.push('Informe o faturamento do mês anterior.');
  }
  if (!plano.fonteBase.trim()) erros.push('Informe a fonte da base.');
  if (!numeroFinito(plano.investimentoBase) || plano.investimentoBase! < 0) erros.push('Informe o investimento da base.');
  if (!numeroFinito(plano.roasBase) || plano.roasBase! < 0) erros.push('Informe o ROAS da base.');
  if (!numeroFinito(plano.breakEven) || !(plano.breakEven! > 0)) erros.push('Informe o break-even (ROAS).');
  erros.push(...validarAnatomia(plano));
  if (!plano.capacidadeVerba.trim()) erros.push('Informe a capacidade de verba.');
  if (!plano.restricoesCliente.trim()) erros.push('Informe as restrições do cliente (ou "nenhuma").');

  erros.push(...validarMotivoNaoSupera(plano.metaFaturamento, plano.faturamentoAnoAnterior, plano.motivoNaoSupera));

  for (const chave of PREMISSAS_PLANO) {
    erros.push(...validarPremissaPronta(chave, plano.premissas[chave]));
  }

  if (plano.acoesMacro.length === 0) {
    erros.push('Inclua ao menos uma ação macro, citando a premissa que ela move.');
  }
  plano.acoesMacro.forEach((acao, indice) => {
    if (!acao.descricao.trim()) erros.push(`Descreva a ação macro ${indice + 1}.`);
    if (!PREMISSAS_PLANO.includes(acao.premissa)) erros.push(`A ação macro ${indice + 1} precisa citar uma premissa.`);
  });
  plano.acoesMicro.forEach((acao, indice) => {
    if (!acao.descricao.trim()) erros.push(`Descreva a ação micro ${indice + 1}.`);
    if (acao.destino !== 'pda') erros.push(`A ação micro ${indice + 1} só pode ir para o PDA.`);
  });

  return erros;
}

function validarAprovacaoRevisor(plano: PlanoMidia): string[] {
  const erros = validarPapel(plano);
  if (!plano.revisorData || !DATA_ISO.test(plano.revisorData)) erros.push('Informe a data da revisão.');
  return erros;
}

function validarAprovacaoCliente(plano: PlanoMidia): string[] {
  const erros: string[] = [];
  if (!plano.clienteForma.trim()) erros.push('Informe a forma de aprovação do cliente.');
  if (!plano.clienteData || !DATA_ISO.test(plano.clienteData)) erros.push('Informe a data de aprovação do cliente.');
  return erros;
}

function validarLancamento(controle: ControleMeta | null): string[] {
  if (!controle) {
    return ['Registre a meta lançada na Adstart e no WolfOS, com data, antes de concluir o plano.'];
  }
  const erros = [
    ...validarRegistroLancamento(controle.adstart, 'Adstart'),
    ...validarRegistroLancamento(controle.wolfos, 'WolfOS'),
  ];
  if (!controle.adstart.lancada) erros.push('Marque a meta como lançada na Adstart.');
  if (!controle.wolfos.lancada) erros.push('Marque a meta como lançada no WolfOS.');
  return erros;
}

/**
 * Só a próxima etapa é válida. O controle entra na última passagem (lançada).
 * Este passo não grava e não altera a meta do mês.
 */
export function validarTransicao(plano: PlanoMidia, destino: StatusPlano, controle: ControleMeta | null): string[] {
  const seguinte = proximoStatus(plano.status);
  if (seguinte !== destino) {
    const de = ROTULO_STATUS_PLANO[plano.status];
    const para = ROTULO_STATUS_PLANO[destino];
    return [`A transição de "${de}" para "${para}" não faz parte do fluxo.`];
  }
  switch (destino) {
    case 'em_revisao':
      return validarProntoParaRevisao(plano);
    case 'aprovada_revisor':
      return validarAprovacaoRevisor(plano);
    case 'enviada_cliente':
      return [];
    case 'aprovada_cliente':
      return validarAprovacaoCliente(plano);
    case 'lancada':
      return validarLancamento(controle);
    default:
      return ['Transição desconhecida.'];
  }
}

function numeroSolto(valor: number | null, rotulo: string, permitirZero: boolean): string[] {
  if (valor === null) return [];
  if (!Number.isFinite(valor)) return [`${rotulo} inválido.`];
  if (valor < 0 || (!permitirZero && valor === 0)) return [`${rotulo} precisa ser maior que zero.`];
  return [];
}

/** Integridade do rascunho. Não exige quadro completo. */
export function validarRascunho(plano: PlanoMidia): string[] {
  const erros: string[] = [];
  if (!plano.clientId) erros.push('Escolha o cliente.');
  if (!Number.isInteger(plano.ano) || plano.ano < 2000) erros.push('Ano inválido.');
  if (!Number.isInteger(plano.mes) || plano.mes < 1 || plano.mes > 12) erros.push('Mês deve ser de 1 a 12.');
  if (!STATUS_PLANO.includes(plano.status)) erros.push('Status inválido.');
  if (plano.tier && !['alpha', 'beta', 'gamma'].includes(plano.tier)) erros.push('Tier inválido.');
  if (plano.tier && plano.papelRevisor !== papelRevisorDoTier(plano.tier)) {
    erros.push('O papel do revisor não corresponde ao tier.');
  }
  if (!plano.tier && plano.papelRevisor) erros.push('Sem tier, o papel do revisor fica vazio.');

  erros.push(...numeroSolto(plano.metaFaturamento, 'Meta de faturamento', false));
  erros.push(...numeroSolto(plano.faturamentoMesAnterior, 'Faturamento do mês anterior', true));
  erros.push(...numeroSolto(plano.faturamentoAnoAnterior, 'Faturamento do ano anterior', true));
  erros.push(...numeroSolto(plano.investimentoBase, 'Investimento da base', true));
  erros.push(...numeroSolto(plano.roasBase, 'ROAS da base', true));
  erros.push(...numeroSolto(plano.breakEven, 'Break-even', false));
  if (plano.taxaAprovacao !== null && (!(plano.taxaAprovacao > 0) || plano.taxaAprovacao > 1)) {
    erros.push('Taxa de aprovação fora de 0% a 100%.');
  }
  for (const mapa of [plano.origemSessoes, plano.aquisicao]) {
    if (!mapa) {
      erros.push('Percentuais de canal ausentes.');
      continue;
    }
    for (const valor of Object.values(mapa)) {
      if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 100)) {
        erros.push('Percentual de canal fora de 0 a 100.');
        break;
      }
    }
  }
  for (const tipo of ['normal', 'campanha', 'comercial'] as const) {
    if (plano.pesosDia && !(plano.pesosDia[tipo] > 0)) erros.push('Cada tipo de dia precisa de peso maior que zero.');
  }
  plano.dias?.forEach((dia) => {
    if (dia.valorManual !== null && (!Number.isFinite(dia.valorManual) || dia.valorManual < 0)) {
      erros.push(`Valor do dia ${dia.dia} não pode ser negativo.`);
    }
  });
  plano.criativos?.forEach((item, indice) => {
    if (item.quantidade !== null && (!Number.isInteger(item.quantidade) || item.quantidade < 0)) {
      erros.push(`Quantidade do criativo ${indice + 1} precisa ser um inteiro, zero ou mais.`);
    }
  });

  for (const chave of PREMISSAS_PLANO) {
    const valor = plano.premissas?.[chave];
    if (!valor) {
      erros.push(`Premissa ${ROTULO_PREMISSA[chave]} ausente.`);
      continue;
    }
    if (chave === 'conversao') {
      if (valor.projetado !== null && (!(valor.projetado >= 0) || valor.projetado > 1)) {
        erros.push('Taxa de conversão projetada fora de 0% a 100%.');
      }
    } else if (chave === 'cps' || chave === 'ticket') {
      erros.push(...numeroSolto(valor.projetado, `${ROTULO_PREMISSA[chave]} projetado`, false));
    } else {
      erros.push(...numeroSolto(valor.projetado, `${ROTULO_PREMISSA[chave]} projetado`, true));
    }
    erros.push(...numeroSolto(valor.realizadoAnterior, `${ROTULO_PREMISSA[chave]} realizado`, true));
  }

  plano.acoesMacro.forEach((acao, indice) => {
    if (!PREMISSAS_PLANO.includes(acao.premissa)) erros.push(`Ação macro ${indice + 1} sem premissa válida.`);
  });
  plano.acoesMicro.forEach((acao, indice) => {
    if (acao.destino !== 'pda') erros.push(`Ação micro ${indice + 1} só pode ir para o PDA.`);
  });
  if (plano.revisorData && !DATA_ISO.test(plano.revisorData)) erros.push('Data da revisão inválida.');
  if (plano.clienteData && !DATA_ISO.test(plano.clienteData)) erros.push('Data de aprovação do cliente inválida.');
  return erros;
}

export function registroVazio(): RegistroLancamento {
  return { lancada: false, data: null };
}

/** Grava no plano os projetados que o funil calcula. Não mexe em fonte, motivo nem na meta do mês. */
export function comProjetadosDoFunil(plano: PlanoMidia): PlanoMidia {
  const funil = planejarFunil({
    faturadoPago: plano.metaFaturamento ?? Number.NaN,
    taxaAprovacao: plano.taxaAprovacao ?? Number.NaN,
    ticketMedio: plano.premissas.ticket.projetado ?? Number.NaN,
    taxaConversao: plano.premissas.conversao.projetado ?? Number.NaN,
    cps: plano.premissas.cps.projetado ?? Number.NaN,
  });
  if (!funil) return plano;
  return {
    ...plano,
    premissas: {
      ...plano.premissas,
      investimento: { ...plano.premissas.investimento, projetado: funil.investimento },
      sessoes: { ...plano.premissas.sessoes, projetado: funil.sessoes },
      pedidos: { ...plano.premissas.pedidos, projetado: funil.pedidos },
    },
  };
}
