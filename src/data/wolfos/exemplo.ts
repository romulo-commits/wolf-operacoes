import type { ClienteCarteira, InvestimentoDia, PdaCarteira, ReceitaGa4Dia } from '@/domain/carteira';
import { prefixoMes } from '@/domain/carteira';
import { diasNoMes } from '@/domain/calendario';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';
import type { DadosWolfos, SyncPlataforma } from './carteira';

/**
 * DADOS DE EXEMPLO, usados sem credenciais do WOLFOS. A tela marca tudo como exemplo.
 * Os valores são ilustrativos e foram escolhidos para mostrar cada situação (dentro da tolerância,
 * divergente, sync atrasado, token expirado).
 */

/** Dias com dado no mês de exemplo (1 a 24 de outubro). */
const DIAS_COM_DADO = 24;

const dia2 = (dia: number) => String(dia).padStart(2, '0');

/** GA4 do mês de exemplo: totais de receita, sessões e pedidos divididos igualmente pelos 24 dias. */
function distribuirPorDia(
  clientId: string,
  prefixo: string,
  totais: { receita: number; sessoes: number; pedidos: number },
): ReceitaGa4Dia[] {
  return Array.from({ length: DIAS_COM_DADO }, (_, i) => ({
    clientId,
    date: `${prefixo}-${dia2(i + 1)}`,
    receita: totais.receita / DIAS_COM_DADO,
    sessoes: totais.sessoes / DIAS_COM_DADO,
    pedidos: totais.pedidos / DIAS_COM_DADO,
  }));
}

function investimentoPorDia(clientId: string, prefixo: string, total: number): InvestimentoDia[] {
  return Array.from({ length: DIAS_COM_DADO }, (_, i) => ({
    clientId,
    date: `${prefixo}-${dia2(i + 1)}`,
    valor: total / DIAS_COM_DADO,
  }));
}

type PorDecendio = [number, number, number];
const indiceDecendio = (dia: number) => (dia <= 10 ? 0 : dia <= 20 ? 1 : 2);

/**
 * GA4 diário de exemplo para o mesmo mês do ano anterior: valor por dia em D1, D2 e D3
 * (ilustrativo) para receita, sessões e pedidos. Gera os pesos históricos do exemplo.
 */
function historicoGa4(
  clientId: string,
  prefixo: string,
  totalDias: number,
  porDecendio: { receita: PorDecendio; sessoes: PorDecendio; pedidos: PorDecendio },
): ReceitaGa4Dia[] {
  return Array.from({ length: totalDias }, (_, i) => {
    const d = indiceDecendio(i + 1);
    return {
      clientId,
      date: `${prefixo}-${dia2(i + 1)}`,
      receita: porDecendio.receita[d],
      sessoes: porDecendio.sessoes[d],
      pedidos: porDecendio.pedidos[d],
    };
  });
}

function historicoInvestimento(clientId: string, prefixo: string, totalDias: number, porDecendio: PorDecendio): InvestimentoDia[] {
  return Array.from({ length: totalDias }, (_, i) => ({
    clientId,
    date: `${prefixo}-${dia2(i + 1)}`,
    valor: porDecendio[indiceDecendio(i + 1)],
  }));
}

export function dadosExemplo(ano: number, mes: number): DadosWolfos {
  const prefixo = prefixoMes(ano, mes);

  const clientes: ClienteCarteira[] = [
    { id: CLIENTE_ARGENNTI_ID, nome: 'Argennti' },
    { id: CLIENTE_EXEMPLO_A_ID, nome: 'Exemplo A · moda' },
    { id: CLIENTE_EXEMPLO_B_ID, nome: 'Exemplo B · casa' },
  ];

  const syncPlataformas: SyncPlataforma[] = [
    { clientId: CLIENTE_ARGENNTI_ID, platform: 'meta', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    { clientId: CLIENTE_ARGENNTI_ID, platform: 'google', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    { clientId: CLIENTE_ARGENNTI_ID, platform: 'ga4', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    { clientId: CLIENTE_ARGENNTI_ID, platform: 'gsc', diasAtraso: 2, erro: null, ultimaDataComDado: `${prefixo}-22` },
    { clientId: CLIENTE_EXEMPLO_A_ID, platform: 'meta', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    { clientId: CLIENTE_EXEMPLO_A_ID, platform: 'google', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    { clientId: CLIENTE_EXEMPLO_B_ID, platform: 'meta', diasAtraso: 0, erro: null, ultimaDataComDado: `${prefixo}-24` },
    {
      clientId: CLIENTE_EXEMPLO_B_ID,
      platform: 'google',
      diasAtraso: 9,
      erro: 'Token expirado: reconectar a conta',
      ultimaDataComDado: `${prefixo}-15`,
    },
  ];

  const pdas: PdaCarteira[] = [
    { clientId: CLIENTE_ARGENNTI_ID, dueDate: `${prefixo}-20` },
    { clientId: CLIENTE_ARGENNTI_ID, dueDate: `${prefixo}-28` },
    { clientId: CLIENTE_EXEMPLO_A_ID, dueDate: `${prefixo}-28` },
    { clientId: CLIENTE_EXEMPLO_B_ID, dueDate: `${prefixo}-15` },
    { clientId: CLIENTE_EXEMPLO_B_ID, dueDate: `${prefixo}-18` },
    { clientId: CLIENTE_EXEMPLO_B_ID, dueDate: `${prefixo}-22` },
  ];

  const receitaGa4: ReceitaGa4Dia[] = [
    // Argennti: GA4 ~1% acima da receita lançada (dentro da tolerância)
    ...distribuirPorDia(CLIENTE_ARGENNTI_ID, prefixo, { receita: 1_720_000, sessoes: 470_000, pedidos: 6_500 }),
    // Exemplo A: bate com a receita lançada
    ...distribuirPorDia(CLIENTE_EXEMPLO_A_ID, prefixo, { receita: 1_071_000, sessoes: 210_000, pedidos: 2_400 }),
    // Exemplo B: GA4 40% acima da receita lançada (divergente)
    ...distribuirPorDia(CLIENTE_EXEMPLO_B_ID, prefixo, { receita: 700_000, sessoes: 150_000, pedidos: 1_400 }),
  ];

  const investimento: InvestimentoDia[] = [
    ...investimentoPorDia(CLIENTE_ARGENNTI_ID, prefixo, 430_000),
    ...investimentoPorDia(CLIENTE_EXEMPLO_A_ID, prefixo, 150_000),
    ...investimentoPorDia(CLIENTE_EXEMPLO_B_ID, prefixo, 90_000),
  ];

  // Ano anterior: Argennti tem histórico de tudo; Exemplo A só de GA4 (investimento cai no
  // fallback); Exemplo B não tem nada, para mostrar o fallback com os pesos da meta.
  const prefixoAnterior = prefixoMes(ano - 1, mes);
  const diasAnterior = diasNoMes(ano - 1, mes);
  const ga4AnoAnterior: ReceitaGa4Dia[] = [
    ...historicoGa4(CLIENTE_ARGENNTI_ID, prefixoAnterior, diasAnterior, {
      receita: [70_000, 50_000, 60_000],
      sessoes: [16_000, 14_000, 15_000],
      pedidos: [260, 190, 230],
    }),
    ...historicoGa4(CLIENTE_EXEMPLO_A_ID, prefixoAnterior, diasAnterior, {
      receita: [30_000, 32_000, 40_000],
      sessoes: [6_000, 6_500, 7_500],
      pedidos: [70, 75, 90],
    }),
  ];
  const investimentoAnoAnterior: InvestimentoDia[] = [
    ...historicoInvestimento(CLIENTE_ARGENNTI_ID, prefixoAnterior, diasAnterior, [14_000, 15_000, 16_000]),
  ];

  return {
    fonte: 'exemplo',
    clientes,
    syncPlataformas,
    pdas,
    receitaGa4,
    ga4AnoAnterior,
    investimento,
    investimentoAnoAnterior,
  };
}
