# Lumini Aromas — plataforma de e-commerce

Loja própria da Lumini Aromas (luminiaromas.com.br), em substituição ao WordPress +
WooCommerce hospedado na Hostgator. Lembrancinhas de luxo para eventos: baixo volume,
ticket alto (média R$ 2.000), produção artesanal sob encomenda.

O planejamento completo está em `~/.claude/plans/eu-tenho-um-site-soft-planet.md`.

## Stack

- **Next.js 16** (App Router) com **Payload CMS 3** embutido no mesmo aplicativo.
  Vitrine em `/`, painel em `/admin`, API em `/api`.
- **PostgreSQL** no Supabase, região São Paulo (`sa-east-1`), conexão pelo Session pooler.
- **Cloudflare R2** para imagens e arquivos enviados pelos clientes.
- **Vercel Pro**, região `gru1` (São Paulo). O plano Hobby proíbe uso comercial.
- Integrações brasileiras: Mercado Pago (Orders API + Bricks), Melhor Envio,
  Meta Pixel/CAPI, GA4, Google Merchant, WhatsApp.

## Regras que não se negociam

1. **Dinheiro é inteiro em centavos.** Nunca float. O campo `money()` mostra reais na
   tela e guarda centavos no banco.
2. **Preço de lote nunca é digitado.** É sempre `quantidade × preço unitário`, calculado
   por `src/commerce/pricing/lot-pricing.ts`. Foi o preço digitado variação a variação no
   WooCommerce que gerou 8 preços errados e 21 variações sem preço que sumiram da loja.
3. **`guardLot()` é o único ponto de validação de quantidade.** Carrinho, checkout,
   orçamento e venda manual chamam a mesma função. Regra duplicada por rota é como o
   WooCommerce deixou passar variação inválida.
4. **Um único caminho de efeitos colaterais.** Quando um pedido é pago, um só lugar
   dispara Meta CAPI, GA4, Google Ads e os lançamentos do DRE — tanto para venda do site
   quanto para venda lançada à mão. Tudo pela tabela `integrationEvents` (outbox), com
   `dedupeKey`, tentativas e reenvio manual no painel.
5. **O painel é para quem não programa.** Rótulos e descrições em português claro,
   sem jargão. Se uma tela precisar de explicação técnica, ela está mal feita.
6. **Versões fixas.** Atualizações só passam depois que os testes do motor de preço e do
   checkout rodam no CI.

## Estrutura

```
src/
  access/          controle de acesso por papel (dono, atendente, designer)
  app/
    (frontend)/    vitrine pública
    (payload)/     painel e API gerados pelo Payload
  collections/     coleções do Payload (catálogo, pedidos, clientes...)
  commerce/        regra de negócio pura, sem dependência de framework
    pricing/       motor de preço por lote (com testes)
  fields/          campos reutilizáveis (dinheiro, slug, tabela de lotes)
  globals/         configurações da loja
```

`src/commerce/` não importa nada do Payload nem do Next: é lógica pura, testável com
`node --test`, e é o que garante que preço e validação continuem corretos.

## Comandos

```bash
npm run dev              # sobe vitrine e painel em http://localhost:3000
npm test                 # testes do motor de preço
npm run typecheck        # tsc --noEmit
npm run generate:types   # regenera src/payload-types.ts a partir das coleções
npm run generate:importmap  # regenera o mapa de componentes do painel
npm run migrate:create   # cria uma migração após mudar coleções
```

Depois de mexer em coleções, rode `generate:types`. Depois de adicionar um componente
customizado de campo, rode `generate:importmap`.

## Contexto do negócio que muda decisões

- O mínimo é 20 peças e o preço é exibido pelo **lote fechado**, não por peça. Isso foi
  testado nos anúncios da Meta e melhorou a qualificação dos clientes.
- **Um aroma por lote** (mínimo por variação), como no site atual.
- A maioria das vendas ainda fecha no WhatsApp. Por isso existe o lançamento manual de
  venda, que devolve a conversão para a Meta e para o Google.
- Produção sob encomenda: estoque desligado por padrão; o que importa é o prazo.
- Produto personalizado **não** afasta o direito de arrependimento de 7 dias no Brasil.
  A loja honra o prazo e reduz o risco com aprovação de arte antes de produzir.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
