import type { StatusMeta } from './projecao';
import type { StatusTracking } from './tracking';

export type TipoAlerta = 'sync' | 'tracking' | 'pdas' | 'meta';
export type SeveridadeAlerta = 'atencao' | 'critico';

export interface Alerta {
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  mensagem: string;
}

export interface EntradaAlertas {
  /** Dias de atraso do sync (v_sync_saude). Null = sem dado. */
  diasAtrasoSync: number | null;
  statusTracking: StatusTracking;
  pdasVencidas: number;
  statusMeta: StatusMeta | null;
}

/** Limites de atraso do dado: 2 dias = atenção, 8 dias = crítico (faixas da carteira). */
export const ATRASO_ATENCAO_DIAS = 2;
export const ATRASO_CRITICO_DIAS = 8;

export function gerarAlertas(entrada: EntradaAlertas): Alerta[] {
  const alertas: Alerta[] = [];

  if (entrada.diasAtrasoSync === null) {
    alertas.push({ tipo: 'sync', severidade: 'critico', mensagem: 'Sem dado sincronizado' });
  } else if (entrada.diasAtrasoSync >= ATRASO_CRITICO_DIAS) {
    alertas.push({
      tipo: 'sync',
      severidade: 'critico',
      mensagem: `Dado atrasado há ${entrada.diasAtrasoSync} dias`,
    });
  } else if (entrada.diasAtrasoSync >= ATRASO_ATENCAO_DIAS) {
    alertas.push({
      tipo: 'sync',
      severidade: 'atencao',
      mensagem: `Dado atrasado há ${entrada.diasAtrasoSync} dias`,
    });
  }

  if (entrada.statusTracking === 'divergente') {
    alertas.push({ tipo: 'tracking', severidade: 'atencao', mensagem: 'GA4 diverge da receita lançada' });
  }

  if (entrada.pdasVencidas > 0) {
    alertas.push({
      tipo: 'pdas',
      severidade: 'atencao',
      mensagem: `${entrada.pdasVencidas} PDA(s) vencida(s)`,
    });
  }

  if (entrada.statusMeta === 'em_risco') {
    alertas.push({ tipo: 'meta', severidade: 'critico', mensagem: 'Projeção abaixo da meta' });
  }

  return alertas;
}
