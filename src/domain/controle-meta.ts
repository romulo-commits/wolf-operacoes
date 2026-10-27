/** Lançamento da meta oficial numa das duas casas (Adstart ou WolfOS). */
export interface RegistroLancamento {
  lancada: boolean;
  /** AAAA-MM-DD. Obrigatória quando lancada. */
  data: string | null;
}

/**
 * Controle da meta, separado da meta em si.
 * Marcar lançamento não altera metaReceita, premissas nem pesos.
 */
export interface ControleMeta {
  clientId: string;
  ano: number;
  mes: number;
  adstart: RegistroLancamento;
  wolfos: RegistroLancamento;
  updatedAt: string | null;
}

export type SituacaoMeta = 'sem_meta' | 'nao_lancada' | 'lancada';

export interface LinhaControleMeta {
  clientId: string;
  temMeta: boolean;
  adstartLancada: boolean;
  adstartData: string | null;
  wolfosLancada: boolean;
  wolfosData: string | null;
  situacao: SituacaoMeta;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarRegistroLancamento(registro: RegistroLancamento, onde: string): string[] {
  if (registro.lancada) {
    if (!registro.data || !DATA_ISO.test(registro.data)) {
      return [`Informe a data do lançamento na ${onde}.`];
    }
    return [];
  }
  if (registro.data) return [`Sem lançamento na ${onde}, a data fica vazia.`];
  return [];
}

export function metaLancadaNosDois(linha: Pick<LinhaControleMeta, 'temMeta' | 'adstartLancada' | 'adstartData' | 'wolfosLancada' | 'wolfosData'>): boolean {
  return Boolean(linha.temMeta && linha.adstartLancada && linha.wolfosLancada && linha.adstartData && linha.wolfosData);
}

export function montarQuadroControle(
  clientes: { id: string }[],
  metas: { clientId: string; ano: number; mes: number }[],
  controles: ControleMeta[],
  ano: number,
  mes: number,
): LinhaControleMeta[] {
  return clientes.map((cliente) => {
    const temMeta = metas.some((meta) => meta.clientId === cliente.id && meta.ano === ano && meta.mes === mes);
    const controle = controles.find((item) => item.clientId === cliente.id && item.ano === ano && item.mes === mes) ?? null;
    const linha: LinhaControleMeta = {
      clientId: cliente.id,
      temMeta,
      adstartLancada: controle?.adstart.lancada ?? false,
      adstartData: controle?.adstart.data ?? null,
      wolfosLancada: controle?.wolfos.lancada ?? false,
      wolfosData: controle?.wolfos.data ?? null,
      situacao: 'nao_lancada',
    };
    linha.situacao = !temMeta ? 'sem_meta' : metaLancadaNosDois(linha) ? 'lancada' : 'nao_lancada';
    return linha;
  });
}

/** Processo 1: quem ainda não tem a meta lançada na Adstart e no WolfOS. */
export function clientesSemMetaLancada(linhas: LinhaControleMeta[]): LinhaControleMeta[] {
  return linhas.filter((linha) => linha.situacao !== 'lancada');
}

export const ROTULO_SITUACAO_META: Record<SituacaoMeta, string> = {
  sem_meta: 'Sem meta definida',
  nao_lancada: 'Meta definida, não lançada',
  lancada: 'Lançada na Adstart e no WolfOS',
};
