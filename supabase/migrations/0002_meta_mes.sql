-- =============================================================================
-- PROPOSTA — NÃO APLICAR.
-- Esta tabela não existe em nenhum banco. A F0 não conecta em banco algum.
-- Se a demonstração for aprovada, o Augusto cria esta tabela DENTRO da
-- estrutura do WOLFOS e anexa o app (ver docs/ENTREGA_AUGUSTO.md).
-- =============================================================================

-- Meta do mês. Depois de definida, ela é FIXA: só muda por edição manual
-- explícita, com motivo (a trigger abaixo recusa alteração sem motivo).
create table public.meta_mes (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null,                        -- clients.id do core WOLFOS
  ano              integer not null check (ano between 2000 and 2100),
  mes              integer not null check (mes between 1 and 12),
  meta_receita     numeric(14, 2) not null check (meta_receita > 0),
  -- Premissas da meta: { "orcamento": n, "cps": n, "conversao": fração, "ticket": n }
  premissas        jsonb not null,
  -- Pesos por decêndio (frações que somam 1): D1 = dias 1–10, D2 = 11–20, D3 = 21 até o fim
  d1               numeric(7, 6) not null check (d1 >= 0),
  d2               numeric(7, 6) not null check (d2 >= 0),
  d3               numeric(7, 6) not null check (d3 >= 0),
  motivo_alteracao text,                                 -- preenchido em toda alteração
  updated_by       text,                                 -- ou uuid de auth.users, a definir
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint meta_mes_unica unique (client_id, ano, mes),
  constraint meta_mes_pesos_somam_um check (abs(d1 + d2 + d3 - 1) < 0.000001),
  constraint meta_mes_premissas_completas check (
    (premissas ->> 'orcamento') is not null
    and (premissas ->> 'cps') is not null
    and (premissas ->> 'conversao') is not null
    and (premissas ->> 'ticket') is not null
  )
);

-- Trava de meta fixa: qualquer mudança em meta, premissas ou pesos exige motivo.
create or replace function public.meta_mes_trava_edicao()
returns trigger
language plpgsql
as $$
begin
  if (new.meta_receita, new.premissas, new.d1, new.d2, new.d3)
     is distinct from (old.meta_receita, old.premissas, old.d1, old.d2, old.d3) then
    if coalesce(btrim(new.motivo_alteracao), '') = '' then
      raise exception 'Meta fixa: alterar meta, premissas ou pesos exige motivo_alteracao';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger meta_mes_trava_edicao
  before update on public.meta_mes
  for each row execute function public.meta_mes_trava_edicao();

alter table public.meta_mes enable row level security;
-- Policies de RLS: a definir com o Augusto. Sem policy, a tabela fica inacessível para o app.
