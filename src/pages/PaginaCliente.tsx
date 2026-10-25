import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BadgeNota, BadgePesos, BadgeStatusMeta, BadgeSync, BadgeTracking, BadgesAlertas } from '@/components/status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { simularMeta } from '@/domain/calculadora';
import { dataIso, prefixoMes } from '@/domain/carteira';
import { FONTES_INVESTIMENTO } from '@/config/investimento';
import { METRICAS_FUNIL, ROTULO_METRICA, type AcompanhamentoMetrica, type Metrica } from '@/domain/metricas';
import type { PesosAplicados } from '@/domain/pesos';
import { mesPorExtenso, moeda, parseMesInput, percentualFracao, inteiro, decimal, dataBr, mesParaInput } from '@/lib/formatar';
import { useCarteira, useLancamentos, useMetas } from '@/hooks/consultas';
import { NaoEncontrada } from './NaoEncontrada';

const FONTE_PESOS: Record<Metrica, string> = {
  receita: 'GA4, receita',
  investimento: `v_metrics_daily, ${FONTES_INVESTIMENTO.map((f) => f.rotulo).join(' + ')}`,
  sessoes: 'GA4, sessões',
  pedidos: 'GA4, transações',
};

/** Formata o valor da métrica: dinheiro para receita e investimento, inteiro para sessões e pedidos. */
function valorMetrica(metrica: Metrica, valor: number | null): string {
  return metrica === 'receita' || metrica === 'investimento' ? moeda(valor) : inteiro(valor);
}

interface LinhaMetrica {
  metrica: Metrica;
  meta: number | null;
  realizado: number | null;
  esperado: number | null;
  projecao: number | null;
  percentualProjetado: number | null;
  necessaria: number | null;
  pesos: PesosAplicados | null;
}

function deAcompanhamento(a: AcompanhamentoMetrica): LinhaMetrica {
  return {
    metrica: a.metrica,
    meta: a.meta,
    realizado: a.realizado,
    esperado: a.esperadoAteAgora,
    projecao: a.projecao,
    percentualProjetado: a.percentualProjetado,
    necessaria: a.diaria?.necessaria ?? null,
    pesos: a.pesos,
  };
}

export function PaginaCliente() {
  const { clientId = '' } = useParams();
  const hoje = new Date();
  const [params, setParams] = useSearchParams();
  const periodo =
    parseMesInput(params.get('mes') ?? '') ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

  const carteira = useCarteira(periodo.ano, periodo.mes);
  const metas = useMetas();
  const lancamentos = useLancamentos();

  if (carteira.isLoading) return <p className="text-sm text-muted-foreground">Carregando cliente…</p>;
  if (carteira.error) {
    return <p className="text-sm text-critico">Erro ao carregar: {(carteira.error as Error).message}</p>;
  }

  const linha = carteira.data?.linhas.find((l) => l.clientId === clientId);
  if (!linha) return <NaoEncontrada mensagem="Cliente não encontrado na carteira ativa." />;

  const r = linha.resumo;
  const meta = metas.data?.find((m) => m.clientId === clientId && m.ano === periodo.ano && m.mes === periodo.mes);
  const prefixo = prefixoMes(periodo.ano, periodo.mes);
  const lancamentosDoMes = (lancamentos.data ?? [])
    .filter((l) => l.clientId === clientId && l.periodoInicio.startsWith(prefixo))
    .sort((a, b) => a.periodoInicio.localeCompare(b.periodoInicio));
  const ontem = dataIso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1));

  const simulacao = meta
    ? (() => {
        try {
          return simularMeta(meta.premissas);
        } catch {
          return null;
        }
      })()
    : null;

  const funil = linha.funil;
  const linhasMetricas: LinhaMetrica[] = [
    {
      metrica: 'receita',
      meta: r.metaReceita,
      realizado: r.realizado,
      esperado:
        r.metaReceita !== null && r.metaReceita > 0 && r.pesoAcumulado !== null ? r.metaReceita * r.pesoAcumulado : null,
      projecao: r.projecao,
      percentualProjetado: r.percentualProjetado,
      necessaria: r.diaria?.necessaria ?? null,
      pesos: r.pesos,
    },
    ...(funil ? METRICAS_FUNIL.map((m) => deAcompanhamento(funil[m])) : []),
  ];
  // Cronograma por dia: o mesmo dia restante em todas as métricas, cada uma com o seu peso.
  const cronogramaFunil = funil
    ? METRICAS_FUNIL.map((m) => new Map((funil[m].diaria?.cronograma ?? []).map((d) => [d.dia, d] as const)))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← Quadro da carteira
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{linha.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {mesPorExtenso(periodo.ano, periodo.mes)} · realizado até {dataBr(ontem)}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mes-cliente">Mês</Label>
          <Input
            id="mes-cliente"
            type="month"
            className="w-44"
            value={mesParaInput(periodo.ano, periodo.mes)}
            onChange={(e) => setParams({ mes: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Meta do mês" valor={moeda(r.metaReceita)} />
        <Kpi titulo="Realizado (aprovado lançado)" valor={moeda(r.realizado)} />
        <Kpi titulo="Projeção de fechamento" valor={moeda(r.projecao)} />
        <Kpi titulo="Projeção ÷ meta" valor={percentualFracao(r.percentualProjetado)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BadgeStatusMeta status={r.status} />
        <BadgeNota nota={r.grade.nota} />
        <BadgeSync diasAtraso={linha.syncDiasAtraso} erro={linha.syncErro} />
        <BadgeTracking status={linha.statusTracking} indice={linha.indiceTracking} />
        <BadgePesos pesos={r.pesos} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento por métrica</CardTitle>
          <CardDescription>
            Cada métrica com os seus pesos por decêndio do mesmo mês do ano anterior (fallback: d1/d2/d3 da meta).
            Metas de investimento, sessões e pedidos vêm das premissas (orçamento, orçamento ÷ CPS, sessões × conversão).
            Pedidos (GA4) = transações do GA4; os pedidos aprovados lançados ficam nos lançamentos (receita oficial).
            Ritmo necessário/dia = ponderado: falta × peso do próximo dia ÷ peso dos dias restantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Meta do mês</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right" title="Meta × peso acumulado dos dias fechados">
                  Esperado até ontem
                </TableHead>
                <TableHead className="text-right" title="Realizado ÷ peso acumulado">
                  Projeção
                </TableHead>
                <TableHead className="text-right">Projeção ÷ meta</TableHead>
                <TableHead className="text-right">Ritmo necessário/dia</TableHead>
                <TableHead>Pesos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasMetricas.map((m) => (
                <TableRow key={m.metrica}>
                  <TableCell className="font-medium">{ROTULO_METRICA[m.metrica]}</TableCell>
                  <TableCell className="text-right">{valorMetrica(m.metrica, m.meta)}</TableCell>
                  <TableCell className="text-right">{valorMetrica(m.metrica, m.realizado)}</TableCell>
                  <TableCell className="text-right">{valorMetrica(m.metrica, m.esperado)}</TableCell>
                  <TableCell className="text-right">{valorMetrica(m.metrica, m.projecao)}</TableCell>
                  <TableCell className="text-right">{percentualFracao(m.percentualProjetado)}</TableCell>
                  <TableCell className="text-right">{valorMetrica(m.metrica, m.necessaria)}</TableCell>
                  <TableCell>
                    <BadgePesos pesos={m.pesos} fonte={FONTE_PESOS[m.metrica]} />
                  </TableCell>
                </TableRow>
              ))}
              {!funil && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Sem meta do mês: investimento, sessões e pedidos dependem das premissas da meta.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-3 text-sm text-muted-foreground">
            Investimento por fonte:{' '}
            {linha.investimentoPorFonte
              .map((p) => {
                const rotulo = FONTES_INVESTIMENTO.find((f) => f.id === p.fonte)?.rotulo ?? p.fonte;
                return `${rotulo} ${moeda(p.realizado)}`;
              })
              .join(' · ')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metas por decêndio</CardTitle>
            <CardDescription>
              {r.pesos?.origem === 'meta'
                ? 'Sem histórico suficiente do mesmo mês no ano anterior: usando os pesos d1/d2/d3 da meta.'
                : 'Meta do mês distribuída pelos pesos históricos (mesmo mês do ano anterior, GA4).'}{' '}
              Investimento, sessões e pedidos usam os pesos de cada um (passe o mouse para ver o peso).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decêndio</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  {funil &&
                    METRICAS_FUNIL.map((m) => (
                      <TableHead key={m} className="text-right">
                        {ROTULO_METRICA[m]}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {meta && r.pesos ? (
                  ([
                    ['D1 (dias 1–10)', 'd1', r.metasDecendio?.[1] ?? null],
                    ['D2 (dias 11–20)', 'd2', r.metasDecendio?.[2] ?? null],
                    ['D3 (dias 21–fim)', 'd3', r.metasDecendio?.[3] ?? null],
                  ] as const).map(([rotulo, chave, valor]) => (
                    <TableRow key={rotulo}>
                      <TableCell>{rotulo}</TableCell>
                      <TableCell className="text-right">{percentualFracao(r.pesos?.pesos[chave] ?? null)}</TableCell>
                      <TableCell className="text-right">{moeda(valor)}</TableCell>
                      {funil &&
                        METRICAS_FUNIL.map((m) => {
                          const a = funil[m];
                          const peso = a.pesos.pesos[chave];
                          return (
                            <TableCell key={m} className="text-right" title={`Peso ${percentualFracao(peso)}`}>
                              {valorMetrica(m, a.meta === null ? null : a.meta * peso)}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={funil ? 6 : 3} className="text-muted-foreground">
                      Meta do mês não definida. Defina em “Meta do mês”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ritmo necessário por dia</CardTitle>
            <CardDescription>
              Ponderado: o que falta (meta − realizado) de cada métrica distribuído pelos dias restantes conforme o
              peso de cada dia na própria métrica
              {r.pesos?.origem === 'historico' ? ' (receita: histórico do ano anterior).' : ' (receita: pesos da meta).'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {r.diaria && r.diaria.cronograma.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Peso receita</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      {funil &&
                        METRICAS_FUNIL.map((m) => (
                          <TableHead key={m} className="text-right">
                            {ROTULO_METRICA[m]}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.diaria.cronograma.map((d) => (
                      <TableRow key={d.dia}>
                        <TableCell>
                          {String(d.dia).padStart(2, '0')}/{String(periodo.mes).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="text-right">{percentualFracao(d.peso)}</TableCell>
                        <TableCell className="text-right">{moeda(d.valor)}</TableCell>
                        {funil &&
                          METRICAS_FUNIL.map((m, i) => {
                            const dia = cronogramaFunil[i]?.get(d.dia);
                            return (
                              <TableCell
                                key={m}
                                className="text-right"
                                title={dia ? `Peso do dia ${percentualFracao(dia.peso)}` : undefined}
                              >
                                {valorMetrica(m, dia?.valor ?? null)}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {meta ? 'Sem dias restantes no mês.' : 'Sem meta definida para este mês.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premissas e funil</CardTitle>
            <CardDescription>Premissas da meta e o que elas produzem (simulador, sem gravar).</CardDescription>
          </CardHeader>
          <CardContent>
            {meta && simulacao ? (
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Orçamento</TableCell>
                    <TableCell className="text-right">{moeda(meta.premissas.orcamento)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>CPS</TableCell>
                    <TableCell className="text-right">{moeda(meta.premissas.cps, true)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Sessões (orçamento ÷ CPS)</TableCell>
                    <TableCell className="text-right">{inteiro(simulacao.sessoes)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Conversão</TableCell>
                    <TableCell className="text-right">{percentualFracao(meta.premissas.conversao, 2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pedidos</TableCell>
                    <TableCell className="text-right">{inteiro(simulacao.pedidos)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ticket médio</TableCell>
                    <TableCell className="text-right">{moeda(meta.premissas.ticket, true)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Receita simulada</TableCell>
                    <TableCell className="text-right">{moeda(simulacao.receita)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ROAS / CPA</TableCell>
                    <TableCell className="text-right">
                      {decimal(simulacao.roas)}× · {moeda(simulacao.cpa, true)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem meta definida para este mês.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confiabilidade do tracking</CardTitle>
            <CardDescription>GA4 comparado à receita aprovada lançada. 1,00 = bate.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Receita GA4 no mês</TableCell>
                  <TableCell className="text-right">{moeda(linha.receitaGa4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Receita aprovada lançada</TableCell>
                  <TableCell className="text-right">{moeda(r.realizado)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Índice GA4 ÷ lançada</TableCell>
                  <TableCell className="text-right">{decimal(linha.indiceTracking)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados, PDAs e alertas</CardTitle>
            <CardDescription>Saúde do sync (v_sync_saude) e pendências da carteira.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>PDAs pendentes</TableCell>
                  <TableCell className="text-right">{inteiro(linha.pdasPendentes)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>PDAs vencidas</TableCell>
                  <TableCell className="text-right">{inteiro(linha.pdasVencidas)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <BadgesAlertas alertas={linha.alertas} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos de receita do mês</CardTitle>
          <CardDescription>Receita oficial, lançada pelo analista (Adstart ou plataforma).</CardDescription>
        </CardHeader>
        <CardContent>
          {lancamentosDoMes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Pedidos aprovados</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead>Lançado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosDoMes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {dataBr(l.periodoInicio)} a {dataBr(l.periodoFim)}
                    </TableCell>
                    <TableCell>{l.fonte}</TableCell>
                    <TableCell className="text-right">{inteiro(l.pedidosAprovados)}</TableCell>
                    <TableCell className="text-right">{moeda(l.receitaAprovada, true)}</TableCell>
                    <TableCell>{l.lancadoPor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-2xl">{valor}</CardTitle>
      </CardHeader>
    </Card>
  );
}
