import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, campoSelect } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { simularMeta } from '@/domain/calculadora';
import type { MetaMes, Premissas } from '@/domain/tipos';
import { decimal, dataBr, inteiro, mesParaInput, mesPorExtenso, moeda, parseMesInput, percentualFracao } from '@/lib/formatar';
import { useAlterarMeta, useCarteira, useCriarMeta, useMetas } from '@/hooks/consultas';
import { MOTIVO_MINIMO_CARACTERES, validarDadosMeta, type DadosMeta } from '@/data/local/repositorio';
import { cn } from '@/lib/utils';

/** Valor de fração (0,0143) para o campo em percentual ("1,43"). */
const fracaoParaPercentual = (fracao: number) => String(Number((fracao * 100).toFixed(4)));

export function CalculadoraMeta() {
  const hoje = new Date();
  const [valorMes, setValorMes] = useState(() => mesParaInput(hoje.getFullYear(), hoje.getMonth() + 1));
  const [clienteEscolhido, setClienteEscolhido] = useState<string>('');

  const periodo = parseMesInput(valorMes) ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const carteira = useCarteira(periodo.ano, periodo.mes);
  const metas = useMetas();

  const clientes = carteira.data?.clientes ?? [];
  const clienteId = clienteEscolhido || clientes[0]?.id || '';
  const nomeCliente = clientes.find((c) => c.id === clienteId)?.nome ?? '';
  const metaAtual: MetaMes | null =
    metas.data?.find((m) => m.clientId === clienteId && m.ano === periodo.ano && m.mes === periodo.mes) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meta do mês e calculadora</h1>
        <p className="text-sm text-muted-foreground">
          A meta é fixa depois de definida. Alterações exigem motivo. O simulador não grava nada.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cliente-meta">Cliente</Label>
          <select
            id="cliente-meta"
            className={cn(campoSelect, 'w-72')}
            value={clienteId}
            onChange={(e) => setClienteEscolhido(e.target.value)}
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mes-meta">Mês</Label>
          <Input id="mes-meta" type="month" className="w-44" value={valorMes} onChange={(e) => setValorMes(e.target.value)} />
        </div>
      </div>

      {!clienteId && <p className="text-sm text-muted-foreground">Nenhum cliente ativo.</p>}

      {clienteId && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Meta de {mesPorExtenso(periodo.ano, periodo.mes)}</CardTitle>
              <CardDescription>{nomeCliente}</CardDescription>
            </CardHeader>
            <CardContent>
              <MetaDefinida
                key={`${clienteId}-${valorMes}-${metaAtual?.updatedAt ?? 'nova'}`}
                clienteId={clienteId}
                ano={periodo.ano}
                mes={periodo.mes}
                metaAtual={metaAtual}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simulador</CardTitle>
              <CardDescription>Sessões = orçamento ÷ CPS · Pedidos = sessões × conversão · Receita = pedidos × ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              <Simulador key={metaAtual ? `meta-${metaAtual.updatedAt}` : 'sem-meta'} premissasMeta={metaAtual?.premissas ?? null} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetaDefinida({
  clienteId,
  ano,
  mes,
  metaAtual,
}: {
  clienteId: string;
  ano: number;
  mes: number;
  metaAtual: MetaMes | null;
}) {
  const [modo, setModo] = useState<'ver' | 'criar' | 'alterar'>(metaAtual ? 'ver' : 'criar');

  if (modo === 'ver' && metaAtual) {
    return (
      <div className="space-y-4">
        <Table>
          <TableBody>
            <Linha rotulo="Meta de receita" valor={moeda(metaAtual.metaReceita)} />
            <Linha rotulo="Orçamento" valor={moeda(metaAtual.premissas.orcamento)} />
            <Linha rotulo="CPS" valor={moeda(metaAtual.premissas.cps, true)} />
            <Linha rotulo="Conversão" valor={percentualFracao(metaAtual.premissas.conversao)} />
            <Linha rotulo="Ticket médio" valor={moeda(metaAtual.premissas.ticket, true)} />
            <Linha rotulo="Pesos D1 / D2 / D3" valor={`${percentualFracao(metaAtual.pesos.d1)} / ${percentualFracao(metaAtual.pesos.d2)} / ${percentualFracao(metaAtual.pesos.d3)}`} />
            <Linha rotulo="Última alteração" valor={metaAtual.motivoAlteracao ? `${metaAtual.motivoAlteracao} (${metaAtual.updatedBy ?? '—'}, ${dataBr(metaAtual.updatedAt?.slice(0, 10) ?? null)})` : 'Definição original'} />
          </TableBody>
        </Table>
        <Button variant="outline" onClick={() => setModo('alterar')}>
          Alterar com motivo
        </Button>
      </div>
    );
  }

  return (
    <FormularioMeta
      clienteId={clienteId}
      ano={ano}
      mes={mes}
      metaAtual={modo === 'alterar' ? metaAtual : null}
      onConcluir={() => setModo('ver')}
      onCancelar={metaAtual ? () => setModo('ver') : undefined}
    />
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

interface CamposMeta {
  meta: string;
  orcamento: string;
  cps: string;
  conversao: string;
  ticket: string;
  d1: string;
  d2: string;
  d3: string;
  autor: string;
  motivo: string;
}

function camposIniciais(metaAtual: MetaMes | null): CamposMeta {
  if (!metaAtual) {
    return { meta: '', orcamento: '', cps: '', conversao: '', ticket: '', d1: '33', d2: '34', d3: '33', autor: '', motivo: '' };
  }
  return {
    meta: String(metaAtual.metaReceita),
    orcamento: String(metaAtual.premissas.orcamento),
    cps: String(metaAtual.premissas.cps),
    conversao: fracaoParaPercentual(metaAtual.premissas.conversao),
    ticket: String(metaAtual.premissas.ticket),
    d1: fracaoParaPercentual(metaAtual.pesos.d1),
    d2: fracaoParaPercentual(metaAtual.pesos.d2),
    d3: fracaoParaPercentual(metaAtual.pesos.d3),
    autor: '',
    motivo: '',
  };
}

/** Converte os campos do formulário em dados de meta. Null se algum número for inválido. */
function paraDados(campos: CamposMeta, clienteId: string, ano: number, mes: number): DadosMeta | null {
  const numeros = [campos.meta, campos.orcamento, campos.cps, campos.conversao, campos.ticket, campos.d1, campos.d2, campos.d3];
  if (numeros.some((valor) => valor.trim() === '' || !Number.isFinite(Number(valor)))) return null;
  const n = (valor: string) => Number(valor);
  return {
    clientId: clienteId,
    ano,
    mes,
    metaReceita: n(campos.meta),
    premissas: {
      orcamento: n(campos.orcamento),
      cps: n(campos.cps),
      conversao: n(campos.conversao) / 100,
      ticket: n(campos.ticket),
    },
    pesos: { d1: n(campos.d1) / 100, d2: n(campos.d2) / 100, d3: n(campos.d3) / 100 },
  };
}

function FormularioMeta({
  clienteId,
  ano,
  mes,
  metaAtual,
  onConcluir,
  onCancelar,
}: {
  clienteId: string;
  ano: number;
  mes: number;
  metaAtual: MetaMes | null;
  onConcluir: () => void;
  onCancelar?: () => void;
}) {
  const [campos, setCampos] = useState<CamposMeta>(() => camposIniciais(metaAtual));
  const [erros, setErros] = useState<string[]>([]);
  const criar = useCriarMeta();
  const alterar = useAlterarMeta();
  const alterando = metaAtual !== null;
  const ocupado = criar.isPending || alterar.isPending;

  const atualizar = (campo: keyof CamposMeta) => (e: ChangeEvent<HTMLInputElement>) =>
    setCampos((anterior) => ({ ...anterior, [campo]: e.target.value }));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const dados = paraDados(campos, clienteId, ano, mes);
    if (!dados) {
      setErros(['Preencha todos os campos numéricos.']);
      return;
    }
    // validarDadosMeta cobre pesos (somam 100%), premissas e meta > 0.
    const novosErros = validarDadosMeta(dados);
    if (!campos.autor.trim()) novosErros.push('Informe seu nome.');
    if (alterando && campos.motivo.trim().length < MOTIVO_MINIMO_CARACTERES) {
      novosErros.push(`Informe o motivo da alteração (mínimo ${MOTIVO_MINIMO_CARACTERES} caracteres).`);
    }
    setErros(novosErros);
    if (novosErros.length > 0) return;

    if (alterando) {
      alterar.mutate({ ...dados, autor: campos.autor.trim(), motivo: campos.motivo.trim() }, { onSuccess: onConcluir });
    } else {
      criar.mutate({ ...dados, autor: campos.autor.trim() }, { onSuccess: onConcluir });
    }
  };

  const erroServidor = criar.error ?? alterar.error;

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {alterando && (
        <p className="rounded-md border border-atencao/30 bg-atencao/10 p-3 text-sm">
          Meta já definida. A alteração fica registrada com o motivo, o autor e a data.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero id="meta" rotulo="Meta de receita (R$)" valor={campos.meta} onChange={atualizar('meta')} />
        <CampoNumero id="orcamento" rotulo="Orçamento (R$)" valor={campos.orcamento} onChange={atualizar('orcamento')} />
        <CampoNumero id="cps" rotulo="CPS (R$)" valor={campos.cps} onChange={atualizar('cps')} step="0.01" />
        <CampoNumero id="conversao" rotulo="Conversão (%)" valor={campos.conversao} onChange={atualizar('conversao')} step="0.01" />
        <CampoNumero id="ticket" rotulo="Ticket médio (R$)" valor={campos.ticket} onChange={atualizar('ticket')} step="0.01" />
        <CampoNumero id="d1" rotulo="Peso D1 (%)" valor={campos.d1} onChange={atualizar('d1')} step="0.01" />
        <CampoNumero id="d2" rotulo="Peso D2 (%)" valor={campos.d2} onChange={atualizar('d2')} step="0.01" />
        <CampoNumero id="d3" rotulo="Peso D3 (%)" valor={campos.d3} onChange={atualizar('d3')} step="0.01" />
        <div className="space-y-1.5">
          <Label htmlFor="autor">Responsável</Label>
          <Input id="autor" value={campos.autor} onChange={atualizar('autor')} placeholder="Seu nome" />
        </div>
      </div>
      {alterando && (
        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo da alteração</Label>
          <Input id="motivo" value={campos.motivo} onChange={atualizar('motivo')} placeholder="Ex.: verba aprovada pelo cliente em 20/10" />
        </div>
      )}

      {erros.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-critico">
          {erros.map((erro) => (
            <li key={erro}>{erro}</li>
          ))}
        </ul>
      )}
      {erroServidor && <p className="text-sm text-critico">{erroServidor.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={ocupado}>
          {alterando ? 'Salvar alteração' : 'Definir meta do mês'}
        </Button>
        {onCancelar && (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function CampoNumero({
  id,
  rotulo,
  valor,
  onChange,
  step = 'any',
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} type="number" inputMode="decimal" step={step} value={valor} onChange={onChange} />
    </div>
  );
}

function Simulador({ premissasMeta }: { premissasMeta: Premissas | null }) {
  const inicial = premissasMeta
    ? {
        orcamento: String(premissasMeta.orcamento),
        cps: String(premissasMeta.cps),
        conversao: fracaoParaPercentual(premissasMeta.conversao),
        ticket: String(premissasMeta.ticket),
      }
    : { orcamento: '25000', cps: '0.20', conversao: '0.53', ticket: '661.48' };
  const [campos, setCampos] = useState(inicial);

  const premissas: Premissas | null =
    campos.orcamento && campos.cps && campos.conversao && campos.ticket
      ? {
          orcamento: Number(campos.orcamento),
          cps: Number(campos.cps),
          conversao: Number(campos.conversao) / 100,
          ticket: Number(campos.ticket),
        }
      : null;

  let resultado: ReturnType<typeof simularMeta> | null = null;
  let erro: string | null = null;
  if (premissas) {
    try {
      resultado = simularMeta(premissas);
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Premissas inválidas.';
    }
  }

  const atualizar = (campo: keyof typeof campos) => (e: ChangeEvent<HTMLInputElement>) =>
    setCampos((anterior) => ({ ...anterior, [campo]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero id="sim-orcamento" rotulo="Orçamento (R$)" valor={campos.orcamento} onChange={atualizar('orcamento')} />
        <CampoNumero id="sim-cps" rotulo="CPS (R$)" valor={campos.cps} onChange={atualizar('cps')} step="0.01" />
        <CampoNumero id="sim-conversao" rotulo="Conversão (%)" valor={campos.conversao} onChange={atualizar('conversao')} step="0.01" />
        <CampoNumero id="sim-ticket" rotulo="Ticket médio (R$)" valor={campos.ticket} onChange={atualizar('ticket')} step="0.01" />
      </div>

      {erro && <p className="text-sm text-critico">{erro}</p>}
      {resultado && (
        <Table>
          <TableBody>
            <Linha rotulo="Sessões" valor={inteiro(resultado.sessoes)} />
            <Linha rotulo="Pedidos" valor={inteiro(resultado.pedidos)} />
            <Linha rotulo="Receita simulada" valor={moeda(resultado.receita)} />
            <Linha rotulo="ROAS" valor={`${decimal(resultado.roas)}×`} />
            <Linha rotulo="CPA" valor={moeda(resultado.cpa, true)} />
          </TableBody>
        </Table>
      )}

      {premissasMeta && (
        <Button variant="outline" size="sm" onClick={() => setCampos(inicial)}>
          Voltar às premissas da meta
        </Button>
      )}
    </div>
  );
}
