import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BadgeNota, BadgeStatusMeta, BadgeSync, BadgeTracking, BadgesAlertas } from '@/components/status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { simularMeta } from '@/domain/calculadora';
import { dataIso, prefixoMes } from '@/domain/carteira';
import { mesPorExtenso, moeda, parseMesInput, percentualFracao, inteiro, decimal, dataBr, mesParaInput } from '@/lib/formatar';
import { useCarteira, useLancamentos, useMetas } from '@/hooks/consultas';
import { NaoEncontrada } from './NaoEncontrada';

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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metas por decêndio</CardTitle>
            <CardDescription>Meta do mês distribuída pelos pesos de cada decêndio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decêndio</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meta ? (
                  ([
                    ['D1 (dias 1–10)', meta.pesos.d1, r.metasDecendio?.[1] ?? null],
                    ['D2 (dias 11–20)', meta.pesos.d2, r.metasDecendio?.[2] ?? null],
                    ['D3 (dias 21–fim)', meta.pesos.d3, r.metasDecendio?.[3] ?? null],
                  ] as const).map(([rotulo, peso, valor]) => (
                    <TableRow key={rotulo}>
                      <TableCell>{rotulo}</TableCell>
                      <TableCell className="text-right">{percentualFracao(peso)}</TableCell>
                      <TableCell className="text-right">{moeda(valor)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
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
                    <TableCell className="text-right">{percentualFracao(meta.premissas.conversao)}</TableCell>
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
                  <TableHead className="text-right">Pedidos</TableHead>
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
