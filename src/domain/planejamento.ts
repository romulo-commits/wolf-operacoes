import { diasNoMes } from './calendario';

/** Canais da anatomia do planejamento mensal. Os percentuais são editáveis e fecham em 100%. */
export const CANAIS = ['meta_ads', 'google', 'organico', 'crm', 'outros'] as const;
export type Canal = (typeof CANAIS)[number];

export const ROTULO_CANAL: Record<Canal, string> = {
  meta_ads: 'Meta Ads',
  google: 'Google',
  organico: 'Orgânico',
  crm: 'CRM',
  outros: 'Outros',
};

export type TipoDia = 'normal' | 'campanha' | 'comercial';

export const ROTULO_TIPO_DIA: Record<TipoDia, string> = {
  normal: 'Dia normal',
  campanha: 'Dia de campanha',
  comercial: 'Data comercial',
};

export interface PesosTipoDia {
  normal: number;
  campanha: number;
  comercial: number;
}

/**
 * Ponto de partida do quadro, só para o calendário não abrir zerado.
 * Não é peso de cliente nenhum: o analista edita.
 */
export const PESOS_DIA_INICIAIS: PesosTipoDia = {
  normal: 1,
  campanha: 1.6,
  comercial: 2,
};

export interface DiaPlano {
  dia: number;
  tipo: TipoDia;
  /** Null = o valor sai do peso. Número = ajuste manual daquele dia. */
  valorManual: number | null;
}

export interface DiaDistribuido {
  dia: number;
  tipo: TipoDia;
  valor: number;
  manual: boolean;
}

export interface DistribuicaoDiaria {
  dias: DiaDistribuido[];
  soma: number;
  /** Soma em centavos igual à meta. */
  fecha: boolean;
}

export interface EntradaFunil {
  /** Meta de faturado pago (R$). */
  faturadoPago: number;
  /** Fração: 0,92 = 92%. */
  taxaAprovacao: number;
  ticketMedio: number;
  /** Fração. */
  taxaConversao: number;
  cps: number;
}

export interface ResultadoFunil {
  /** Bruto necessário = faturado pago ÷ taxa de aprovação. */
  bruto: number;
  /** Pedidos = bruto ÷ ticket médio. */
  pedidos: number;
  /** Sessões = pedidos ÷ taxa de conversão. */
  sessoes: number;
  /** Investimento = sessões × CPS. */
  investimento: number;
  /** ROAS = faturado pago ÷ investimento. */
  roas: number;
}

export interface SemanaPlano {
  numero: 1 | 2 | 3 | 4;
  foco: string;
  acoes: string[];
}

export interface CriativoPlano {
  id: string;
  nome: string;
  quantidade: number | null;
  /** criativos, vídeos, peças, variações… texto livre. */
  unidade: string;
}

/** Exemplo impresso na anatomia. Não é meta de cliente. */
export const EXEMPLO_ANATOMIA = {
  rotulo: 'Exemplo da anatomia do planejamento. Não é dado do cliente.',
  faturadoPago: 1_000_000,
  taxaAprovacao: 0.92,
  ticketMedio: 250,
  taxaConversao: 0.02,
  origem: { meta_ads: 35, google: 25, organico: 15, crm: 15, outros: 10 } as Record<Canal, number>,
};

export const MODELO_SEMANAS_ANATOMIA: Array<Omit<SemanaPlano, 'numero'> & { numero: 1 | 2 | 3 | 4 }> = [
  { numero: 1, foco: 'Aquecimento', acoes: ['Produto-herói', 'Oferta de entrada', 'Campanha de aquisição'] },
  { numero: 2, foco: 'Foco em categoria', acoes: ['Kits e complementos', 'Aumento do ticket', 'Remarketing'] },
  { numero: 3, foco: 'Ação especial', acoes: ['Oferta temática', 'UGC e prova social', 'Ativação de CRM'] },
  { numero: 4, foco: 'Fechamento do mês', acoes: ['Última chamada', 'Estoque limitado', 'Foco em alta intenção'] },
];

export const MODELO_CRIATIVOS_ANATOMIA: Array<Omit<CriativoPlano, 'id' | 'quantidade'>> = [
  { nome: 'Campanha 1', unidade: 'criativos' },
  { nome: 'Campanha 2', unidade: 'criativos' },
  { nome: 'UGC', unidade: 'vídeos' },
  { nome: 'Remarketing', unidade: 'peças' },
  { nome: 'Produtos campeões', unidade: 'variações' },
];

export function percentuaisVazios(): Record<Canal, number | null> {
  return { meta_ads: null, google: null, organico: null, crm: null, outros: null };
}

export function semanasVazias(): SemanaPlano[] {
  return ([1, 2, 3, 4] as const).map((numero) => ({ numero, foco: '', acoes: [''] }));
}

export function calendarioInicial(ano: number, mes: number): DiaPlano[] {
  return Array.from({ length: diasNoMes(ano, mes) }, (_, indice) => ({
    dia: indice + 1,
    tipo: 'normal' as const,
    valorManual: null,
  }));
}

function entradasValidas(entrada: EntradaFunil): boolean {
  const { faturadoPago, taxaAprovacao, ticketMedio, taxaConversao, cps } = entrada;
  return (
    faturadoPago > 0 &&
    Number.isFinite(faturadoPago) &&
    taxaAprovacao > 0 &&
    taxaAprovacao <= 1 &&
    Number.isFinite(taxaAprovacao) &&
    ticketMedio > 0 &&
    Number.isFinite(ticketMedio) &&
    taxaConversao > 0 &&
    taxaConversao <= 1 &&
    Number.isFinite(taxaConversao) &&
    cps > 0 &&
    Number.isFinite(cps)
  );
}

/**
 * Passos 1 a 3 e o investimento do passo 7.
 * Bruto = pago ÷ aprovação · Pedidos = bruto ÷ ticket · Sessões = pedidos ÷ conversão ·
 * Investimento = sessões × CPS · ROAS = pago ÷ investimento.
 * Devolve null se faltar algum insumo. Não grava nada.
 */
export function planejarFunil(entrada: EntradaFunil): ResultadoFunil | null {
  if (!entradasValidas(entrada)) return null;
  const bruto = entrada.faturadoPago / entrada.taxaAprovacao;
  const pedidos = bruto / entrada.ticketMedio;
  const sessoes = pedidos / entrada.taxaConversao;
  const investimento = sessoes * entrada.cps;
  return {
    bruto,
    pedidos,
    sessoes,
    investimento,
    roas: investimento > 0 ? entrada.faturadoPago / investimento : 0,
  };
}

/** Lista dos percentuais, ou null se algum canal estiver vazio ou inválido. */
export function lerPercentuais(mapa: Record<Canal, number | null>): number[] | null {
  const valores = CANAIS.map((canal) => mapa[canal]);
  if (valores.some((valor) => valor === null || !Number.isFinite(valor))) return null;
  return valores as number[];
}

/** Os percentuais editáveis precisam somar 100. Tolerância de 0,01 ponto. */
export function percentuaisFecham100(valores: number[]): boolean {
  if (valores.length === 0) return false;
  if (valores.some((valor) => !Number.isFinite(valor) || valor < 0)) return false;
  const soma = valores.reduce((total, valor) => total + valor, 0);
  return Math.abs(soma - 100) <= 0.01;
}

export interface FatiaCanal {
  canal: Canal;
  percentual: number;
  sessoes: number;
  investimento: number;
  receita: number;
}

/**
 * Origem das sessões reparte as sessões. A aquisição reparte o faturado pago.
 * O investimento do canal é sessões do canal × CPS (o mesmo CPS do plano).
 */
export function fatiasPorCanal(
  sessoes: number,
  cps: number,
  faturadoPago: number,
  origem: Record<Canal, number>,
  aquisicao: Record<Canal, number>,
): FatiaCanal[] {
  return CANAIS.map((canal) => {
    const sessoesCanal = sessoes * (origem[canal] / 100);
    return {
      canal,
      percentual: aquisicao[canal],
      sessoes: sessoesCanal,
      investimento: sessoesCanal * cps,
      receita: faturadoPago * (aquisicao[canal] / 100),
    };
  });
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Reparte um total em centavos pelos pesos, sem perder nem sobrar centavo. */
export function repartirCentavos(totalCentavos: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  if (totalCentavos < 0) return pesos.map(() => 0);
  const somaPesos = pesos.reduce((total, peso) => total + peso, 0);
  if (!(somaPesos > 0)) return pesos.map(() => 0);
  const brutos = pesos.map((peso) => (totalCentavos * peso) / somaPesos);
  const base = brutos.map((valor) => Math.floor(valor));
  let resto = totalCentavos - base.reduce((total, valor) => total + valor, 0);
  const ordem = brutos
    .map((valor, indice) => ({ indice, fracao: valor - Math.floor(valor) }))
    .sort((a, b) => b.fracao - a.fracao || a.indice - b.indice);
  let cursor = 0;
  while (resto > 0) {
    base[ordem[cursor % ordem.length].indice] += 1;
    resto -= 1;
    cursor += 1;
  }
  return base;
}

/**
 * Distribui a meta de faturado pago pelos dias.
 * Dia sem valor manual recebe peso do tipo. A soma dos automáticos absorve o que os manuais não cobriram.
 * Se os manuais já passam da meta, os automáticos ficam em zero e `fecha` é falso.
 */
export function distribuirMetaDiaria(meta: number, dias: DiaPlano[], pesos: PesosTipoDia): DistribuicaoDiaria {
  if (!Number.isFinite(meta) || meta < 0) throw new RangeError('A meta diária precisa ser zero ou mais');
  for (const tipo of ['normal', 'campanha', 'comercial'] as const) {
    if (!(pesos[tipo] > 0) || !Number.isFinite(pesos[tipo])) {
      throw new RangeError('Cada tipo de dia precisa de peso maior que zero');
    }
  }
  for (const dia of dias) {
    if (dia.valorManual !== null && (!(dia.valorManual >= 0) || !Number.isFinite(dia.valorManual))) {
      throw new RangeError('Valor manual do dia não pode ser negativo');
    }
  }

  const metaCent = centavos(meta);
  const manuaisCent = dias.map((dia) => (dia.valorManual === null ? null : centavos(dia.valorManual)));
  const somaManual = manuaisCent.reduce<number>((total, valor) => total + (valor ?? 0), 0);
  const automaticos = dias.map((dia, indice) => (manuaisCent[indice] === null ? indice : -1)).filter((indice) => indice >= 0);
  const restante = metaCent - somaManual;
  const pesosAuto = automaticos.map((indice) => pesos[dias[indice].tipo]);
  const centavosAuto = restante < 0 ? automaticos.map(() => 0) : repartirCentavos(restante, pesosAuto);
  const porIndice = new Map(automaticos.map((indice, posicao) => [indice, centavosAuto[posicao]]));

  const distribuidos: DiaDistribuido[] = dias.map((dia, indice) => {
    const manual = manuaisCent[indice];
    const valorCent = manual === null ? (porIndice.get(indice) ?? 0) : manual;
    return { dia: dia.dia, tipo: dia.tipo, valor: valorCent / 100, manual: manual !== null };
  });
  const somaCent = distribuidos.reduce((total, dia) => total + centavos(dia.valor), 0);
  return {
    dias: distribuidos,
    soma: somaCent / 100,
    fecha: somaCent === metaCent,
  };
}
