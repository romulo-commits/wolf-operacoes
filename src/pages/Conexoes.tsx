import { BadgeSync } from '@/components/status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { inteiro } from '@/lib/formatar';
import { useCarteira } from '@/hooks/consultas';

const ROTULO_PLATAFORMA: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  ga4: 'GA4',
  gsc: 'Search Console',
};

const SEM_DADO = Number.MAX_SAFE_INTEGER;

export function Conexoes() {
  const hoje = new Date();
  const carteira = useCarteira(hoje.getFullYear(), hoje.getMonth() + 1);
  const dados = carteira.data;
  const nomes = new Map((dados?.clientes ?? []).map((c): [string, string] => [c.id, c.nome]));

  // Sem dado vai para o topo; depois, o maior atraso.
  const linhas = [...(dados?.syncPlataformas ?? [])].sort(
    (a, b) => (b.diasAtraso ?? SEM_DADO) - (a.diasAtraso ?? SEM_DADO),
  );

  const contagem = { emDia: 0, atencao: 0, critico: 0, semDado: 0 };
  for (const l of linhas) {
    if (l.diasAtraso === null) contagem.semDado++;
    else if (l.diasAtraso <= 1) contagem.emDia++;
    else if (l.diasAtraso < 8) contagem.atencao++;
    else contagem.critico++;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conexões e saúde do sync</h1>
        <p className="text-sm text-muted-foreground">
          Leitura da v_sync_saude do WOLFOS (somente leitura). A saúde não é recalculada aqui: só classificada pelos dias de
          atraso. Em dia até 1 dia, atenção de 2 a 7, crítico a partir de 8.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo titulo="Em dia" valor={contagem.emDia} />
        <Resumo titulo="Atenção (2 a 7 dias)" valor={contagem.atencao} />
        <Resumo titulo="Crítico (8+ dias)" valor={contagem.critico} />
        <Resumo titulo="Sem dado" valor={contagem.semDado} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conexões por cliente</CardTitle>
          <CardDescription>
            {dados?.fonte === 'exemplo' ? 'Dados de exemplo. ' : ''}Ordenado pelos casos mais graves.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carteira.isLoading && <p className="text-sm text-muted-foreground">Carregando conexões…</p>}
          {carteira.error && (
            <p className="text-sm text-critico">Erro ao carregar conexões: {(carteira.error as Error).message}</p>
          )}
          {dados && linhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conexão encontrada.</p>}
          {linhas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Último dado</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={`${l.clientId}-${l.platform}`}>
                    <TableCell className="font-medium">{nomes.get(l.clientId) ?? l.clientId}</TableCell>
                    <TableCell>{ROTULO_PLATAFORMA[l.platform] ?? l.platform}</TableCell>
                    <TableCell>{l.ultimaDataComDado ?? '—'}</TableCell>
                    <TableCell className="text-right">{l.diasAtraso === null ? '—' : `${inteiro(l.diasAtraso)} d`}</TableCell>
                    <TableCell>
                      <BadgeSync diasAtraso={l.diasAtraso} erro={l.erro} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{l.erro ?? '—'}</TableCell>
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

function Resumo({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-2xl">{inteiro(valor)}</CardTitle>
      </CardHeader>
    </Card>
  );
}
