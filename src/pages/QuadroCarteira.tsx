import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeNota, BadgeStatusMeta, BadgeSync, BadgeTracking, BadgesAlertas, BadgePesos } from '@/components/status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LinhaCarteira } from '@/domain/carteira';
import { dataIso } from '@/domain/carteira';
import { cn } from '@/lib/utils';
import { decimal, dataBr, inteiro, mesParaInput, mesPorExtenso, moeda, parseMesInput, percentualFracao } from '@/lib/formatar';
import { useCarteira } from '@/hooks/consultas';

type Aba = 'diario' | 'decendio' | 'mensal';

const ABAS: Array<{ id: Aba; rotulo: string; descricao: string }> = [
  { id: 'diario', rotulo: 'Diário', descricao: 'Ritmo atual contra o necessário por dia, distribuído pelos pesos históricos do mesmo mês do ano anterior' },
  { id: 'decendio', rotulo: 'Decêndio', descricao: 'Meta de cada decêndio e projeção (realizado ÷ peso acumulado), pelos pesos históricos' },
  { id: 'mensal', rotulo: 'Mensal e anual', descricao: 'Projeção, grade e situação do mês' },
];

function variacaoTexto(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor > 0 ? '+' : ''}${percentualFracao(valor)}`;
}

function KpiCard({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className={cn('text-2xl', destaque && 'text-critico')}>{valor}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function QuadroCarteira() {
  const hoje = new Date();
  const [valorMes, setValorMes] = useState(() => mesParaInput(hoje.getFullYear(), hoje.getMonth() + 1));
  const [aba, setAba] = useState<Aba>('mensal');

  const periodo = parseMesInput(valorMes) ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const consulta = useCarteira(periodo.ano, periodo.mes);
  const linhas = consulta.data?.linhas ?? [];

  const ontem = dataIso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1));
  const comMeta = linhas.filter((l) => l.resumo.temMeta);
  const noAlvo = comMeta.filter((l) => l.resumo.status === 'atingida' || l.resumo.status === 'no_ritmo');
  const emRisco = comMeta.filter((l) => l.resumo.status === 'em_risco');
  const pdasVencidas = linhas.reduce((total, l) => total + l.pdasVencidas, 0);
  const alertasCriticos = linhas.reduce(
    (total, l) => total + l.alertas.filter((a) => a.severidade === 'critico').length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quadro da carteira</h1>
          <p className="text-sm text-muted-foreground">
            {mesPorExtenso(periodo.ano, periodo.mes)} · realizado até {dataBr(ontem)} (dados fecham no dia anterior)
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mes-carteira">Mês de referência</Label>
          <Input
            id="mes-carteira"
            type="month"
            className="w-44"
            value={valorMes}
            onChange={(e) => setValorMes(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Clientes com meta no mês" valor={inteiro(comMeta.length)} />
        <KpiCard titulo="Atingidas ou no ritmo" valor={inteiro(noAlvo.length)} />
        <KpiCard titulo="Em risco (projeção abaixo da meta)" valor={inteiro(emRisco.length)} destaque={emRisco.length > 0} />
        <KpiCard titulo="PDAs vencidas (carteira)" valor={inteiro(pdasVencidas)} destaque={pdasVencidas > 0} />
      </div>
      {alertasCriticos > 0 && (
        <p className="text-sm text-critico">{inteiro(alertasCriticos)} alerta(s) crítico(s) na carteira.</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div role="tablist" aria-label="Visão do quadro" className="inline-flex rounded-md border bg-card p-1">
          {ABAS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={aba === item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                aba === item.id && 'bg-accent text-accent-foreground',
              )}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{ABAS.find((a) => a.id === aba)?.descricao}</p>
      </div>

      {consulta.isLoading && <p className="text-sm text-muted-foreground">Carregando carteira…</p>}
      {consulta.error && (
        <p className="text-sm text-critico">Não foi possível carregar a carteira: {(consulta.error as Error).message}</p>
      )}

      {consulta.data && (
        <Card>
          <CardContent className="pt-5">
            {consulta.data.fonte === 'exemplo' && (
              <p className="mb-3 text-xs text-muted-foreground">Dados de exemplo (sem credenciais do WOLFOS).</p>
            )}
            <TabelaCarteira aba={aba} linhas={linhas} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabelaCarteira({ aba, linhas }: { aba: Aba; linhas: LinhaCarteira[] }) {
  if (linhas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum cliente ativo na carteira.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Meta</TableHead>
          <TableHead className="text-right">Realizado</TableHead>
          <TableHead className="text-right">% atingido</TableHead>
          {aba === 'diario' && (
            <>
              <TableHead className="text-right">Ritmo/dia</TableHead>
              <TableHead className="text-right" title="Próximo dia: falta × peso do dia ÷ peso dos dias restantes">
                Necessário amanhã
              </TableHead>
              <TableHead className="text-right">Média necessária/dia</TableHead>
              <TableHead className="text-right">Aceleração</TableHead>
              <TableHead>Pesos</TableHead>
            </>
          )}
          {aba === 'decendio' && (
            <>
              <TableHead className="text-right">Meta D1</TableHead>
              <TableHead className="text-right">Meta D2</TableHead>
              <TableHead className="text-right">Meta D3</TableHead>
              <TableHead className="text-right">Peso acumulado</TableHead>
              <TableHead className="text-right">Projeção</TableHead>
              <TableHead className="text-right">Gap projetado</TableHead>
              <TableHead>Pesos</TableHead>
            </>
          )}
          {aba === 'mensal' && (
            <>
              <TableHead className="text-right">Projeção</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Grade</TableHead>
            </>
          )}
          <TableHead className="text-right">Var. vs ano anterior</TableHead>
          <TableHead>Confiabilidade GA4</TableHead>
          <TableHead>Sync</TableHead>
          <TableHead>PDAs pend. / venc.</TableHead>
          <TableHead>Alertas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((linha) => {
          const r = linha.resumo;
          return (
            <TableRow key={linha.clientId}>
              <TableCell className="font-medium">
                <Link to={`/clientes/${linha.clientId}`} className="hover:underline">
                  {linha.nome}
                </Link>
              </TableCell>
              <TableCell className="text-right">{moeda(r.metaReceita)}</TableCell>
              <TableCell className="text-right">{moeda(r.realizado)}</TableCell>
              <TableCell className="text-right">{percentualFracao(r.percentualAtingido)}</TableCell>
              {aba === 'diario' && (
                <>
                  <TableCell className="text-right">{moeda(r.diaria?.ritmoAtual ?? null)}</TableCell>
                  <TableCell className="text-right">{moeda(r.diaria?.necessaria ?? null)}</TableCell>
                  <TableCell className="text-right">{moeda(r.diaria?.necessariaMedia ?? null)}</TableCell>
                  <TableCell className="text-right">
                    {r.diaria?.aceleracao == null ? '—' : `${decimal(r.diaria.aceleracao)}×`}
                  </TableCell>
                  <TableCell>
                    <BadgePesos pesos={r.pesos} />
                  </TableCell>
                </>
              )}
              {aba === 'decendio' && (
                <>
                  <TableCell className="text-right">{moeda(r.metasDecendio?.[1] ?? null)}</TableCell>
                  <TableCell className="text-right">{moeda(r.metasDecendio?.[2] ?? null)}</TableCell>
                  <TableCell className="text-right">{moeda(r.metasDecendio?.[3] ?? null)}</TableCell>
                  <TableCell className="text-right">{percentualFracao(r.pesoAcumulado)}</TableCell>
                  <TableCell className="text-right">{moeda(r.projecao)}</TableCell>
                  <TableCell className="text-right">{moeda(r.gapProjetado)}</TableCell>
                  <TableCell>
                    <BadgePesos pesos={r.pesos} />
                  </TableCell>
                </>
              )}
              {aba === 'mensal' && (
                <>
                  <TableCell className="text-right">{moeda(r.projecao)}</TableCell>
                  <TableCell>
                    <BadgeStatusMeta status={r.status} />
                  </TableCell>
                  <TableCell>
                    <BadgeNota nota={r.grade.nota} />
                  </TableCell>
                </>
              )}
              <TableCell className="text-right">{variacaoTexto(r.variacaoAnoAnterior)}</TableCell>
              <TableCell>
                <BadgeTracking status={linha.statusTracking} indice={linha.indiceTracking} />
              </TableCell>
              <TableCell>
                <BadgeSync diasAtraso={linha.syncDiasAtraso} erro={linha.syncErro} />
              </TableCell>
              <TableCell>
                <span className={cn(linha.pdasVencidas > 0 && 'font-semibold text-critico')}>
                  {inteiro(linha.pdasPendentes)} / {inteiro(linha.pdasVencidas)}
                </span>
              </TableCell>
              <TableCell>
                <BadgesAlertas alertas={linha.alertas} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
