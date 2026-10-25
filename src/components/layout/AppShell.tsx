import { BarChart3, CalendarRange, Cable, Receipt, Calculator } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { obterLeiturasWolfos } from '@/data/wolfos/conexao';
import { cn } from '@/lib/utils';

const navegacao = [
  { to: '/', rotulo: 'Quadro da carteira', icone: BarChart3, fim: true },
  { to: '/meta', rotulo: 'Meta do mês', icone: Calculator, fim: false },
  { to: '/lancamentos', rotulo: 'Lançamento de receita', icone: Receipt, fim: false },
  { to: '/conexoes', rotulo: 'Conexões', icone: Cable, fim: false },
];

export function AppShell() {
  const semCredenciais = obterLeiturasWolfos() === null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <CalendarRange className="h-5 w-5" aria-hidden />
          <span className="font-semibold tracking-tight">Wolf Operações</span>
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Principal">
          {navegacao.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.fim}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              <item.icone className="h-4 w-4" aria-hidden />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-card md:hidden">
          <nav className="flex gap-1 overflow-x-auto p-2" aria-label="Principal (celular)">
            {navegacao.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.fim}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="border-b bg-muted/60 px-6 py-2 text-xs text-muted-foreground" role="note">
          <strong className="font-semibold text-foreground">Demonstração.</strong>{' '}
          {semCredenciais
            ? 'Dados de exemplo: sem credenciais do WOLFOS (VITE_WOLFOS_*). '
            : 'Leitura do WOLFOS (somente leitura). '}
          Metas e lançamentos ficam neste navegador até o banco próprio ser criado.
        </div>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
