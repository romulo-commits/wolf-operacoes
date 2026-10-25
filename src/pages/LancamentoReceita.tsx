import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, campoSelect } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { validarLancamento, type NovoLancamento } from '@/data/local/repositorio';
import type { FonteLancamento } from '@/domain/tipos';
import { dataBr, inteiro, moeda } from '@/lib/formatar';
import { useCarteira, useCriarLancamento, useLancamentos } from '@/hooks/consultas';

interface Campos {
  clientId: string;
  periodoInicio: string;
  periodoFim: string;
  pedidos: string;
  receita: string;
  fonte: FonteLancamento;
  lancadoPor: string;
}

const CAMPOS_VAZIOS: Campos = {
  clientId: '',
  periodoInicio: '',
  periodoFim: '',
  pedidos: '',
  receita: '',
  fonte: 'plataforma',
  lancadoPor: '',
};

export function LancamentoReceita() {
  const hoje = new Date();
  const carteira = useCarteira(hoje.getFullYear(), hoje.getMonth() + 1);
  const lancamentos = useLancamentos();
  const criar = useCriarLancamento();

  const clientes = carteira.data?.clientes ?? [];
  const [campos, setCampos] = useState<Campos>(CAMPOS_VAZIOS);
  const [erros, setErros] = useState<string[]>([]);
  const [salvo, setSalvo] = useState<string | null>(null);

  const atualizar = (campo: keyof Campos) => (valor: string) => setCampos((anterior) => ({ ...anterior, [campo]: valor }));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setSalvo(null);
    const clienteId = campos.clientId || clientes[0]?.id || '';
    const camposObrigatorios = [campos.periodoInicio, campos.periodoFim, campos.pedidos, campos.receita, campos.lancadoPor];
    if (camposObrigatorios.some((valor) => valor.trim() === '')) {
      setErros(['Preencha todos os campos.']);
      return;
    }

    const novo: NovoLancamento = {
      clientId: clienteId,
      periodoInicio: campos.periodoInicio,
      periodoFim: campos.periodoFim,
      pedidosAprovados: Number(campos.pedidos),
      receitaAprovada: Number(campos.receita),
      fonte: campos.fonte,
      lancadoPor: campos.lancadoPor.trim(),
    };
    const novosErros = validarLancamento(novo);
    setErros(novosErros);
    if (novosErros.length > 0) return;

    criar.mutate(novo, {
      onSuccess: () => {
        setSalvo('Lançamento salvo. O quadro e a projeção já usam este valor.');
        setCampos((anterior) => ({ ...anterior, periodoInicio: '', periodoFim: '', pedidos: '', receita: '' }));
      },
    });
  };

  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;
  const historico = [...(lancamentos.data ?? [])].sort((a, b) => b.periodoInicio.localeCompare(a.periodoInicio));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lançamento de receita</h1>
        <p className="text-sm text-muted-foreground">
          Receita aprovada oficial, lançada pelo analista a partir do Adstart ou da plataforma. O GA4 é comparado a ela, e
          nunca o contrário. Lançamentos não são editados nem excluídos nesta versão.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
          <CardDescription>Um período por lançamento (ex.: decêndio ou mês).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" noValidate>
            <div className="space-y-1.5 xl:col-span-2">
              <Label htmlFor="lanc-cliente">Cliente</Label>
              <select
                id="lanc-cliente"
                className={campoSelect}
                value={campos.clientId || clientes[0]?.id || ''}
                onChange={(e) => atualizar('clientId')(e.target.value)}
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-fonte">Fonte</Label>
              <select
                id="lanc-fonte"
                className={campoSelect}
                value={campos.fonte}
                onChange={(e) => atualizar('fonte')(e.target.value)}
              >
                <option value="plataforma">Plataforma</option>
                <option value="adstart">Adstart</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-responsavel">Lançado por</Label>
              <Input id="lanc-responsavel" value={campos.lancadoPor} onChange={(e) => atualizar('lancadoPor')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-inicio">Início do período</Label>
              <Input id="lanc-inicio" type="date" value={campos.periodoInicio} onChange={(e) => atualizar('periodoInicio')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-fim">Fim do período</Label>
              <Input id="lanc-fim" type="date" value={campos.periodoFim} onChange={(e) => atualizar('periodoFim')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-pedidos">Pedidos aprovados</Label>
              <Input id="lanc-pedidos" type="number" min={0} step={1} inputMode="numeric" value={campos.pedidos} onChange={(e) => atualizar('pedidos')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lanc-receita">Receita aprovada (R$)</Label>
              <Input id="lanc-receita" type="number" min={0} step="0.01" inputMode="decimal" value={campos.receita} onChange={(e) => atualizar('receita')(e.target.value)} />
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 xl:col-span-4">
              {erros.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-critico">
                  {erros.map((erro) => (
                    <li key={erro}>{erro}</li>
                  ))}
                </ul>
              )}
              {criar.error && <p className="text-sm text-critico">{criar.error.message}</p>}
              {salvo && <p className="text-sm text-ok">{salvo}</p>}
              <div>
                <Button type="submit" disabled={criar.isPending || clientes.length === 0}>
                  Salvar lançamento
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Mais recentes primeiro.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead>Lançado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{nomeCliente(l.clientId)}</TableCell>
                  <TableCell>
                    {dataBr(l.periodoInicio)} a {dataBr(l.periodoFim)}
                  </TableCell>
                  <TableCell className="capitalize">{l.fonte}</TableCell>
                  <TableCell className="text-right">{inteiro(l.pedidosAprovados)}</TableCell>
                  <TableCell className="text-right">{moeda(l.receitaAprovada, true)}</TableCell>
                  <TableCell>{l.lancadoPor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
