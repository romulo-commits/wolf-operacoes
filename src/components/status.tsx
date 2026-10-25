import { Badge } from '@/components/ui/badge';
import type { NotaGradeComSemDado } from '@/domain/grade';
import type { StatusMeta } from '@/domain/projecao';
import type { StatusTracking } from '@/domain/tracking';
import type { Alerta } from '@/domain/alertas';
import type { PesosAplicados } from '@/domain/pesos';
import {
  classesNota,
  classesSeveridadeAlerta,
  classesStatusMeta,
  classesTracking,
  estadoSync,
  rotuloNota,
  rotuloStatusMeta,
  rotuloTracking,
} from '@/theme/tokens';
import { percentualFracao } from '@/lib/formatar';

const traco = <span className="text-muted-foreground">—</span>;

export function BadgeNota({ nota }: { nota: NotaGradeComSemDado }) {
  return (
    <Badge className={classesNota[nota]} title={rotuloNota[nota]}>
      {nota}
    </Badge>
  );
}

export function BadgeStatusMeta({ status }: { status: StatusMeta | null }) {
  if (!status) return traco;
  return <Badge className={classesStatusMeta[status]}>{rotuloStatusMeta[status]}</Badge>;
}

export function BadgeTracking({ status, indice }: { status: StatusTracking; indice: number | null }) {
  const texto = indice === null ? rotuloTracking[status] : `${rotuloTracking[status]} · ${percentualFracao(indice)}`;
  return <Badge className={classesTracking[status]}>{texto}</Badge>;
}

export function BadgeSync({ diasAtraso, erro }: { diasAtraso: number | null; erro: string | null }) {
  const estado = estadoSync(diasAtraso);
  return (
    <Badge className={estado.classes} title={erro ?? undefined}>
      {estado.rotulo}
    </Badge>
  );
}

export function BadgesAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return <span className="text-xs text-ok">Sem alertas</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alertas.map((a) => (
        <Badge key={`${a.tipo}-${a.mensagem}`} className={classesSeveridadeAlerta[a.severidade]}>
          {a.mensagem}
        </Badge>
      ))}
    </div>
  );
}

/** De onde vieram os pesos: histórico do ano anterior ou fallback da meta. */
export function BadgePesos({ pesos }: { pesos: PesosAplicados | null }) {
  if (!pesos) return traco;
  const { d1, d2, d3 } = pesos.pesos;
  const detalhe = `D1 ${percentualFracao(d1)} · D2 ${percentualFracao(d2)} · D3 ${percentualFracao(d3)}`;
  return pesos.origem === 'historico' ? (
    <Badge variant="outline" title={`Mesmo mês do ano anterior (GA4). ${detalhe}`}>
      Histórico ano ant.
    </Badge>
  ) : (
    <Badge variant="outline" className="border-atencao/40 text-atencao" title={`Sem histórico suficiente: pesos da meta. ${detalhe}`}>
      Pesos da meta
    </Badge>
  );
}
