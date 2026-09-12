# Remarketing no Google, sem repetir a bagunça de tags

O objetivo é estreito de propósito: **o anúncio de primeiro impacto continua
só no Instagram**, que é onde a loja vive. O Google entra depois, para
reencontrar quem já visitou e não fechou — que num ciclo de casamento de três
meses é a maior parte das pessoas.

Este documento é a parte que não dá para resolver em código: o que precisa ser
feito dentro das contas do Google. A parte do site já está pronta.

---

## Por que a tag de hoje não serve

O WordPress carrega o Google por três caminhos ao mesmo tempo — Site Kit,
GTM4WP e PixelYourSite. Cada um dispara a sua versão do mesmo evento. Isso
produz três problemas que se acumulam:

1. **Compras contadas mais de uma vez**, então o faturamento no relatório não
   bate com o extrato.
2. **Públicos de remarketing contaminados**, porque "quem viu o produto"
   inclui gente que só passou pela home.
3. **Impossível saber qual tag está errada**, porque não há um lugar único
   onde olhar.

Reaproveitar esse contêiner no site novo seria carregar o problema junto. Por
isso a loja **não usa Tag Manager**: ela dispara os eventos direto, de um
ponto só (`src/commerce/marketing/google-tag.ts`), com o preço vindo do motor
de lote e o identificador vindo do mesmo lugar que gera o feed.

A propriedade do Analytics continua a mesma (`G-ZZVS0YHWXH`) para não perder o
histórico. O que sai é o contêiner `GTM-M4XTGVP`.

---

## O que já está pronto no site

| Momento | O que é enviado |
|---|---|
| Abriu a página do produto | `view_item` com o aroma que está na tela |
| Adicionou ao carrinho | `add_to_cart`, só depois de o servidor aceitar |
| Chegou na finalização | `begin_checkout` |
| Pedido confirmado | `purchase` + conversão, uma vez por número de pedido |

Cada evento vai em dois formatos: um para o Analytics (`item_id`) e outro para
o Google Ads (`id` + `google_business_vertical`). São envios separados de
propósito — um objeto que serve para os dois funciona por acidente.

Tudo começa **negado** até o visitante aceitar os cookies. Sem aceite, o
Google recebe no máximo um sinal anônimo.

---

## Os cinco passos, na ordem

### 1. Ligar o Google Ads na loja

No Google Ads, em **Ferramentas › Conversões**, crie (ou reaproveite) a ação de
conversão de **compra no site**. Ao abrir "Configurar tag", anote dois valores:

- o **ID da conta**, no formato `AW-000000000`
- o **rótulo da conversão**, uma sequência como `AbCdEfGhIj`

Coloque os dois no `.env` (e depois nas variáveis da Vercel):

```
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-000000000
NEXT_PUBLIC_GOOGLE_ADS_CONVERSAO_COMPRA=AbCdEfGhIj
```

Não é preciso colar nenhum código no site. Se o valor estiver no formato
errado, a loja **recusa e avisa**, em vez de carregar algo estranho em
silêncio.

### 2. Ligar o Merchant Center ao Google Ads

É esse vínculo que transforma remarketing comum em **remarketing dinâmico** —
o anúncio que mostra a vela exata que a pessoa olhou, com o preço do lote.

No Merchant Center: **Configurações › Contas vinculadas › Google Ads**, e
aceite o convite dentro do Ads.

O feed da loja (`/feed/google.xml`) já sai com o identificador estável e o
preço no formato certo. É o mesmo identificador que o site envia nos eventos —
e essa igualdade é o que faz o anúncio dinâmico encontrar o produto.

### 3. Vincular o Analytics ao Google Ads

No GA4: **Administrador › Vinculações de produtos › Google Ads**. É o que
permite usar os públicos do Analytics como público de anúncio.

Enquanto isso não é feito, o remarketing funciona só com as listas do próprio
Ads — que são mais grosseiras.

### 4. Criar os públicos que interessam

No GA4, em **Administrador › Públicos-alvo**. Três valem mais que dez:

- **Viu produto e não comprou nos últimos 30 dias.** É o público central. Quem
  chegou à página de um produto de R$ 2.000 e saiu tem intenção real.
- **Começou a finalização e não terminou.** Pequeno e muito mais quente.
  Merece lance maior.
- **Já comprou nos últimos 180 dias.** Este serve para **excluir**: ninguém
  precisa ver anúncio da lembrancinha que já encomendou. Exclusão bem feita é
  o que faz o orçamento render.

### 5. Criar a campanha

Para remarketing, **Display** e **Demand Gen** são o caminho: alcançam quem já
visitou por um custo muito menor que a busca.

---

## Duas coisas que é melhor saber antes

**O público precisa de tamanho mínimo.** O Google exige cerca de 100 pessoas
ativas nos últimos 30 dias para a Rede de Display, e cerca de 1.000 para Busca
e YouTube. Com o volume atual da loja, Display é o que fica viável primeiro; a
lista leva algumas semanas para encher, e a campanha só começa a rodar depois
disso. Não é defeito de configuração, é o mínimo da plataforma.

**Sem consentimento, sem remarketing.** O aviso de cookies recusa por padrão.
Quem recusa não entra em nenhuma lista — o que é a regra da LGPD e também a
que mantém a conta do Google fora de risco. Na prática, uma parte das visitas
simplesmente não vira público, e a lista enche mais devagar do que o número de
visitas sugere.

---

## Como conferir se está funcionando

1. Abra a loja em uma aba anônima e aceite os cookies.
2. No Google Ads, em **Ferramentas › Gerenciador de públicos**, o público de
   remarketing deve começar a contar em algumas horas.
3. No GA4, em **Administrador › DebugView**, os eventos aparecem na hora com a
   extensão de depuração ligada.
4. Faça uma compra de teste e confira, em **Conversões**, se ela aparece **uma
   vez só**. Se aparecer duas, alguma tag foi colada por fora — e é exatamente
   isso que este desenho existe para evitar.

---

## O que ainda fica de fora

A venda que fecha no WhatsApp não aparece automaticamente no Google. O caminho
para isso é a **Data Manager API** (a importação de conversão offline pela API
do Ads foi fechada para tokens novos em junho de 2026), e depende de uma conta
de serviço no Google Cloud. Fica para quando o Mercado Pago e o restante das
credenciais estiverem no lugar.

Enquanto isso, o relatório do mês (**Financeiro › Resultado do mês**) mostra o
investimento em tráfego por canal e o retorno sobre a receita total — que
responde à pergunta prática de "o remarketing do Google se pagou?" mesmo sem a
atribuição venda a venda.
