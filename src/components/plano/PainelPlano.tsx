import { useState, type ReactNode } from 'react';
import { CampoFracaoPercentual, CampoLinha, CampoNumero, SelectSimples } from '@/components/campos';
import { ControleLancamento } from '@/components/meta/ControleLancamento';
import { referenciasDoCliente } from '@/components/meta/ReferenciasBloco';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, campoSelect } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REFERENCIA_BREAK_EVEN_ARGENNTI } from '@/data/local/historico-exemplo';
import { CLIENTE_ARGENNTI_ID } from '@/data/piloto';
import { ROTULO_POSICAO_ROAS, compararRoas, roasDe } from '@/domain/calculadora';
import {
  MOTIVO_NAO_SUPERA_MINIMO,
  PREMISSAS_PLANO,
  ROTULO_PAPEL_REVISOR,
  ROTULO_PREMISSA,
  ROTULO_STATUS_PLANO,
  STATUS_PLANO,
  comProjetadosDoFunil,
  metaNaoSuperaAnoAnterior,
  papelRevisorDoTier,
  planoVazio,
  validarProntoParaRevisao,
  type PlanoMidia,
  type PremissaPlano,
  type StatusPlano,
  type TierCliente,
} from '@/domain/plano-midia';
import {
  CANAIS,
  EXEMPLO_ANATOMIA,
  MODELO_CRIATIVOS_ANATOMIA,
  MODELO_SEMANAS_ANATOMIA,
  ROTULO_CANAL,
  ROTULO_TIPO_DIA,
  brutoNecessario,
  distribuirMetaDiaria,
  fatiasPorCanal,
  lerPercentuais,
  percentuaisFecham100,
  planejarFunil,
  totalPedidos,
  totalSessoes,
  type Canal,
  type DiaPlano,
  type TipoDia,
} from '@/domain/planejamento';
import { variacaoSobre } from '@/domain/referencias-meta';
import { useAvancarPlano, useCarteira, useControles, useMetas, usePlanos, useSalvarPlano } from '@/hooks/consultas';
import { decimal, inteiro, mesPorExtenso, moeda, percentualFracao } from '@/lib/formatar';
import { cn } from '@/lib/utils';

const CLASSE_STATUS: Record<StatusPlano, string> = {
  em_elaboracao: 'bg-muted text-muted-foreground border-border',
  em_revisao: 'bg-info/15 text-info border-info/30',
  aprovada_revisor: 'bg-info/15 text-info border-info/30',
  enviada_cliente: 'bg-atencao/15 text-atencao border-atencao/30',
  aprovada_cliente: 'bg-ok/15 text-ok border-ok/30',
  lancada: 'bg-ok/15 text-ok border-ok/30',
};

const CLASSE_TIPO: Record<TipoDia, string> = {
  normal: 'border-border bg-muted/50',
  campanha: 'border-info/40 bg-info/10',
  comercial: 'border-atencao/40 bg-atencao/10',
};

function novoId(): string {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Não foi possível concluir.';
}

function offsetSegunda(ano: number, mes: number): number {
  const dia = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  return (dia + 6) % 7;
}

export function PainelPlano({ clientId, ano, mes, nome }: { clientId: string; ano: number; mes: number; nome: string }) {
  const planos = usePlanos();
  const metas = useMetas();
  const controles = useControles();
  const carteira = useCarteira(ano, mes);

  if (planos.isLoading || metas.isLoading || controles.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando plano…</p>;
  }
  if (planos.error) return <p className="text-sm text-critico">{mensagemErro(planos.error)}</p>;

  const salvo = planos.data?.find((item) => item.clientId === clientId && item.ano === ano && item.mes === mes) ?? null;
  const metaOficial = metas.data?.find((item) => item.clientId === clientId && item.ano === ano && item.mes === mes) ?? null;
  const controle = controles.data?.find((item) => item.clientId === clientId && item.ano === ano && item.mes === mes) ?? null;
  const linha = carteira.data?.linhas.find((item) => item.clientId === clientId) ?? null;

  return (
    <EditorPlano
      key={`${clientId}-${ano}-${mes}`}
      inicial={salvo ?? planoVazio(clientId, ano, mes)}
      versao={`${salvo?.updatedAt ?? 'novo'}|${salvo?.status ?? 'em_elaboracao'}`}
      clientId={clientId}
      ano={ano}
      mes={mes}
      nome={nome}
      metaOficial={metaOficial?.metaReceita ?? null}
      controle={controle}
      realizado={{
        receita: linha?.resumo.realizado ?? null,
        investimento: linha?.funil?.investimento.realizado ?? null,
        sessoes: linha?.funil?.sessoes.realizado ?? null,
        pedidos: linha?.funil?.pedidos.realizado ?? null,
      }}
    />
  );
}

function EditorPlano({
  inicial,
  versao,
  clientId,
  ano,
  mes,
  nome,
  metaOficial,
  controle,
  realizado,
}: {
  inicial: PlanoMidia;
  versao: string;
  clientId: string;
  ano: number;
  mes: number;
  nome: string;
  metaOficial: number | null;
  controle: Parameters<typeof ControleLancamento>[0]['controle'];
  realizado: { receita: number | null; investimento: number | null; sessoes: number | null; pedidos: number | null };
}) {
  const [plano, setPlano] = useState(inicial);
  const [versaoVista, setVersaoVista] = useState(versao);
  const [erros, setErros] = useState<string[]>([]);
  const [avisoExemplo, setAvisoExemplo] = useState(false);
  const salvar = useSalvarPlano();
  const avancar = useAvancarPlano();

  if (versao !== versaoVista) {
    setVersaoVista(versao);
    setPlano(inicial);
  }

  const editavel = plano.status === 'em_elaboracao';
  const ref = referenciasDoCliente(clientId, ano, mes, plano.metaFaturamento);
  const bruto = brutoNecessario(plano.metaFaturamento, plano.taxaAprovacao);
  const pedidos = totalPedidos(bruto, plano.premissas.ticket.projetado);
  const sessoes = totalSessoes(pedidos, plano.premissas.conversao.projetado);
  const funil = planejarFunil({
    faturadoPago: plano.metaFaturamento ?? Number.NaN,
    taxaAprovacao: plano.taxaAprovacao ?? Number.NaN,
    ticketMedio: plano.premissas.ticket.projetado ?? Number.NaN,
    taxaConversao: plano.premissas.conversao.projetado ?? Number.NaN,
    cps: plano.premissas.cps.projetado ?? Number.NaN,
  });

  let distribuicao: ReturnType<typeof distribuirMetaDiaria> | null = null;
  let erroDistribuicao: string | null = null;
  if (plano.metaFaturamento !== null && plano.metaFaturamento >= 0) {
    try {
      distribuicao = distribuirMetaDiaria(plano.metaFaturamento, plano.dias, plano.pesosDia);
    } catch (erro) {
      erroDistribuicao = mensagemErro(erro);
    }
  }

  const origem = lerPercentuais(plano.origemSessoes);
  const aquisicao = lerPercentuais(plano.aquisicao);
  const somaOrigem = CANAIS.reduce((total, canal) => total + (plano.origemSessoes[canal] ?? 0), 0);
  const somaAquisicao = CANAIS.reduce((total, canal) => total + (plano.aquisicao[canal] ?? 0), 0);
  const fatias =
    sessoes !== null && origem && aquisicao && percentuaisFecham100(origem) && percentuaisFecham100(aquisicao) && (plano.premissas.cps.projetado ?? 0) > 0
      ? fatiasPorCanal(sessoes, plano.premissas.cps.projetado ?? 0, plano.metaFaturamento ?? 0, origemValores(plano.origemSessoes), origemValores(plano.aquisicao))
      : null;
  const exigeMotivo = metaNaoSuperaAnoAnterior(plano.metaFaturamento, plano.faturamentoAnoAnterior);
  const variacao = variacaoSobre(plano.metaFaturamento, plano.faturamentoAnoAnterior);

  const patch = (parcial: Partial<PlanoMidia>) => setPlano((atual) => ({ ...atual, ...parcial }));

  const setPremissa = (chave: PremissaPlano, campo: 'projetado' | 'realizadoAnterior' | 'fonte' | 'motivo', valor: number | null | string) => {
    setPlano((atual) => ({
      ...atual,
      premissas: {
        ...atual.premissas,
        [chave]: { ...atual.premissas[chave], [campo]: valor },
      },
    }));
  };

  const setCanal = (mapa: 'origemSessoes' | 'aquisicao', canal: Canal, valor: number | null) => {
    setPlano((atual) => ({ ...atual, [mapa]: { ...atual[mapa], [canal]: valor } }));
  };

  const setDia = (dia: number, parcial: Partial<DiaPlano>) => {
    setPlano((atual) => ({
      ...atual,
      dias: atual.dias.map((item) => (item.dia === dia ? { ...item, ...parcial } : item)),
    }));
  };

  const preencherSugestoes = () => {
    const roas = ref.pontoAnoAnterior ? roasDe(ref.pontoAnoAnterior.receita, ref.pontoAnoAnterior.investimento) : null;
    patch({
      faturamentoAnoAnterior: plano.faturamentoAnoAnterior ?? ref.pontoAnoAnterior?.receita ?? null,
      roasBase: plano.roasBase ?? roas,
      mediaReceita3m: plano.mediaReceita3m ?? (ref.medias.completa ? ref.medias.receita : null),
      indiceSazonalidade: plano.indiceSazonalidade ?? ref.sazonalidade.indiceVsMediaAnual,
      fonteBase: plano.fonteBase.trim() ? plano.fonteBase : (ref.pontoAnoAnterior?.fonte ?? ''),
      notaSazonalidade:
        plano.notaSazonalidade ||
        (ref.sazonalidade.serieCompleta
          ? ''
          : `Série parcial: ${ref.sazonalidade.mesesComReceita} de 12 meses com receita. Índice não calculado.`),
    });
  };

  const carregarExemplo = () => {
    setAvisoExemplo(true);
    setPlano((atual) => {
      const premissas = { ...atual.premissas };
      for (const chave of PREMISSAS_PLANO) {
        premissas[chave] = { ...premissas[chave], fonte: premissas[chave].fonte.trim() ? premissas[chave].fonte : EXEMPLO_ANATOMIA.rotulo };
      }
      premissas.ticket = { ...premissas.ticket, projetado: EXEMPLO_ANATOMIA.ticketMedio };
      premissas.conversao = { ...premissas.conversao, projetado: EXEMPLO_ANATOMIA.taxaConversao };
      return {
        ...atual,
        metaFaturamento: EXEMPLO_ANATOMIA.faturadoPago,
        taxaAprovacao: EXEMPLO_ANATOMIA.taxaAprovacao,
        fonteAprovacao: EXEMPLO_ANATOMIA.rotulo,
        premissas,
        origemSessoes: { ...EXEMPLO_ANATOMIA.origem },
        aquisicao: { ...EXEMPLO_ANATOMIA.origem },
        semanas: MODELO_SEMANAS_ANATOMIA.map((semana) => ({ ...semana, acoes: [...semana.acoes] })),
        criativos: MODELO_CRIATIVOS_ANATOMIA.map((item) => ({ ...item, id: novoId(), quantidade: null })),
      };
    });
  };

  const salvarRascunho = async () => {
    setErros([]);
    try {
      await salvar.mutateAsync(comProjetadosDoFunil({ ...plano, status: 'em_elaboracao' }));
    } catch (erro) {
      setErros([mensagemErro(erro)]);
    }
  };

  const seguir = async (extras?: { revisorData?: string | null; clienteForma?: string; clienteData?: string | null }) => {
    setErros([]);
    try {
      if (plano.status === 'em_elaboracao') {
        const preparado = comProjetadosDoFunil({ ...plano, status: 'em_elaboracao' });
        const locais = validarProntoParaRevisao(preparado);
        if (locais.length > 0) {
          setErros(locais);
          return;
        }
        await salvar.mutateAsync(preparado);
      }
      await avancar.mutateAsync({
        clientId,
        ano,
        mes,
        revisorData: extras?.revisorData ?? plano.revisorData,
        clienteForma: extras?.clienteForma ?? plano.clienteForma,
        clienteData: extras?.clienteData ?? plano.clienteData,
      });
    } catch (erro) {
      setErros([mensagemErro(erro)]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {nome}
            <Badge className={CLASSE_STATUS[plano.status]}>{ROTULO_STATUS_PLANO[plano.status]}</Badge>
          </CardTitle>
          <CardDescription>
            {mesPorExtenso(ano, mes)}. Um quadro por cliente e mês. O revisor é um papel, sem nome de pessoa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="flex flex-wrap gap-2">
            {STATUS_PLANO.map((status) => (
              <li key={status} className={cn('rounded-md border px-2 py-1 text-xs', status === plano.status && 'bg-accent font-semibold')}>
                {ROTULO_STATUS_PLANO[status]}
              </li>
            ))}
          </ol>
          <fieldset disabled={!editavel} className="grid gap-4 border-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
            <SelectSimples
              id="tier"
              rotulo="Tier"
              valor={plano.tier ?? ''}
              onChange={(valor) => {
                if (!valor) patch({ tier: null, papelRevisor: null });
                else {
                  const tier = valor as TierCliente;
                  patch({ tier, papelRevisor: papelRevisorDoTier(tier) });
                }
              }}
              opcoes={[
                { valor: '', rotulo: 'Escolher' },
                { valor: 'alpha', rotulo: 'Alpha' },
                { valor: 'beta', rotulo: 'Beta' },
                { valor: 'gamma', rotulo: 'Gamma' },
              ]}
            />
            <CampoLinha id="analista" rotulo="Analista" valor={plano.analista} onChange={(analista) => patch({ analista })} />
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-medium">Revisor</p>
              <p className="text-sm text-muted-foreground">
                {plano.papelRevisor ? ROTULO_PAPEL_REVISOR[plano.papelRevisor] : 'Depende do tier: gerente no Alpha, coordenador em Beta e Gamma.'}
              </p>
            </div>
          </fieldset>
          {editavel && (
            <Button type="button" variant="outline" onClick={carregarExemplo}>
              Carregar exemplo da anatomia
            </Button>
          )}
          {avisoExemplo && (
            <p className="rounded-md border border-atencao/40 bg-atencao/10 p-3 text-sm" role="status">
              {EXEMPLO_ANATOMIA.rotulo} O CPS continua em branco de propósito: não há CPS nesse exemplo.
            </p>
          )}
        </CardContent>
      </Card>

      <nav className="flex flex-wrap gap-2" aria-label="Passos do plano">
        {[
          'Defina a meta',
          'Calcule os pedidos',
          'Descubra as sessões',
          'Os 4 pilares',
          'Meta diária',
          'Calendário comercial',
          'Aquisição',
          'Criativos',
        ].map((titulo, indice) => (
          <a key={titulo} href={`#passo-${indice + 1}`} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">
            {indice + 1}. {titulo}
          </a>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Base</CardTitle>
          <CardDescription>
            Sugestões da série de exemplo. Preencher não grava a meta do mês. Médias e sazonalidade só entram quando a série fecha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ano anterior ({mesPorExtenso(ref.anoAnterior.ano, ref.anoAnterior.mes)}):{' '}
            {ref.pontoAnoAnterior ? moeda(ref.pontoAnoAnterior.receita, true) : 'sem dado'}. Médias base:{' '}
            {ref.medias.completa ? moeda(ref.medias.receita, true) : `incompletas, faltam ${ref.medias.mesesFaltantes.length} mês(es)`}. Sazonalidade:{' '}
            {ref.sazonalidade.serieCompleta ? `${decimal(ref.sazonalidade.indiceVsMediaAnual)}× a média do ano` : `${ref.sazonalidade.mesesComReceita} de 12 meses`}.
          </p>
          {editavel && (
            <Button type="button" variant="outline" size="sm" onClick={preencherSugestoes}>
              Preencher a base com o que a série tiver
            </Button>
          )}
          <fieldset disabled={!editavel} className="grid gap-4 border-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
            <CampoNumero id="fat-ant" rotulo="Faturamento do mês anterior (R$)" valor={plano.faturamentoMesAnterior} onChange={(faturamentoMesAnterior) => patch({ faturamentoMesAnterior })} />
            <CampoNumero id="fat-aa" rotulo="Faturamento do mesmo mês no ano anterior (R$)" valor={plano.faturamentoAnoAnterior} onChange={(faturamentoAnoAnterior) => patch({ faturamentoAnoAnterior })} />
            <CampoNumero id="media-3" rotulo="Média de receita, 3 meses (R$)" valor={plano.mediaReceita3m} onChange={(mediaReceita3m) => patch({ mediaReceita3m })} />
            <CampoNumero id="indice-saz" rotulo="Índice de sazonalidade" valor={plano.indiceSazonalidade} onChange={(indiceSazonalidade) => patch({ indiceSazonalidade })} step="0.01" />
            <CampoNumero id="inv-base" rotulo="Investimento da base (R$)" valor={plano.investimentoBase} onChange={(investimentoBase) => patch({ investimentoBase })} />
            <CampoNumero id="roas-base" rotulo="ROAS da base" valor={plano.roasBase} onChange={(roasBase) => patch({ roasBase })} step="0.01" />
            <CampoNumero id="break-even" rotulo="Break-even (ROAS)" valor={plano.breakEven} onChange={(breakEven) => patch({ breakEven })} step="0.01" />
            <CampoLinha id="fonte-base" rotulo="Fonte da base" valor={plano.fonteBase} onChange={(fonteBase) => patch({ fonteBase })} />
          </fieldset>
          {clientId === CLIENTE_ARGENNTI_ID && editavel && (
            <Button type="button" variant="ghost" size="sm" onClick={() => patch({ breakEven: REFERENCIA_BREAK_EVEN_ARGENNTI.roas })}>
              Usar break-even {decimal(REFERENCIA_BREAK_EVEN_ARGENNTI.roas)}× citado no plano de mídia
            </Button>
          )}
          {clientId === CLIENTE_ARGENNTI_ID && <p className="text-xs text-muted-foreground">{REFERENCIA_BREAK_EVEN_ARGENNTI.fonte}</p>}
          <CampoLinha id="nota-saz" rotulo="Nota da sazonalidade" valor={plano.notaSazonalidade} onChange={(notaSazonalidade) => patch({ notaSazonalidade })} disabled={!editavel} />
        </CardContent>
      </Card>

      {metaOficial !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <p>
            Meta já definida neste mês: <strong>{moeda(metaOficial, true)}</strong>. Este quadro não altera esse registro.
          </p>
          {editavel && (
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ metaFaturamento: metaOficial })}>
              Copiar para o faturado pago
            </Button>
          )}
        </div>
      )}

      <fieldset disabled={!editavel} className="space-y-6 border-0 p-0 disabled:opacity-80">
        <Passo n={1} titulo="Defina a meta" descricao="Meta de faturado pago. Bruto necessário = pago ÷ taxa de aprovação.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CampoNumero id="pago" rotulo="Meta de faturado pago (R$)" valor={plano.metaFaturamento} onChange={(metaFaturamento) => patch({ metaFaturamento })} />
            <CampoFracaoPercentual id="aprovacao" rotulo="Taxa de aprovação esperada (%)" fracao={plano.taxaAprovacao} onChange={(taxaAprovacao) => patch({ taxaAprovacao })} />
            <SomenteLeitura rotulo="Bruto necessário" valor={moeda(bruto, true)} />
            <CampoLinha id="fonte-aprov" rotulo="Fonte da aprovação" valor={plano.fonteAprovacao} onChange={(fonteAprovacao) => patch({ fonteAprovacao })} />
            <CampoLinha id="motivo-aprov" rotulo="Motivo da aprovação" valor={plano.motivoAprovacao} onChange={(motivoAprovacao) => patch({ motivoAprovacao })} />
            <SomenteLeitura rotulo="Variação sobre o ano anterior" valor={percentualFracao(variacao)} />
          </div>
          <CampoLinha
            id="motivo-ano"
            rotulo={exigeMotivo ? `Motivo (obrigatório, a meta não supera o ano anterior, mín. ${MOTIVO_NAO_SUPERA_MINIMO})` : 'Motivo se a meta não superar o ano anterior'}
            valor={plano.motivoNaoSupera}
            onChange={(motivoNaoSupera) => patch({ motivoNaoSupera })}
          />
        </Passo>

        <Passo n={2} titulo="Calcule os pedidos" descricao="Total de pedidos = bruto ÷ ticket médio esperado.">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero id="ticket" rotulo="Ticket médio esperado (R$)" valor={plano.premissas.ticket.projetado} step="0.01" onChange={(valor) => setPremissa('ticket', 'projetado', valor)} />
            <SomenteLeitura rotulo="Total de pedidos" valor={inteiro(pedidos)} />
          </div>
        </Passo>

        <Passo n={3} titulo="Descubra as sessões" descricao="Sessões = pedidos ÷ taxa de conversão. A origem por canal soma 100%.">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoFracaoPercentual id="conversao" rotulo="Taxa de conversão esperada (%)" fracao={plano.premissas.conversao.projetado} onChange={(valor) => setPremissa('conversao', 'projetado', valor)} />
            <SomenteLeitura rotulo="Total de sessões" valor={inteiro(sessoes)} />
          </div>
          <Percentuais idPrefix="origem" titulo="Origem das sessões" soma={somaOrigem} valores={plano.origemSessoes} onChange={(canal, valor) => setCanal('origemSessoes', canal, valor)} />
        </Passo>

        <Passo n={4} titulo="Os 4 pilares da meta" descricao="Se qualquer um desses números cair, outro precisa compensar para a meta ser atingida.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Pilar titulo="Sessões" valor={inteiro(sessoes)} />
            <Pilar titulo="Conversão" valor={percentualFracao(plano.premissas.conversao.projetado, 2)} />
            <Pilar titulo="Ticket médio" valor={moeda(plano.premissas.ticket.projetado, true)} />
            <Pilar titulo="Aprovação" valor={percentualFracao(plano.taxaAprovacao, 2)} />
          </div>
        </Passo>

        <Passo n={5} titulo="Meta diária com estratégia" descricao="Cada dia é normal, de campanha ou data comercial. O peso reparte o faturado pago. A soma tem de fechar a meta. Valor manual substitui o peso daquele dia.">
          <div className="grid gap-4 sm:grid-cols-3">
            {(['normal', 'campanha', 'comercial'] as const).map((tipo) => (
              <CampoNumero
                key={tipo}
                id={`peso-${tipo}`}
                rotulo={`Peso · ${ROTULO_TIPO_DIA[tipo]}`}
                valor={plano.pesosDia[tipo]}
                step="0.1"
                onChange={(valor) => patch({ pesosDia: { ...plano.pesosDia, [tipo]: valor ?? 0 } })}
              />
            ))}
          </div>
          <p className={cn('text-sm', distribuicao?.fecha ? 'text-ok' : 'text-critico')}>
            {erroDistribuicao && erroDistribuicao}
            {distribuicao && `Soma dos dias ${moeda(distribuicao.soma, true)} · meta ${moeda(plano.metaFaturamento, true)} · ${distribuicao.fecha ? 'fecha a meta' : 'não fecha a meta'}`}
            {!distribuicao && !erroDistribuicao && 'Informe a meta de faturado pago para distribuir os dias.'}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia) => (
              <div key={dia} className="text-center text-xs text-muted-foreground">{dia}</div>
            ))}
            {Array.from({ length: offsetSegunda(ano, mes) }, (_, indice) => (
              <div key={`vazio-${indice}`} />
            ))}
            {plano.dias.map((dia) => {
              const valor = distribuicao?.dias.find((item) => item.dia === dia.dia)?.valor ?? null;
              return (
                <div key={dia.dia} className={cn('space-y-1 rounded-md border p-1.5', CLASSE_TIPO[dia.tipo])}>
                  <div className="text-xs font-semibold">{dia.dia}</div>
                  <select
                    aria-label={`Tipo do dia ${dia.dia}`}
                    className={cn(campoSelect, 'h-7 px-1 text-xs')}
                    value={dia.tipo}
                    onChange={(e) => setDia(dia.dia, { tipo: e.target.value as TipoDia })}
                  >
                    <option value="normal">Normal</option>
                    <option value="campanha">Campanha</option>
                    <option value="comercial">Comercial</option>
                  </select>
                  <div className="text-xs">{valor === null ? '—' : moeda(valor)}</div>
                  <Input
                    aria-label={`Valor manual do dia ${dia.dia}`}
                    type="number"
                    className="h-7 px-1 text-xs"
                    placeholder="auto"
                    value={dia.valorManual ?? ''}
                    onChange={(e) => setDia(dia.dia, { valorManual: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              );
            })}
          </div>
        </Passo>

        <Passo n={6} titulo="Calendário comercial" descricao="Quatro semanas, cada uma com foco e ações. É o calendário comercial do quadro.">
          <div className="grid gap-4 lg:grid-cols-2">
            {plano.semanas.map((semana, indice) => (
              <div key={semana.numero} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-semibold">Semana {semana.numero}</p>
                <CampoLinha id={`foco-${semana.numero}`} rotulo="Foco" valor={semana.foco} onChange={(foco) => {
                  const semanas = plano.semanas.map((item, posicao) => (posicao === indice ? { ...item, foco } : item));
                  patch({ semanas });
                }} />
                {semana.acoes.map((acao, acaoIndice) => (
                  <Input
                    key={`${semana.numero}-${acaoIndice}`}
                    aria-label={`Ação ${acaoIndice + 1} da semana ${semana.numero}`}
                    value={acao}
                    placeholder="Ação da semana"
                    onChange={(e) => {
                      const acoes = semana.acoes.map((item, posicao) => (posicao === acaoIndice ? e.target.value : item));
                      const semanas = plano.semanas.map((item, posicao) => (posicao === indice ? { ...item, acoes } : item));
                      patch({ semanas });
                    }}
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const semanas = plano.semanas.map((item, posicao) => (posicao === indice ? { ...item, acoes: [...item.acoes, ''] } : item));
                    patch({ semanas });
                  }}
                >
                  Adicionar ação
                </Button>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoLinha id="verba" rotulo="Capacidade de verba" valor={plano.capacidadeVerba} onChange={(capacidadeVerba) => patch({ capacidadeVerba })} />
            <CampoLinha id="restricoes" rotulo="Restrições do cliente" valor={plano.restricoesCliente} onChange={(restricoesCliente) => patch({ restricoesCliente })} placeholder="Ou nenhuma" />
          </div>
        </Passo>

        <Passo n={7} titulo="Planeje a aquisição" descricao="Percentual do faturado pago por canal, somando 100%. Investimento do canal = sessões da origem × CPS. ROAS = faturado pago ÷ investimento, comparado ao histórico da base e ao break-even.">
          <CampoNumero id="cps" rotulo="CPS (R$)" valor={plano.premissas.cps.projetado} step="0.01" onChange={(valor) => setPremissa('cps', 'projetado', valor)} />
          <Percentuais idPrefix="aquisicao" titulo="Aquisição" soma={somaAquisicao} valores={plano.aquisicao} onChange={(canal, valor) => setCanal('aquisicao', canal, valor)} />
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Investimento necessário: <strong>{funil ? moeda(funil.investimento, true) : '—'}</strong></span>
            <span>ROAS: <strong>{funil ? `${decimal(funil.roas)}×` : '—'}</strong></span>
            {funil && <span>Vs break-even: {ROTULO_POSICAO_ROAS[compararRoas(funil.roas, plano.breakEven)]}</span>}
            {funil && <span>Vs ROAS da base: {ROTULO_POSICAO_ROAS[compararRoas(funil.roas, plano.roasBase)]}</span>}
          </div>
          {fatias && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Faturado pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fatias.map((fatia) => (
                  <TableRow key={fatia.canal}>
                    <TableCell>{ROTULO_CANAL[fatia.canal]}</TableCell>
                    <TableCell className="text-right">{inteiro(fatia.sessoes)}</TableCell>
                    <TableCell className="text-right">{moeda(fatia.investimento, true)}</TableCell>
                    <TableCell className="text-right">{moeda(fatia.receita, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Passo>

        <Card>
          <CardHeader>
            <CardTitle>Premissas</CardTitle>
            <CardDescription>
              Investimento, sessões e pedidos projetados saem do funil. Cada premissa guarda realizado do mês anterior, fonte e motivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PREMISSAS_PLANO.map((chave) => (
              <div key={chave} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
                <p className="text-sm font-medium sm:col-span-2 lg:col-span-4">{ROTULO_PREMISSA[chave]}</p>
                <SomenteLeitura
                  rotulo="Projetado"
                  valor={textoProjetado(chave, projetadoVisivel(chave, plano, { investimento: funil?.investimento ?? null, sessoes, pedidos }))}
                />
                <CampoNumero
                  id={`real-${chave}`}
                  rotulo="Realizado do mês anterior"
                  valor={plano.premissas[chave].realizadoAnterior}
                  step={chave === 'conversao' ? '0.0001' : '0.01'}
                  onChange={(valor) => setPremissa(chave, 'realizadoAnterior', valor)}
                />
                <CampoLinha id={`fonte-${chave}`} rotulo="Fonte" valor={plano.premissas[chave].fonte} onChange={(valor) => setPremissa(chave, 'fonte', valor)} />
                <CampoLinha id={`motivo-${chave}`} rotulo="Motivo" valor={plano.premissas[chave].motivo} onChange={(valor) => setPremissa(chave, 'motivo', valor)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Passo n={8} titulo="Planeje os criativos" descricao="Campanhas e formatos, com a quantidade de peças, criativos ou vídeos.">
          <div className="space-y-3">
            {plano.criativos.map((item, indice) => (
              <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
                <Input aria-label={`Nome do criativo ${indice + 1}`} value={item.nome} onChange={(e) => patch({ criativos: plano.criativos.map((atual, posicao) => posicao === indice ? { ...atual, nome: e.target.value } : atual) })} />
                <Input aria-label={`Quantidade do criativo ${indice + 1}`} type="number" placeholder="Qtd." value={item.quantidade ?? ''} onChange={(e) => patch({ criativos: plano.criativos.map((atual, posicao) => posicao === indice ? { ...atual, quantidade: e.target.value === '' ? null : Number(e.target.value) } : atual) })} />
                <Input aria-label={`Unidade do criativo ${indice + 1}`} value={item.unidade} placeholder="criativos" onChange={(e) => patch({ criativos: plano.criativos.map((atual, posicao) => posicao === indice ? { ...atual, unidade: e.target.value } : atual) })} />
                <Button type="button" variant="ghost" size="sm" onClick={() => patch({ criativos: plano.criativos.filter((_, posicao) => posicao !== indice) })}>
                  Remover
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ criativos: [...plano.criativos, { id: novoId(), nome: '', quantidade: null, unidade: 'criativos' }] })}>
              Adicionar criativo
            </Button>
          </div>
        </Passo>

        <Card>
          <CardHeader>
            <CardTitle>Ações do plano</CardTitle>
            <CardDescription>Cada ação macro cita a premissa que move. A micro só fica registrada como “vai para o PDA”. Sem integração com o PDA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plano.acoesMacro.map((acao, indice) => (
              <div key={acao.id} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
                <Input aria-label={`Ação macro ${indice + 1}`} value={acao.descricao} placeholder="Ação macro" onChange={(e) => patch({ acoesMacro: plano.acoesMacro.map((atual, posicao) => posicao === indice ? { ...atual, descricao: e.target.value } : atual) })} />
                <select className={campoSelect} aria-label={`Premissa da ação macro ${indice + 1}`} value={acao.premissa} onChange={(e) => patch({ acoesMacro: plano.acoesMacro.map((atual, posicao) => posicao === indice ? { ...atual, premissa: e.target.value as PremissaPlano } : atual) })}>
                  {PREMISSAS_PLANO.map((chave) => (
                    <option key={chave} value={chave}>{ROTULO_PREMISSA[chave]}</option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="sm" onClick={() => patch({ acoesMacro: plano.acoesMacro.filter((_, posicao) => posicao !== indice) })}>Remover</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ acoesMacro: [...plano.acoesMacro, { id: novoId(), descricao: '', premissa: 'investimento' }] })}>
              Adicionar ação macro
            </Button>
            {plano.acoesMicro.map((acao, indice) => (
              <div key={acao.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input aria-label={`Ação micro ${indice + 1}`} value={acao.descricao} placeholder="Ação micro" onChange={(e) => patch({ acoesMicro: plano.acoesMicro.map((atual, posicao) => posicao === indice ? { ...atual, descricao: e.target.value } : atual) })} />
                <Badge variant="muted">Vai para o PDA</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => patch({ acoesMicro: plano.acoesMicro.filter((_, posicao) => posicao !== indice) })}>Remover</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ acoesMicro: [...plano.acoesMicro, { id: novoId(), descricao: '', destino: 'pda' }] })}>
              Adicionar ação micro
            </Button>
          </CardContent>
        </Card>
      </fieldset>

      <Passo n={9} titulo="CRM e retenção" descricao="Fora deste quadro. Entra numa versão seguinte.">
        <p className="text-sm text-muted-foreground">E-mail, WhatsApp, carrinho abandonado e recompra ainda não são lançados aqui.</p>
      </Passo>

      <Passo n={10} titulo="Acompanhe e corrija" descricao="Meta deste plano contra o realizado do mês. O realizado vem dos lançamentos e do GA4 já usados no quadro da carteira.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="text-right">Meta do plano</TableHead>
              <TableHead className="text-right">Realizado do mês</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Faturado pago</TableCell>
              <TableCell className="text-right">{moeda(plano.metaFaturamento, true)}</TableCell>
              <TableCell className="text-right">{moeda(realizado.receita, true)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Investimento</TableCell>
              <TableCell className="text-right">{funil ? moeda(funil.investimento, true) : '—'}</TableCell>
              <TableCell className="text-right">{moeda(realizado.investimento, true)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Sessões</TableCell>
              <TableCell className="text-right">{inteiro(sessoes)}</TableCell>
              <TableCell className="text-right">{inteiro(realizado.sessoes)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pedidos</TableCell>
              <TableCell className="text-right">{inteiro(pedidos)}</TableCell>
              <TableCell className="text-right">{inteiro(realizado.pedidos)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Passo>

      <Card>
        <CardHeader>
          <CardTitle>Aprovações</CardTitle>
          <CardDescription>Revisor e data; depois o cliente, a forma e a data. O nome da pessoa do revisor não entra.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Revisor</p>
            <p className="text-sm">{plano.papelRevisor ? ROTULO_PAPEL_REVISOR[plano.papelRevisor] : '—'}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="data-revisor">Data da revisão</label>
            <Input id="data-revisor" type="date" className="w-44" disabled={plano.status !== 'em_revisao'} value={plano.revisorData ?? ''} onChange={(e) => patch({ revisorData: e.target.value || null })} />
          </div>
          <CampoLinha id="forma-cliente" rotulo="Forma de aprovação do cliente" valor={plano.clienteForma} disabled={plano.status !== 'enviada_cliente'} onChange={(clienteForma) => patch({ clienteForma })} placeholder="WhatsApp, reunião, e-mail" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="data-cliente">Data de aprovação do cliente</label>
            <Input id="data-cliente" type="date" className="w-44" disabled={plano.status !== 'enviada_cliente'} value={plano.clienteData ?? ''} onChange={(e) => patch({ clienteData: e.target.value || null })} />
          </div>
        </CardContent>
      </Card>

      <ControleLancamento key={`${clientId}-${ano}-${mes}-${controle?.updatedAt ?? 'sem'}`} clientId={clientId} ano={ano} mes={mes} controle={controle} />

      {erros.length > 0 && (
        <ul className="list-disc space-y-1 rounded-md border border-critico/30 bg-critico/10 p-4 pl-8 text-sm text-critico">
          {erros.map((erro) => (
            <li key={erro}>{erro}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {editavel && (
          <Button type="button" variant="outline" disabled={salvar.isPending} onClick={() => void salvarRascunho()}>
            Salvar rascunho
          </Button>
        )}
        {plano.status === 'em_elaboracao' && (
          <Button type="button" disabled={salvar.isPending || avancar.isPending} onClick={() => void seguir()}>
            Enviar para revisão
          </Button>
        )}
        {plano.status === 'em_revisao' && (
          <Button type="button" disabled={avancar.isPending} onClick={() => void seguir({ revisorData: plano.revisorData })}>
            Registrar aprovação do revisor
          </Button>
        )}
        {plano.status === 'aprovada_revisor' && (
          <Button type="button" disabled={avancar.isPending} onClick={() => void seguir()}>
            Marcar como enviada ao cliente
          </Button>
        )}
        {plano.status === 'enviada_cliente' && (
          <Button type="button" disabled={avancar.isPending} onClick={() => void seguir({ clienteForma: plano.clienteForma, clienteData: plano.clienteData })}>
            Registrar aprovação do cliente
          </Button>
        )}
        {plano.status === 'aprovada_cliente' && (
          <Button type="button" disabled={avancar.isPending} onClick={() => void seguir()}>
            Marcar como lançada
          </Button>
        )}
        {plano.status === 'lancada' && <p className="text-sm text-ok">Plano lançado.</p>}
      </div>
    </div>
  );
}

function origemValores(mapa: Record<Canal, number | null>): Record<Canal, number> {
  return {
    meta_ads: mapa.meta_ads ?? 0,
    google: mapa.google ?? 0,
    organico: mapa.organico ?? 0,
    crm: mapa.crm ?? 0,
    outros: mapa.outros ?? 0,
  };
}

function projetadoVisivel(
  chave: PremissaPlano,
  plano: PlanoMidia,
  derivados: { investimento: number | null; sessoes: number | null; pedidos: number | null },
): number | null {
  if (chave === 'investimento') return derivados.investimento;
  if (chave === 'sessoes') return derivados.sessoes;
  if (chave === 'pedidos') return derivados.pedidos;
  return plano.premissas[chave].projetado;
}

function textoProjetado(chave: PremissaPlano, valor: number | null): string {
  if (valor === null) return '—';
  if (chave === 'conversao') return percentualFracao(valor, 2);
  if (chave === 'sessoes' || chave === 'pedidos') return inteiro(valor);
  return moeda(valor, true);
}

function Passo({ n, titulo, descricao, children }: { n: number; titulo: string; descricao: string; children: ReactNode }) {
  return (
    <Card id={`passo-${n}`} className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">{n}</span>
          {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Pilar({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
    </div>
  );
}

function SomenteLeitura({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{rotulo}</p>
      <p className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{valor}</p>
    </div>
  );
}

function Percentuais({
  idPrefix,
  titulo,
  soma,
  valores,
  onChange,
}: {
  idPrefix: string;
  titulo: string;
  soma: number;
  valores: Record<Canal, number | null>;
  onChange: (canal: Canal, valor: number | null) => void;
}) {
  const fecha = Math.abs(soma - 100) <= 0.01 && CANAIS.every((canal) => valores[canal] !== null);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{titulo}</p>
      <div className="grid gap-3 sm:grid-cols-5">
        {CANAIS.map((canal) => (
          <CampoNumero key={canal} id={`${idPrefix}-${canal}`} rotulo={`${ROTULO_CANAL[canal]} (%)`} valor={valores[canal]} step="0.1" onChange={(valor) => onChange(canal, valor)} />
        ))}
      </div>
      <p className={cn('text-sm', fecha ? 'text-ok' : 'text-critico')}>Soma {decimal(soma)}%{fecha ? ' · fecha 100%' : ' · precisa fechar 100%'}</p>
    </div>
  );
}
