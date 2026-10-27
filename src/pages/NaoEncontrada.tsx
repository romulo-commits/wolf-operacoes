import { Link } from 'react-router-dom';

export function NaoEncontrada({ mensagem = 'Página não encontrada.' }: { mensagem?: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{mensagem}</h1>
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        Voltar ao quadro da carteira
      </Link>
    </div>
  );
}
