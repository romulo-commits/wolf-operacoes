import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { roasDe } from '@/domain/calculadora';
import {
  mediasBase,
  mesesAnteriores,
  mesmoPeriodoAnoAnterior,
  sazonalidadeAnoAnterior,
  variacaoSobre,
} from '@/domain/referencias-meta';
import { historicoDoCliente, type HistoricoExemplo } from '@/data/local/historico-exemplo';
import { decimal, mesPorExtenso, moeda, percentualFracao } from '@/lib/formatar';

export interface ReferenciasCliente {
  pontoAnoAnterior: HistoricoExemplo | null;
  anoAnterior: { ano: number; mes: number };
  medias: ReturnType<typeof mediasBase>;
  mesesMedia: ReturnType<typeof mesesAnteriores>;
  sazonalidade: ReturnType<typeof sazonalidadeAnoAnterior>;
  pontosAno: HistoricoExemplo[];
  variacao: number | null;
}

export function referenciasDoCliente(clientId: string, ano: number, mes: number, meta: number | null): ReferenciasCliente {
  const serie = historicoDoCliente(clientId);
  const anoAnterior = mesmoPeriodoAnoAnterior({ ano, mes });
  const pontoAnoAnterior = serie.find((ponto) => ponto.ano === anoAnterior.ano && ponto.mes === anoAnterior.mes) ?? null;
  const mesesMedia = mesesAnteriores({ ano, mes }, 3);
  return {
    pontoAnoAnterior,
    anoAnterior,
    medias: mediasBase(mesesMedia, serie),
    mesesMedia,
    sazonalidade: sazonalidadeAnoAnterior(anoAnterior.ano, anoAnterior.mes, serie),
    pontosAno: serie.filter((ponto) => ponto.ano === anoAnterior.ano).sort((a, b) => a.mes - b.mes),
    variacao: variacaoSobre(meta, pontoAnoAnterior?.receita ?? null),
  };
}

function nomesMeses(periodos: Array<{ ano: number; mes: number }>): string {
  return periodos.map((periodo) => mesPorExtenso(periodo.ano, periodo.mes)).join(', ');
}

export function ReferenciasBloco({
  clientId,
  ano,
  mes,
  meta,
}: {
  clientId: string;
  ano: number;
  mes: number;
  meta: number | null;
}) {
  const ref = referenciasDoCliente(clientId, ano, mes, meta);
  const roasAno = ref.pontoAnoAnterior ? roasDe(ref.pontoAnoAnterior.receita, ref.pontoAnoAnterior.investimento) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Mesmo período do ano anterior</CardTitle>
          <CardDescription>{mesPorExtenso(ref.anoAnterior.ano, ref.anoAnterior.mes)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ref.pontoAnoAnterior ? (
            <>
              <Table>
                <TableBody>
                  <Linha rotulo="Faturamento" valor={moeda(ref.pontoAnoAnterior.receita, true)} />
                  <Linha rotulo="Investimento" valor={moeda(ref.pontoAnoAnterior.investimento, true)} />
                  <Linha rotulo="Pedidos" valor={ref.pontoAnoAnterior.pedidos === null ? '—' : String(ref.pontoAnoAnterior.pedidos)} />
                  <Linha rotulo="ROAS" valor={roasAno === null ? '—' : `${decimal(roasAno)}×`} />
                  <Linha rotulo="Variação da meta sobre o ano" valor={percentualFracao(ref.variacao)} />
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">{ref.pontoAnoAnterior.fonte}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem resultado deste mês no ano anterior na série de exemplo.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Médias base</CardTitle>
          <CardDescription>Média dos últimos 3 meses: {nomesMeses(ref.mesesMedia)}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ref.medias.completa ? (
            <Table>
              <TableBody>
                <Linha rotulo="Receita" valor={moeda(ref.medias.receita, true)} />
                <Linha rotulo="Investimento" valor={moeda(ref.medias.investimento, true)} />
                <Linha rotulo="ROAS (média dos meses)" valor={ref.medias.roas === null ? '—' : `${decimal(ref.medias.roas)}×`} />
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Histórico incompleto ({ref.medias.mesesConsiderados} de 3). Faltam {nomesMeses(ref.medias.mesesFaltantes)}. A média não é calculada com buraco no meio.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sazonalidade do ano anterior</CardTitle>
          <CardDescription>
            {ref.sazonalidade.serieCompleta
              ? `Índice ${decimal(ref.sazonalidade.indiceVsMediaAnual)}× a média do ano. Participação ${percentualFracao(ref.sazonalidade.participacaoReceita)}.`
              : `Série parcial: ${ref.sazonalidade.mesesComReceita} de 12 meses com receita. O índice só aparece com o ano fechado.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ref.pontosAno.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum mês de {ref.anoAnterior.ano} nesta série.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Invest.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ref.pontosAno.map((ponto) => (
                  <TableRow key={`${ponto.ano}-${ponto.mes}`}>
                    <TableCell>{mesPorExtenso(ponto.ano, ponto.mes)}</TableCell>
                    <TableCell className="text-right">{moeda(ponto.receita, true)}</TableCell>
                    <TableCell className="text-right">{moeda(ponto.investimento, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {ref.pontosAno[0] && <p className="mt-3 text-xs text-muted-foreground">{ref.pontosAno[0].fonte}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{rotulo}</TableCell>
      <TableCell className="text-right font-medium">{valor}</TableCell>
    </TableRow>
  );
}
