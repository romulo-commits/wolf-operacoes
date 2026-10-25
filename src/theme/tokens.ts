import type { StatusTracking } from '@/domain/tracking';
import type { NotaGradeComSemDado } from '@/domain/grade';
import type { StatusMeta } from '@/domain/projecao';

/**
 * Classes de status centralizadas. Mudou a cor da marca? Mexa só em
 * src/index.css (tokens) e aqui, nunca nas telas.
 */
export const classesNota: Record<NotaGradeComSemDado, string> = {
  G0: 'bg-ok/15 text-ok border-ok/30',
  G1: 'bg-info/15 text-info border-info/30',
  G2: 'bg-atencao/15 text-atencao border-atencao/30',
  G3: 'bg-critico/15 text-critico border-critico/30',
  NC: 'bg-muted text-muted-foreground border-border',
};

export const rotuloNota: Record<NotaGradeComSemDado, string> = {
  G0: 'G0 · Excelente',
  G1: 'G1 · Bom',
  G2: 'G2 · Atenção',
  G3: 'G3 · Crítico',
  NC: 'NC · Sem dado',
};

export const classesStatusMeta: Record<StatusMeta, string> = {
  atingida: 'bg-ok/15 text-ok border-ok/30',
  no_ritmo: 'bg-info/15 text-info border-info/30',
  em_risco: 'bg-critico/15 text-critico border-critico/30',
};

export const rotuloStatusMeta: Record<StatusMeta, string> = {
  atingida: 'Atingida',
  no_ritmo: 'No ritmo',
  em_risco: 'Em risco',
};

export const classesTracking: Record<StatusTracking, string> = {
  ok: 'bg-ok/15 text-ok border-ok/30',
  divergente: 'bg-atencao/15 text-atencao border-atencao/30',
  sem_dado: 'bg-muted text-muted-foreground border-border',
};

export const rotuloTracking: Record<StatusTracking, string> = {
  ok: 'Confiável',
  divergente: 'Divergente',
  sem_dado: 'Sem dado',
};
