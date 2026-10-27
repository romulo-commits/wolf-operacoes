import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ROTULO_SITUACAO_META,
  clientesSemMetaLancada,
  montarQuadroControle,
  type ControleMeta,
  type SituacaoMeta,
} from '@/domain/controle-meta';
import type { MetaMes } from '@/domain/tipos';
import { dataBr } from '@/lib/formatar';

const CLASSE: Record<SituacaoMeta, string> = {
  sem_meta: 'bg-critico/15 text-critico border-critico/30',
  nao_lancada: 'bg-atencao/15 text-atencao border-atencao/30',
  lancada: 'bg-ok/15 text-ok border-ok/30',
};

export function ListaSemMeta({
  clientes,
  metas,
  controles,
  ano,
  mes,
  onEscolher,
}: {
  clientes: Array<{ id: string; nome: string }>;
  metas: MetaMes[];
  controles: ControleMeta[];
  ano: number;
  mes: number;
  onEscolher: (clientId: string) => void;
}) {
  const linhas = montarQuadroControle(clientes, metas, controles, ano, mes);
  const pendentes = clientesSemMetaLancada(linhas);
  const nomes = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]));
  const lancadas = linhas.length - pendentes.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes sem meta lançada</CardTitle>
        <CardDescription>
          Processo 1: a meta só sai desta lista quando está definida e lançada na Adstart e no WolfOS, com data.{' '}
          {lancadas} de {linhas.length} já {lancadas === 1 ? 'está lançada' : 'estão lançadas'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendentes.length === 0 ? (
          <p className="text-sm text-ok">Nenhum cliente deste mês está sem meta lançada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Adstart</TableHead>
                <TableHead>WolfOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.map((linha) => (
                <TableRow key={linha.clientId}>
                  <TableCell>
                    <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => onEscolher(linha.clientId)}>
                      {nomes.get(linha.clientId) ?? linha.clientId}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge className={CLASSE[linha.situacao]}>{ROTULO_SITUACAO_META[linha.situacao]}</Badge>
                  </TableCell>
                  <TableCell>{linha.adstartLancada ? `Sim · ${dataBr(linha.adstartData)}` : 'Não'}</TableCell>
                  <TableCell>{linha.wolfosLancada ? `Sim · ${dataBr(linha.wolfosData)}` : 'Não'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
