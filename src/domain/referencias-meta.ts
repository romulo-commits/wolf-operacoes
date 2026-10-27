import { media, roasDe } from './calculadora';

export interface Periodo {
  ano: number;
  mes: number;
}

/** Um mês de resultado. Null = a métrica não veio na fonte. */
export interface ResultadoMensal {
  ano: number;
  mes: number;
  receita: number | null;
  investimento: number | null;
  pedidos: number | null;
  sessoes: number | null;
  cps: number | null;
  /** Fração. */
  conversao: number | null;
  ticket: number | null;
}

export function mesAnterior(periodo: Periodo): Periodo {
  if (periodo.mes === 1) return { ano: periodo.ano - 1, mes: 12 };
  return { ano: periodo.ano, mes: periodo.mes - 1 };
}

/** Os `quantidade` meses anteriores, do mais antigo ao mais recente. */
export function mesesAnteriores(periodo: Periodo, quantidade: number): Periodo[] {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new RangeError('A quantidade de meses precisa ser pelo menos 1.');
  }
  const meses: Periodo[] = [];
  let cursor = periodo;
  for (let i = 0; i < quantidade; i += 1) {
    cursor = mesAnterior(cursor);
    meses.push(cursor);
  }
  return meses.reverse();
}

export function mesmoPeriodoAnoAnterior(periodo: Periodo): Periodo {
  return { ano: periodo.ano - 1, mes: periodo.mes };
}

/** (atual − base) ÷ base. Null se a base não for positiva. */
export function variacaoSobre(atual: number | null, base: number | null): number | null {
  if (atual === null || base === null || !(base > 0) || !Number.isFinite(atual) || !Number.isFinite(base)) return null;
  return (atual - base) / base;
}

export interface MediasBase {
  mesesConsiderados: number;
  mesesFaltantes: Periodo[];
  /** Todos os meses esperados existem na série (a métrica ainda pode faltar). */
  completa: boolean;
  receita: number | null;
  investimento: number | null;
  pedidos: number | null;
  sessoes: number | null;
  cps: number | null;
  conversao: number | null;
  ticket: number | null;
  /** Média dos ROAS mensais, não a razão das médias. */
  roas: number | null;
}

function mediaCompleta(valores: Array<number | null>): number | null {
  if (valores.length === 0 || valores.some((valor) => valor === null || !Number.isFinite(valor))) return null;
  return media(valores as number[]);
}

/**
 * Médias base dos meses pedidos (no quadro, os 3 anteriores).
 * Se falta um mês, nenhuma média é calculada: média de 2 meses não é a dos últimos 3.
 * Se o mês existe mas a métrica veio vazia, só essa métrica fica sem média.
 */
export function mediasBase(esperados: Periodo[], serie: ResultadoMensal[]): MediasBase {
  const porChave = new Map(serie.map((ponto) => [`${ponto.ano}-${ponto.mes}`, ponto]));
  const pontos = esperados.map((periodo) => porChave.get(`${periodo.ano}-${periodo.mes}`) ?? null);
  const faltantes = esperados.filter((_, indice) => pontos[indice] === null);
  const presentes = pontos.filter((ponto): ponto is ResultadoMensal => ponto !== null);
  const coluna = (ler: (ponto: ResultadoMensal) => number | null) =>
    faltantes.length > 0 ? null : mediaCompleta(presentes.map(ler));

  return {
    mesesConsiderados: presentes.length,
    mesesFaltantes: faltantes,
    completa: esperados.length > 0 && faltantes.length === 0,
    receita: coluna((ponto) => ponto.receita),
    investimento: coluna((ponto) => ponto.investimento),
    pedidos: coluna((ponto) => ponto.pedidos),
    sessoes: coluna((ponto) => ponto.sessoes),
    cps: coluna((ponto) => ponto.cps),
    conversao: coluna((ponto) => ponto.conversao),
    ticket: coluna((ponto) => ponto.ticket),
    roas: faltantes.length > 0 ? null : mediaCompleta(presentes.map((ponto) => roasDe(ponto.receita, ponto.investimento))),
  };
}

export interface SazonalidadeAno {
  ano: number;
  mes: number;
  receitaMes: number | null;
  investimentoMes: number | null;
  mesesComReceita: number;
  serieCompleta: boolean;
  /** Receita do mês ÷ soma dos 12 meses. Só com o ano fechado. */
  participacaoReceita: number | null;
  /** Receita do mês ÷ média dos 12 meses. 1 = na média do ano. */
  indiceVsMediaAnual: number | null;
  /** (receita do mês − receita do mês anterior) ÷ receita do mês anterior. */
  variacaoVsMesAnterior: number | null;
  /** Meses 1–12 sem receita. */
  mesesAusentes: number[];
}

/**
 * Sazonalidade do ano anterior. O índice contra a média anual só sai com os 12 meses;
 * uma série parcial não vira índice.
 */
export function sazonalidadeAnoAnterior(ano: number, mes: number, serie: ResultadoMensal[]): SazonalidadeAno {
  const doAno = serie.filter((ponto) => ponto.ano === ano);
  const porMes = new Map(doAno.map((ponto) => [ponto.mes, ponto]));
  const atual = porMes.get(mes) ?? null;
  const mesesAusentes: number[] = [];
  for (let numero = 1; numero <= 12; numero += 1) {
    const ponto = porMes.get(numero);
    if (!ponto || ponto.receita === null || !Number.isFinite(ponto.receita)) mesesAusentes.push(numero);
  }
  const serieCompleta = mesesAusentes.length === 0;
  const receitas = serieCompleta
    ? Array.from({ length: 12 }, (_, indice) => porMes.get(indice + 1)!.receita as number)
    : [];
  const soma = receitas.reduce((total, valor) => total + valor, 0);
  const mediaAnual = receitas.length > 0 ? soma / 12 : null;
  const receitaMes = atual?.receita ?? null;

  const anterior =
    mes === 1
      ? (serie.find((ponto) => ponto.ano === ano - 1 && ponto.mes === 12) ?? null)
      : (porMes.get(mes - 1) ?? null);
  const receitaAnterior = anterior?.receita ?? null;
  const variacaoVsMesAnterior =
    receitaMes !== null && receitaAnterior !== null && receitaAnterior > 0
      ? (receitaMes - receitaAnterior) / receitaAnterior
      : null;

  return {
    ano,
    mes,
    receitaMes,
    investimentoMes: atual?.investimento ?? null,
    mesesComReceita: doAno.filter((ponto) => ponto.receita !== null && Number.isFinite(ponto.receita)).length,
    serieCompleta,
    participacaoReceita: serieCompleta && soma > 0 && receitaMes !== null ? receitaMes / soma : null,
    indiceVsMediaAnual: serieCompleta && mediaAnual !== null && mediaAnual > 0 && receitaMes !== null ? receitaMes / mediaAnual : null,
    variacaoVsMesAnterior,
    mesesAusentes,
  };
}
