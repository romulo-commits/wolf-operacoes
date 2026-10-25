-- =============================================================================
-- PROPOSTA — NÃO APLICAR.
-- Esta tabela não existe em nenhum banco. A F0 não conecta em banco algum.
-- Se a demonstração for aprovada, o Augusto cria esta tabela DENTRO da
-- estrutura do WOLFOS e anexa o app (ver docs/ENTREGA_AUGUSTO.md).
-- =============================================================================

-- Receita oficial aprovada, lançada pelo analista (Adstart ou plataforma).
-- O GA4 é comparado a esta receita (índice de confiabilidade do tracking),
-- nunca o contrário.
create table public.lancamentos_receita (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null,                       -- clients.id do core WOLFOS
  periodo_inicio    date not null,
  periodo_fim       date not null,
  pedidos_aprovados integer not null check (pedidos_aprovados >= 0),
  receita_aprovada  numeric(14, 2) not null check (receita_aprovada >= 0),
  fonte             text not null check (fonte in ('adstart', 'plataforma')),
  lancado_por       text not null,                       -- ou uuid de auth.users, a definir com o Augusto
  created_at        timestamptz not null default now(),
  constraint lancamentos_receita_periodo_ok check (periodo_fim >= periodo_inicio)
);

create index lancamentos_receita_cliente_periodo_idx
  on public.lancamentos_receita (client_id, periodo_inicio);

-- Append-only: o app não edita nem exclui lançamentos nesta versão.
alter table public.lancamentos_receita enable row level security;
revoke update, delete on public.lancamentos_receita from anon, authenticated;

-- Policies de RLS: a definir com o Augusto (papéis de performance).
-- Sem policy, a tabela fica inacessível para o app.
