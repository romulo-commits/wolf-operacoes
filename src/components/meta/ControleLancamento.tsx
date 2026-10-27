import { useState } from 'react';
import { CampoData } from '@/components/campos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { ControleMeta, RegistroLancamento } from '@/domain/controle-meta';
import { registroVazio } from '@/domain/plano-midia';
import { useRegistrarControle } from '@/hooks/consultas';
import { dataBr } from '@/lib/formatar';

function CampoLancamento({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: RegistroLancamento;
  onChange: (valor: RegistroLancamento) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4"
          checked={valor.lancada}
          onChange={(e) => onChange({ lancada: e.target.checked, data: e.target.checked ? valor.data : null })}
        />
        {rotulo}
      </label>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-data`}>Data</Label>
        <CampoData
          id={`${id}-data`}
          disabled={!valor.lancada}
          valor={valor.data}
          onChange={(data) => onChange({ lancada: true, data })}
        />
      </div>
    </div>
  );
}

/** Marca o lançamento da meta. Não grava em cima da meta do mês. */
export function ControleLancamento({
  clientId,
  ano,
  mes,
  controle,
}: {
  clientId: string;
  ano: number;
  mes: number;
  controle: ControleMeta | null;
}) {
  const [adstart, setAdstart] = useState<RegistroLancamento>(controle?.adstart ?? registroVazio());
  const [wolfos, setWolfos] = useState<RegistroLancamento>(controle?.wolfos ?? registroVazio());
  const [erro, setErro] = useState<string | null>(null);
  const registrar = useRegistrarControle();

  const salvar = () => {
    setErro(null);
    registrar.mutate(
      { clientId, ano, mes, adstart, wolfos },
      { onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível registrar.') },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle de lançamento</CardTitle>
        <CardDescription>
          Meta lançada na Adstart e no WolfOS, com data. Registrar aqui não altera a meta já definida no início do mês.
          {controle?.updatedAt ? ` Último registro em ${dataBr(controle.updatedAt.slice(0, 10))}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoLancamento id="lancada-adstart" rotulo="Lançada na Adstart" valor={adstart} onChange={setAdstart} />
          <CampoLancamento id="lancada-wolfos" rotulo="Lançada no WolfOS" valor={wolfos} onChange={setWolfos} />
        </div>
        {erro && <p className="text-sm text-critico">{erro}</p>}
        <Button type="button" onClick={salvar} disabled={registrar.isPending}>
          Registrar lançamento
        </Button>
      </CardContent>
    </Card>
  );
}
