import type { PdaCarteira, ReceitaGa4Dia, ClienteCarteira } from '@/domain/carteira';
import { prefixoMes } from '@/domain/carteira';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';
import type { DadosWolfos, SyncPlataforma } from './carteira';

/**
 * DADOS DE EXEMPLO, usados sem credenciais do WOLFOS. A tela marca tudo como exemplo.
 * Os valores são ilustrativos e foram escolhidos para mostrar cada situação (dentro da tolerância,
 * divergente, sync atrasado, token expirado).
 */

/** Dias com dado no mês de exemplo (1 a 24 de outubro). */
const DIAS_COM_DADO = 24;

function distribuirPorDia(clientId: string, total: number, prefixo: string): ReceitaGa4Dia[] {
  const porDia = total / DIAS_COM_DADO;
  return Array.from({ length: DIAS_COM_DADO }, (_, i) => ({
    clientId,
    date: `${prefixo}-${String(i + 1).padStart(2, '0')}`,
    receita: porDia,
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
    ...distribuirPorDia(CLIENTE_ARGENNTI_ID, 1_720_000, prefixo),
    // Exemplo A: bate com a receita lançada
    ...distribuirPorDia(CLIENTE_EXEMPLO_A_ID, 1_071_000, prefixo),
    // Exemplo B: GA4 40% acima da receita lançada (divergente)
    ...distribuirPorDia(CLIENTE_EXEMPLO_B_ID, 700_000, prefixo),
  ];

  return { fonte: 'exemplo', clientes, syncPlataformas, pdas, receitaGa4 };
}
