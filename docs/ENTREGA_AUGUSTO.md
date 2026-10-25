# Wolf Operações: entrega F0 para o Augusto

## 1. O que é

Área de Performance para acompanhar as metas de e-commerce dos clientes da Wolf: visão diária, por decêndio (10 dias) e mensal/anual. Substitui as planilhas de Projeção de Meta, Calculadora, Histórico de Metas, Resumo Executivo e Painel Anual, que hoje são cinco abas com a mesma base cliente × mês.

Esta entrega (F0) é uma **demonstração**. Ela roda com dados de exemplo e não grava em banco nenhum. Serve para validar as regras e as telas antes de virar parte do WOLFOS.

## 2. Arquitetura

```
Front (Vite + React + TS + Tailwind + shadcn + TanStack Query)
   │
   ├── Leitura do WOLFOS (somente select)
   │     wolfos-dev  → clients (ativos), pdas (pendentes, fora da lixeira)
   │     wolfos-ads  → v_sync_saude, v_analytics_diario (GA4)
   │
   └── Metas e lançamentos (repositório local, src/data/local/)
         hoje: localStorage + seed editável
         depois: tabelas próprias no WOLFOS (seção 4), mesma interface
```

- **Domínio puro** (`src/domain/`): calculadora, projeção por peso acumulado de decêndio, gap, meta diária necessária, índice GA4 × receita lançada, grade G0–G3, alertas. Sem I/O. Testado com vitest.
- **Telas** (`src/pages/`): só leem e apresentam. A conta mora no domínio.
- **Nada é calculado e guardado.** Realizado, projeção, gap, % atingido, grade, alertas e decêndios são sempre calculados na hora, a partir da meta e dos lançamentos.

## 3. Regra somente leitura

Os bancos existentes do WOLFOS (`wolfos-ads` e `wolfos-dev`) são **somente leitura** para este app.

O que o código faz:
- Só usa `select` (com filtros, ordenação e paginação por intervalo).
- A camada de leitura (`src/data/wolfos/leitura.ts`) expõe um único método, `selecionarTodos`. O cliente Supabase não sai dali.

O que o código nunca faz:
- Nenhum `insert`, `update`, `upsert`, `delete` ou `rpc` contra o WOLFOS.
- Não cria papel, view ou função nos bancos.

Como isso é garantido:
- `src/data/wolfos/leitura.test.ts` falha se algum arquivo da camada tiver `.insert(`, `.update(`, `.upsert(`, `.delete(` ou `.rpc(`.
- O mesmo teste executa a leitura contra um cliente falso e confirma que só as chamadas de consulta acontecem.

Sem credenciais, o app usa dados de exemplo (`src/data/wolfos/exemplo.ts`) e avisa isso na tela.

## 4. As duas tabelas propostas (não aplicadas)

As duas tabelas existem **só como SQL em `supabase/migrations/`**. Nenhuma foi aplicada em banco. Os arquivos são propostas para o Augusto revisar.

### 4.1 `lancamentos_receita` (`0001_lancamentos_receita.sql`)

Receita oficial aprovada, lançada pelo analista.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | chave primária |
| `client_id` | uuid | `clients.id` do core WOLFOS |
| `periodo_inicio`, `periodo_fim` | date | fim ≥ início |
| `pedidos_aprovados` | integer | ≥ 0 |
| `receita_aprovada` | numeric(14,2) | ≥ 0 |
| `fonte` | text | `adstart` ou `plataforma` |
| `lancado_por` | text | a definir: texto ou uuid de `auth.users` |
| `created_at` | timestamptz | |

Regras: append-only (o app não edita nem exclui; `revoke update, delete`). RLS ligada, sem policy ainda.

### 4.2 `meta_mes` (`0002_meta_mes.sql`)

Meta do mês. É fixa depois de definida.

| Campo | Tipo | Observação |
|---|---|---|
| `client_id`, `ano`, `mes` | uuid, int, int | `unique (client_id, ano, mes)` |
| `meta_receita` | numeric(14,2) | > 0 |
| `premissas` | jsonb | `orcamento`, `cps`, `conversao` (fração), `ticket` |
| `d1`, `d2`, `d3` | numeric(7,6) | pesos por decêndio, somam 1 |
| `motivo_alteracao` | text | obrigatório em qualquer alteração |
| `updated_by` | text | a definir: texto ou uuid |
| `created_at`, `updated_at` | timestamptz | |

Trava: trigger `before update` recusa mudança em meta, premissas ou pesos sem `motivo_alteracao`.

### 4.3 Calculados (não são tabela)

Realizado do mês, % atingido, projeção de fechamento, gap, meta diária necessária, decêndios, índice GA4 × receita lançada, grade G0–G3, alertas. Tudo sai da meta, dos lançamentos e das leituras do WOLFOS.

## 5. O que você precisaria criar ou anexar

Se a demonstração for aprovada:

1. **Criar** as duas tabelas acima dentro do WOLFOS (migrations `0001` e `0002`, com revisão das decisões em aberto da seção 8).
2. **Definir RLS e policies** para os papéis de performance (hoje não há nenhuma).
3. **Anexar o front** ao WOLFOS e trocar `src/data/local/` pela implementação Supabase, mantendo a mesma interface (`RepositorioMetas`, `RepositorioLancamentos`).
4. **Confirmar as colunas de leitura** (seção 7) contra o banco real.
5. **Confirmar a matriz da grade** (`src/domain/grade-config.ts`) com a Wolf.

Nada disso precisa de alteração nas tabelas existentes do WOLFOS. Só as duas tabelas novas.

## 6. Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `VITE_WOLFOS_ADS_URL` | URL do projeto `wolfos-ads` |
| `VITE_WOLFOS_ADS_KEY` | Chave pública (anon/publishable) do `wolfos-ads` |
| `VITE_WOLFOS_DEV_URL` | URL do projeto `wolfos-dev` |
| `VITE_WOLFOS_DEV_KEY` | Chave pública (anon/publishable) do `wolfos-dev` |

Sem as quatro, o app roda com dados de exemplo. Use a chave pública com RLS ativa, nunca a service role.

## 7. Leituras do WOLFOS usadas

Os nomes vêm do inventário de 25/10/2026. Os pontos marcados com **[?]** precisam ser confirmados contra o banco real antes de produção.

| Banco | Origem | Colunas | Filtro |
|---|---|---|---|
| wolfos-dev | `clients` | `id`, `name` | `status = 'active'` |
| wolfos-dev | `pdas` | `client_id`, `due_date` | `status = 'pendente'`, `trashed = false` **[?]** |
| wolfos-ads | `v_sync_saude` | `client_id`, `platform`, `dias_atrasado`, `last_sync_error`, `ultima_data_com_dado` | sem filtro |
| wolfos-ads | `v_analytics_diario` | `client_id`, `date`, `revenue` | `date` no mês e até hoje |

Pontos a conferir:
- **Paginação:** a leitura pagina por intervalo ordenado por uma coluna que não é única (`name`, `client_id`, `date`). Em produção, usar chave única ou janela estável.
- **`v_analytics_diario`** tem uma linha por canal × dia. O app soma os canais.
- **`pdas`:** a contagem segue o inventário (pendentes fora da lixeira). A regra de "vencida" é `due_date` anterior a hoje.

## 8. Decisões em aberto

1. **Variação contra o ano anterior** compara a receita lançada deste ano com a receita lançada do mesmo mês do ano anterior. Hoje isso exige lançar os meses de 2025. Alternativa: usar a receita do GA4 do ano anterior, mas a comparação fica inconsistente com a receita oficial.
2. **Matriz da grade G0–G3** é uma proposta (`src/domain/grade-config.ts`). Faixas: A ≥ 0%; B de −5% a 0%; C de −15% a −5%; D abaixo de −15%. Eixos: atingimento da meta (projeção ÷ meta − 1) × variação contra o ano anterior.
3. **Tolerância do tracking** é ±10% (`TOLERANCIA_TRACKING`). Pode virar configuração por cliente.
4. **Pesos por decêndio** da Argennti são placeholder (33/34/33). Usar o histórico de receita do piloto.
5. **`lancado_por` e `updated_by`:** texto livre ou uuid de `auth.users`.
6. **Realizado e projeção** usam a receita lançada. Se a receita oficial vier do Shopify ou de outra fonte, o lançamento continua sendo o ponto de entrada.

## 9. Como trocar o seed (metas de exemplo)

Arquivo: `src/data/local/seed.ts`.

- As metas de `sementeMetas()` são a base da demonstração. Para a Argennti, o seed já traz a meta de out/2026 do inventário (2.414.531) e o orçamento (577.000). CPS, conversão e ticket são médias de jul–set/2026. Os pesos e os clientes de exemplo A e B são placeholders.
- Para trocar: edite os valores mantendo a forma. A validação roda ao salvar (`validarDadosMeta`).
- Se o localStorage já tiver dados, o seed só entra na primeira leitura. Para recarregar, limpe a chave `wolf-operacoes:metas:v1` do navegador.

## 10. Próximos passos (F1)

1. Validar as regras com o Augusto e com a equipe de performance: projeção, grade e tolerância.
2. Criar as tabelas no WOLFOS e trocar o repositório local pelo Supabase.
3. Piloto com a Argennti: lançar os meses de 2026 (e 2025, para a variação) e comparar com a planilha fechada.
4. Fechar as pendências da seção 7 contra o banco real.
5. Diagnóstico real × projetado por motor (CPS, investimento, conversão, ticket) na página do cliente.
6. Alertas diários e PDAs por área.
7. Aplicar o design final, quando a skill "WolfOS Design Propagation" estiver disponível.

## 11. Verificação desta entrega

- Testes unitários: `npm test` (domínio, repositório local, camada de leitura e dados de exemplo).
- Build: `npm run build` (checagem de tipos com `tsc -b` e build do Vite).
- Esta entrega foi escrita sem executar o build nem os testes no ambiente de origem (o Node não estava instalado). **Rodar `npm install && npm test && npm run build` antes de revisar.**
