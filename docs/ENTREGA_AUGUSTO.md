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
   │     wolfos-ads  → v_sync_saude, v_analytics_diario (GA4), v_metrics_daily (investimento)
   │
   └── Metas e lançamentos (repositório local, src/data/local/)
         hoje: localStorage + seed editável
         depois: tabelas próprias no WOLFOS (seção 4), mesma interface
```

- **Domínio puro** (`src/domain/`): calculadora, projeção por peso acumulado de decêndio com pesos históricos do ano anterior (receita, investimento, sessões e pedidos, cada um com os seus), gap, ritmo necessário por dia (ponderado), índice GA4 × receita lançada, grade G0–G3, alertas. Sem I/O. Testado com vitest.
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
| `d1`, `d2`, `d3` | numeric(7,6) | pesos por decêndio de reserva (fallback sem histórico), somam 1 |
| `motivo_alteracao` | text | obrigatório em qualquer alteração |
| `updated_by` | text | a definir: texto ou uuid |
| `created_at`, `updated_at` | timestamptz | |

Trava: trigger `before update` recusa mudança em meta, premissas ou pesos sem `motivo_alteracao`.

### 4.3 Calculados (não são tabela)

Realizado do mês, % atingido, projeção de fechamento, gap, ritmo necessário por dia (ponderado), decêndios, acompanhamento de investimento, sessões e pedidos, índice GA4 × receita lançada, grade G0–G3, alertas. Tudo sai da meta, dos lançamentos e das leituras do WOLFOS.

### 4.4 Pesos históricos (projeção, decêndios e ritmo necessário por dia)

Mesma regra da planilha "Projeção de Meta" (Rei da Cutelaria), aba *PESOS POR DECÊNDIO — BASE HISTÓRICA*. Código em `src/domain/pesos.ts`.

1. **Pesos do decêndio** = participação de D1 (dias 1–10), D2 (11–20) e D3 (21–fim) na receita GA4 do **mesmo mês do ano anterior** (`v_analytics_diario`, canais somados por dia).
2. **Peso do dia** = peso do decêndio ÷ nº de dias do decêndio. Ex.: outubro com 37,5 / 28,7 / 33,8 → 3,75% por dia em D1 e 33,8% ÷ 11 em D3; o acumulado no dia 11 dá 40,4% e no dia 21 dá 69,3%, como na planilha.
   - Escolha: o histórico é agregado por decêndio, não usado dia a dia, porque é o que a planilha faz e porque os dias da semana e o tamanho do mês mudam de um ano para o outro (fevereiro bissexto). O D3 vai sempre do dia 21 ao fim do mês corrente.
3. **Projeção de fechamento** = realizado ÷ peso acumulado até o último dia fechado.
4. **Meta por decêndio** = meta do mês × peso do decêndio.
5. **Ritmo necessário por dia** (sempre o ponderado) de cada dia restante = (meta − realizado) × peso do dia ÷ soma dos pesos dos dias restantes. O quadro mostra o valor do próximo dia; a página do cliente mostra a lista de todos os dias restantes. Não há média simples (falta ÷ dias restantes) em nenhuma tela.
6. **Aceleração** = (falta ÷ peso restante) ÷ (realizado ÷ peso acumulado). Acima de 1 = precisa acelerar.
7. **Fallback:** sem histórico suficiente (total ≤ 0, menos de 80% dos dias do mês com dado, ou um decêndio sem dado), usa os pesos `d1`/`d2`/`d3` da `meta_mes`, divididos igualmente pelos dias de cada decêndio. A tela mostra a origem ("Histórico ano ant." ou "Pesos da meta").

A meta do mês não muda: os pesos só distribuem a meta fixada.

### 4.5 Investimento, sessões e pedidos (pesos próprios)

Como na planilha, cada métrica tem os seus pesos por decêndio, com a mesma regra e o **fallback avaliado separadamente** (uma métrica pode usar o histórico e outra os pesos da meta). Código em `src/domain/metricas.ts`.

| Métrica | Meta do mês (premissas da calculadora) | Realizado (até o último dia fechado) | Histórico dos pesos (mesmo mês do ano anterior) |
|---|---|---|---|
| Receita | `meta_mes.meta_receita` | receita aprovada lançada | `v_analytics_diario.revenue` |
| Investimento | orçamento | `v_metrics_daily.spend`, soma das fontes configuradas (hoje Meta + Google; seção 4.6) | idem, mesmo mês do ano anterior |
| Sessões | orçamento ÷ CPS | `v_analytics_diario.sessions` | `v_analytics_diario.sessions` |
| Pedidos (GA4) | sessões × conversão | `v_analytics_diario.transactions` (transações do GA4) | `v_analytics_diario.transactions` |

**Pedidos (decidido):** o acompanhamento diário, a projeção e o ritmo de pedidos usam as **transações do GA4**, com o rótulo "Pedidos (GA4)" na tela. Sem transações no mês, a métrica fica sem dado (não cai nos lançamentos). Os **pedidos aprovados lançados** continuam nos lançamentos, como contexto da receita oficial e da confiabilidade do tracking.

Para cada uma: esperado até ontem = meta × peso acumulado; projeção = realizado ÷ peso acumulado; projeção ÷ meta; ritmo necessário por dia ponderado; metas por decêndio. A página do cliente mostra a tabela por métrica com o selo de pesos de cada uma, as metas por decêndio das quatro e o ritmo necessário de cada dia restante para as quatro. O quadro (aba Diário) mostra o investimento projetado ÷ orçamento com o selo de pesos do investimento.

### 4.6 Fontes de investimento (configuráveis)

Por enquanto o investimento soma **Meta e Google**. As fontes ficam em `src/config/investimento.ts` (`FONTES_INVESTIMENTO`), cada uma com `id`, `rotulo`, `origem` (view lida) e `platform` (valor da coluna `platform` na origem). Essa lista é usada:

- na **leitura** (`lerInvestimento` em `src/data/wolfos/carteira.ts`): um select por origem, filtrando `platform` pelas plataformas configuradas e marcando cada linha com o `id` da fonte;
- no **cálculo** (`montarLinhasCarteira`): soma só as fontes configuradas no realizado e no histórico dos pesos, e devolve a quebra por fonte (`investimentoPorFonte`), exibida na página do cliente.

**Como acrescentar uma fonte (ex.: TikTok, Pinterest):**
1. Se ela já vem em `v_metrics_daily`: acrescente `{ id: 'tiktok', rotulo: 'TikTok Ads', origem: 'v_metrics_daily', platform: 'tiktok' }` em `FONTES_INVESTIMENTO` (há exemplos comentados no arquivo). **[?]** Confirmar o valor de `platform` no banco. Nada mais muda.
2. Se vier de outra view/tabela: acrescente o nome em `OrigemInvestimento` e um `case` em `lerInvestimento` com o select (somente leitura) que devolva `{ clientId, date, fonte, valor }`. O domínio não muda.
3. Atenção: a fonte nova passa a entrar também nos pesos históricos do investimento. Se ela não existia no ano anterior, os pesos refletem só as outras fontes naquele período.

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
| wolfos-ads | `v_analytics_diario` | `client_id`, `date`, `revenue`, `sessions`, `transactions` | `date` no mês e até hoje |
| wolfos-ads | `v_analytics_diario` | `client_id`, `date` **[?]** (tipo `date` ou texto AAAA-MM-DD), `revenue` **[?]** (receita total do GA4, não só e-commerce), `sessions`, `transactions` **[?]** (transações = pedidos) | `date` do dia 1 ao último dia do **mesmo mês do ano anterior** (pesos históricos) |
| wolfos-ads | `v_metrics_daily` | `client_id`, `date`, `platform`, `spend` | `platform in` (fontes de `src/config/investimento.ts`, hoje `'meta','google'`) **[?]**, `date` no mês e até hoje |
| wolfos-ads | `v_metrics_daily` | `client_id`, `date`, `platform`, `spend` | idem, `date` do dia 1 ao último dia do **mesmo mês do ano anterior** (pesos do investimento) |

Pontos a conferir:
- **Paginação:** a leitura pagina por intervalo ordenado por uma coluna que não é única (`name`, `client_id`, `date`). Em produção, usar chave única ou janela estável.
- **`v_analytics_diario`** tem uma linha por canal × dia. O app soma os canais. **[?]** Confirmar que a soma dos canais não duplica receita (ex.: um canal "total" junto com os canais).
- **`v_metrics_daily`:** o app soma as linhas por cliente × dia. **[?]** Confirmar que a view tem uma linha por cliente × plataforma × dia (sem níveis campanha/conjunto/anúncio somados juntos, o que duplicaria o investimento) e que os valores de `platform` são `meta` e `google` (como em `platform_accounts`). `ad_metrics_daily` não foi usada: não tem `client_id` e tem a coluna `level`. Outras plataformas entram pela configuração (seção 4.6).
- **`sessions` e `transactions`:** nulo = sem dado (não conta como zero). **[?]** Confirmar os nomes das colunas; `transactions` é usada como pedidos do GA4 (decidido).
- **Histórico da Argennti:** GA4 completo desde 01/2025, então o ano anterior existe a partir de jan/2026. **[?]** Confirmar cobertura dos outros clientes; sem ela, entra o fallback.
- **`pdas`:** a contagem segue o inventário (pendentes fora da lixeira). A regra de "vencida" é `due_date` anterior a hoje.

## 8. Decisões em aberto

1. **Variação contra o ano anterior** compara a receita lançada deste ano com a receita lançada do mesmo mês do ano anterior. Hoje isso exige lançar os meses de 2025. Alternativa: usar a receita do GA4 do ano anterior, mas a comparação fica inconsistente com a receita oficial.
2. **Matriz da grade G0–G3** é uma proposta (`src/domain/grade-config.ts`). Faixas: A ≥ 0%; B de −5% a 0%; C de −15% a −5%; D abaixo de −15%. Eixos: atingimento da meta (projeção ÷ meta − 1) × variação contra o ano anterior.
3. **Tolerância do tracking** é ±10% (`TOLERANCIA_TRACKING`). Pode virar configuração por cliente.
4. **Pesos por decêndio** vêm do mesmo mês do ano anterior, um conjunto por métrica (seções 4.4 e 4.5): receita GA4 (decidido), investimento de Meta + Google, sessões e transações do GA4. Os pesos `d1`/`d2`/`d3` da `meta_mes` são a reserva (fallback) de cada métrica. Em aberto: média de mais de um ano.
5. **`lancado_por` e `updated_by`:** texto livre ou uuid de `auth.users`.
6. **Realizado e projeção** usam a receita lançada. Se a receita oficial vier do Shopify ou de outra fonte, o lançamento continua sendo o ponto de entrada.
7. **Pedidos realizados** (decidido): transações do GA4 no acompanhamento de pedidos; pedidos aprovados lançados só no contexto da receita oficial. **Fontes de investimento** (decidido): Meta + Google por enquanto, configuráveis (seção 4.6).

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
- Build e testes rodados em 25/10/2026: 13 arquivos, 125 testes passando; `npm run build` ok.
