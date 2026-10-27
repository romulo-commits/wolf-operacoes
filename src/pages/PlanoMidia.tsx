import { useState } from 'react';
import { PainelPlano } from '@/components/plano/PainelPlano';
import { Input, campoSelect } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCarteira } from '@/hooks/consultas';
import { mesParaInput, parseMesInput } from '@/lib/formatar';
import { cn } from '@/lib/utils';

export function PlanoMidia() {
  const hoje = new Date();
  const [valorMes, setValorMes] = useState(() => mesParaInput(hoje.getFullYear(), hoje.getMonth() + 1));
  const [clienteEscolhido, setClienteEscolhido] = useState('');
  const periodo = parseMesInput(valorMes) ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const carteira = useCarteira(periodo.ano, periodo.mes);
  const clientes = carteira.data?.clientes ?? [];
  const clienteId = clienteEscolhido || clientes[0]?.id || '';
  const nome = clientes.find((cliente) => cliente.id === clienteId)?.nome ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plano de mídia mensal</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Anatomia do planejamento, um quadro por cliente e mês: meta, pedidos, sessões, pilares, meta diária, calendário, aquisição e criativos. O fluxo segue até o lançamento. A meta já definida no mês não é alterada.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cliente-plano">Cliente</Label>
          <select id="cliente-plano" className={cn(campoSelect, 'w-72')} value={clienteId} onChange={(e) => setClienteEscolhido(e.target.value)}>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mes-plano">Mês</Label>
          <Input id="mes-plano" type="month" className="w-44" value={valorMes} onChange={(e) => setValorMes(e.target.value)} />
        </div>
      </div>
      {clienteId ? (
        <PainelPlano clientId={clienteId} ano={periodo.ano} mes={periodo.mes} nome={nome} />
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum cliente ativo.</p>
      )}
    </div>
  );
}
