import { useState } from 'react';
import { CampoFracaoPercentual, CampoNumero } from '@/components/campos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ROTULO_POSICAO_ROAS, calcularMetaReversa, compararRoas, type PosicaoRoas } from '@/domain/calculadora';
import { decimal, inteiro, moeda } from '@/lib/formatar';

const CLASSE_POSICAO: Record<PosicaoRoas, string> = {
  acima: 'bg-ok/15 text-ok border-ok/30',
  igual: 'bg-info/15 text-info border-info/30',
  abaixo: 'bg-critico/15 text-critico border-critico/30',
  sem_referencia: 'bg-muted text-muted-foreground border-border',
};

export function CalculadoraReversaCard({
  metaInicial,
  ticketInicial,
  conversaoInicial,
  cpsInicial,
  roasHistorico,
  fonteHistorico,
  sugestaoBreakEven,
}: {
  metaInicial: number | null;
  ticketInicial: number | null;
  conversaoInicial: number | null;
  cpsInicial: number | null;
  roasHistorico: number | null;
  fonteHistorico: string | null;
  sugestaoBreakEven: { roas: number; fonte: string } | null;
}) {
  const [meta, setMeta] = useState<number | null>(metaInicial);
  const [ticket, setTicket] = useState<number | null>(ticketInicial);
  const [conversao, setConversao] = useState<number | null>(conversaoInicial);
  const [cps, setCps] = useState<number | null>(cpsInicial);
  const [breakEven, setBreakEven] = useState<number | null>(null);

  let resultado: ReturnType<typeof calcularMetaReversa> | null = null;
  let erro: string | null = null;
  if (meta !== null && ticket !== null && conversao !== null && cps !== null) {
    try {
      resultado = calcularMetaReversa({
        metaFaturamento: meta,
        ticketMedio: ticket,
        taxaConversao: conversao,
        cps,
      });
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Premissas inválidas.';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora da meta</CardTitle>
        <CardDescription>
          De trás para a frente: pedidos = meta ÷ ticket · sessões = pedidos ÷ conversão · investimento = sessões × CPS · ROAS = faturamento ÷ investimento. Não grava a meta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CampoNumero id="rev-meta" rotulo="Meta de faturamento (R$)" valor={meta} onChange={setMeta} />
          <CampoNumero id="rev-ticket" rotulo="Ticket médio (R$)" valor={ticket} onChange={setTicket} step="0.01" />
          <CampoFracaoPercentual id="rev-conv" rotulo="Taxa de conversão (%)" fracao={conversao} onChange={setConversao} />
          <CampoNumero id="rev-cps" rotulo="CPS (R$)" valor={cps} onChange={setCps} step="0.01" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero id="rev-be" rotulo="Break-even (ROAS)" valor={breakEven} onChange={setBreakEven} step="0.01" />
          {sugestaoBreakEven && (
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setBreakEven(sugestaoBreakEven.roas)}>
                Usar {decimal(sugestaoBreakEven.roas)}× citado no plano de mídia
              </Button>
            </div>
          )}
        </div>
        {sugestaoBreakEven && <p className="text-xs text-muted-foreground">{sugestaoBreakEven.fonte}</p>}
        {erro && <p className="text-sm text-critico">{erro}</p>}
        {resultado && (
          <Table>
            <TableBody>
              <Linha rotulo="Pedidos" valor={inteiro(resultado.pedidos)} />
              <Linha rotulo="Sessões" valor={inteiro(resultado.sessoes)} />
              <Linha rotulo="Investimento" valor={moeda(resultado.investimento, true)} />
              <Linha rotulo="ROAS" valor={`${decimal(resultado.roas)}×`} />
            </TableBody>
          </Table>
        )}
        {resultado && (
          <div className="flex flex-wrap gap-2">
            <Comparacao rotulo="Vs histórico" posicao={compararRoas(resultado.roas, roasHistorico)} referencia={roasHistorico} />
            <Comparacao rotulo="Vs break-even" posicao={compararRoas(resultado.roas, breakEven)} referencia={breakEven} />
          </div>
        )}
        {fonteHistorico && <p className="text-xs text-muted-foreground">Histórico: {fonteHistorico}</p>}
        {roasHistorico === null && (
          <p className="text-xs text-muted-foreground">Sem ROAS do mesmo mês no ano anterior (falta receita ou investimento na série de exemplo).</p>
        )}
      </CardContent>
    </Card>
  );
}

function Comparacao({ rotulo, posicao, referencia }: { rotulo: string; posicao: PosicaoRoas; referencia: number | null }) {
  const detalhe = referencia === null ? ROTULO_POSICAO_ROAS[posicao] : `${ROTULO_POSICAO_ROAS[posicao]} de ${decimal(referencia)}×`;
  return <Badge className={CLASSE_POSICAO[posicao]}>{rotulo}: {detalhe}</Badge>;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{rotulo}</TableCell>
      <TableCell className="text-right font-medium">{valor}</TableCell>
    </TableRow>
  );
}
