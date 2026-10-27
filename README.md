# Wolf Operações

Área de Performance da Wolf Aceleradora para acompanhar as metas de e-commerce dos clientes, em três visões: diária, decêndio (10 dias) e mensal/anual.

> **Status: F0, estrutura base.** É uma demonstração construída fora da estrutura do WolfOS, para apresentar ao Augusto. Se aprovada, ele cria os bancos dentro da estrutura dele e anexa o app. Detalhes em [docs/ENTREGA_AUGUSTO.md](docs/ENTREGA_AUGUSTO.md).

## O que tem aqui

- **Quadro da carteira**: visões diária, decêndio e mensal/anual; PDAs pendentes e vencidas; alertas.
- **Página do cliente**: acompanhamento de receita, investimento, sessões e pedidos (meta, realizado, esperado, projeção e ritmo necessário por dia, cada um com os seus pesos históricos), metas por decêndio, premissas e funil, confiabilidade do GA4, sync e lançamentos do mês.
- **Quadro de metas**: meta fixa depois de definida (alteração só com motivo); resultado do mesmo mês no ano anterior, médias base dos últimos 3 meses e sazonalidade; calculadora de trás para a frente (meta ÷ ticket = pedidos, pedidos ÷ conversão = sessões, sessões × CPS = investimento, ROAS comparado ao histórico e ao break-even); controle de meta lançada na Adstart e no WolfOS; lista de clientes sem meta lançada.
- **Plano de mídia mensal**: um quadro por cliente e mês, no roteiro da anatomia do planejamento (meta de faturado pago, pedidos, sessões e origem, pilares, meta diária, calendário comercial, aquisição, criativos). Mantém base, premissas com fonte e motivo, ações macro/micro, aprovações e o fluxo em elaboração → revisão → aprovada pelo revisor → enviada ao cliente → aprovada pelo cliente → lançada. Se a meta não supera o mesmo mês do ano anterior, o motivo é obrigatório. O revisor é o papel (gerente no Alpha, coordenador em Beta e Gamma).
- **Lançamento de receita**: receita aprovada oficial, lançada pelo analista (Adstart ou plataforma).
- **Conexões**: saúde do sync por cliente e plataforma (leitura da `v_sync_saude`).

Regras de negócio:

- **Receita oficial** = receita aprovada lançada. O GA4 é comparado a ela (índice de confiabilidade do tracking), nunca o contrário.
- **Meta do mês** é fixa. Qualquer alteração exige motivo, autor e data. O plano de mídia e o controle de lançamento ficam em outras chaves do navegador (`wolf-operacoes:planos-midia:v1` e `wolf-operacoes:controle-meta:v1`) e não regravam a meta.
- **Pesos por decêndio** vêm do mesmo mês do ano anterior, um conjunto para cada métrica (receita, sessões e pedidos do GA4, investimento das fontes de `src/config/investimento.ts`, hoje Meta + Google). Sem histórico suficiente, cada métrica cai nos pesos `d1`/`d2`/`d3` da meta.
- **Pedidos (GA4)** no acompanhamento = transações do GA4. Os pedidos aprovados lançados ficam nos lançamentos (receita oficial).
- **Fontes de investimento** são configuráveis em `src/config/investimento.ts`: para somar TikTok, Pinterest etc., acrescente a fonte na lista (ver docs/ENTREGA_AUGUSTO.md, seção 4.6).
- **Ritmo necessário por dia** é sempre o ponderado: falta × peso do dia ÷ peso dos dias restantes. Não há média simples.
- **Grade G0–G3** cruza o atingimento da meta (projeção ÷ meta) com a variação contra o ano anterior. Matriz em `src/domain/grade-config.ts` (proposta a validar).
- **Bancos do WOLFOS são somente leitura.** O código só faz `select`. Um teste garante que não há `insert`, `update`, `upsert`, `delete` nem `rpc` na camada de leitura.

## Como rodar

Requisitos: Node 20 ou superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes unitários (vitest)
npm run build      # checagem de tipos + build de produção
```

Sem credenciais, o app roda com **dados de exemplo**, e a tela avisa disso.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (não versionado) e preencha só se for usar dados reais do WOLFOS:

| Variável | Uso |
|---|---|
| `VITE_WOLFOS_ADS_URL` / `VITE_WOLFOS_ADS_KEY` | Banco `wolfos-ads` (mídia, GA4, saúde do sync) |
| `VITE_WOLFOS_DEV_URL` / `VITE_WOLFOS_DEV_KEY` | Banco `wolfos-dev` (clientes, PDAs) |

Use sempre a chave pública (anon/publishable) com RLS ativa. Nunca a service role.

## Estrutura

```
src/
  domain/          funções puras e testes: calculadora, projeção por decêndio,
                   pesos históricos (ano anterior) por métrica, gap,
                   ritmo necessário por dia (ponderado),
                   tracking GA4, grade G0–G3, alertas
  data/
    wolfos/        LEITURA do WOLFOS (somente select) + dados de exemplo
    local/         metas e lançamentos (repositório local, seed editável)
    piloto.ts      IDs dos clientes (piloto Argennti + exemplos)
  config/          fontes de investimento em mídia (configuráveis)
  hooks/           consultas do TanStack Query
  pages/           telas (quadro, cliente, meta, plano de mídia, lançamento, conexões)
  components/      layout, status e primitivos shadcn/ui
  theme/tokens.ts  classes de status (cores vêm de src/index.css)
supabase/migrations/   PROPOSTAS de tabela, NÃO aplicadas
docs/ENTREGA_AUGUSTO.md  documentação para aprovação e integração
```

## Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui (tema neutro), `@supabase/supabase-js`, TanStack Query e React Router. É a stack padrão do Lovable, para importar o front num projeto novo.

## Textos

A interface é em pt-BR.
