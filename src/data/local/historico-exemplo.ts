import type { ResultadoMensal } from '@/domain/referencias-meta';
import { CLIENTE_ARGENNTI_ID, CLIENTE_EXEMPLO_A_ID, CLIENTE_EXEMPLO_B_ID } from '@/data/piloto';

/**
 * Série rotulada para o quadro mostrar ano anterior, médias e sazonalidade.
 * Não é meta oficial e não é escrita na chave das metas.
 *
 * Argennti, jan–jun/2025: receita realizada e investimento copiados do plano de mídia
 * anexo (análise 01/01/2025 a 30/09/2025). CPS, sessões e conversão daquela página
 * são premissa de 2026, não realizado de 2025, e por isso não entram aqui.
 * Out/2025: o seed de lançamento já usado neste demo.
 * Jul–set/2026 (média dos 3 meses antes de out/26) não existem nesta série.
 */

export const FONTE_PLANO_ARGENNTI_2025 =
  'Exemplo — plano de mídia Argennti, receita realizada e investimento de 2025. Não é lançamento oficial nem meta do Adstart.';

export const FONTE_SEED_OUTUBRO_2025 =
  'Exemplo — seed de lançamento deste demo (out/2025). Não é dado oficial.';

/** Citado no plano de mídia. Não é a meta oficial de out/26. */
export const REFERENCIA_BREAK_EVEN_ARGENNTI = {
  roas: 4.5,
  fonte: 'Exemplo — plano de mídia Argennti: ROAS mínimo viável citado no documento. Não é meta oficial do Adstart.',
};

export interface HistoricoExemplo extends ResultadoMensal {
  clientId: string;
  fonte: string;
  exemplo: true;
}

function ponto(
  clientId: string,
  ano: number,
  mes: number,
  receita: number | null,
  investimento: number | null,
  fonte: string,
  pedidos: number | null = null,
): HistoricoExemplo {
  return {
    clientId,
    ano,
    mes,
    receita,
    investimento,
    pedidos,
    sessoes: null,
    cps: null,
    conversao: null,
    ticket: receita !== null && pedidos !== null && pedidos > 0 ? receita / pedidos : null,
    fonte,
    exemplo: true,
  };
}

/** Receita realizada e orçamento de 2025, na ordem do plano de mídia (jan–jun). */
const ARGENNTI_PLANO_2025: Array<[number, number, number]> = [
  [1, 1_257_856.43, 406_427.91],
  [2, 1_136_240.02, 346_121.06],
  [3, 1_824_439.56, 438_672.44],
  [4, 1_434_203.93, 415_954.79],
  [5, 1_954_819.7, 462_435.68],
  [6, 2_161_401.34, 551_642.28],
];

export function historicoExemplo(): HistoricoExemplo[] {
  return [
    ...ARGENNTI_PLANO_2025.map(([mes, receita, investimento]) =>
      ponto(CLIENTE_ARGENNTI_ID, 2025, mes, receita, investimento, FONTE_PLANO_ARGENNTI_2025),
    ),
    ponto(CLIENTE_ARGENNTI_ID, 2025, 10, 2_108_255, null, FONTE_SEED_OUTUBRO_2025, 9464),
    ponto(CLIENTE_EXEMPLO_A_ID, 2025, 10, 1_200_000, null, FONTE_SEED_OUTUBRO_2025, 2400),
    ponto(CLIENTE_EXEMPLO_B_ID, 2025, 10, 800_000, null, FONTE_SEED_OUTUBRO_2025, 1300),
  ];
}

export function historicoDoCliente(clientId: string): HistoricoExemplo[] {
  return historicoExemplo().filter((pontoHistorico) => pontoHistorico.clientId === clientId);
}
