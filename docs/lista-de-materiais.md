# Lista de compra de materiais

Especificação registrada a partir da descrição do dono, em 11/09/2026.
Ainda não implementada. Entra depois de carrinho, checkout e pedidos.

## O problema

O que se compra e o que se usa estão em unidades diferentes, e a conversão
hoje é feita de cabeça a cada pedido. Exemplo real dado pelo dono: vendeu
100 velas no copinho, e precisa saber quanto comprar de cada coisa.

| Material | Como compra | Como usa |
|---|---|---|
| Copo de vidro | unidade | 1 por vela |
| Caixinha | unidade | 1 por vela |
| Cera | quilo | envasa cerca de 60 ml num copo de 70 ml |
| Pavio | caixa com 50 unidades | 1 por vela |
| Fita de cetim | metro ou rolo | alguns centímetros por vela |
| Essência | litro | 200 ml para cada 7 kg de cera derretida |

Some-se a isso a perda: a cera derretida rende menos do que o peso comprado,
por resíduo na panela e evaporação.

## O que a tela precisa responder

Dado um conjunto de pedidos (por exemplo, todos os que estão em produção),
dizer **quanto comprar de cada material, já na unidade de compra**:

> 100 velas no copinho:
> - 100 copos de vidro
> - 100 caixinhas
> - 6 kg de cera (5,8 kg necessários, arredondado para cima)
> - 2 caixas de pavio (100 unidades, caixa com 50)
> - 1 rolo de fita (35 m necessários, rolo com 50 m)
> - 170 ml de essência

E, junto, **quanto isso custa**, que é o custo do produto vendido que
alimenta o DRE.

## Modelo de dados

### Insumo

Cada material comprado, com a unidade de compra e a unidade de uso.

- `nome`
- `unidadeDeUso`: `un` | `g` | `ml` | `cm`
- `unidadeDeCompra`: `unidade` | `kg` | `litro` | `metro` | `rolo` | `caixa`
- `quantidadePorEmbalagem`: quanto vem em uma compra, na unidade de uso.
  Exemplos: cera em kg = 1000 g; pavio em caixa de 50 = 50 un; rolo de
  fita de 50 m = 5000 cm; essência em litro = 1000 ml.
- `precoPorEmbalagem`: em centavos. Ver abaixo, porque não é fixo.
- `perdaPercentual`: padrão 0. Cera e essência levam perda; vidro não.
- `estoqueAtual`: opcional, na unidade de uso, para descontar do que comprar.

O custo por unidade de uso é derivado, nunca digitado:
`precoPorEmbalagem ÷ quantidadePorEmbalagem`.

#### O preço do material oscila

O quilo da cera é comprado entre R$ 24,00 e R$ 30,00, variando por compra.
Guardar um preço fixo daria um custo errado quase sempre, e o erro entra
direto na margem do DRE.

Por isso o insumo tem um **histórico de compras**, não um preço único:

- `compras[]`: data, quantidade comprada, valor pago, fornecedor.

E dois números derivados, calculados e nunca digitados:

- **Último preço**: o da compra mais recente. É o que a lista de compras
  usa para estimar quanto vai gastar.
- **Preço médio ponderado**: soma do que foi pago dividida pela quantidade
  comprada, considerando as últimas compras. É o que o DRE usa, porque
  representa melhor o custo do material que está sendo consumido.

Na tela, mostrar a faixa observada (por exemplo, "R$ 24,00 a R$ 30,00 o
quilo, média R$ 26,40") para o dono enxergar a variação em vez de um
número que finge ser exato.

Quando a venda acontece, o custo é **congelado no item do pedido**. Assim
uma compra de cera mais cara no mês seguinte não muda o lucro de um pedido
já fechado.

### Ficha técnica do produto

Quanto de cada insumo entra em **uma peça**.

- `insumo`
- `quantidadePorPeca`, na unidade de uso do insumo.
- `vinculo`: de onde vem a escolha do insumo (abaixo).

#### Materiais que dependem da escolha do cliente

Nem todo insumo é fixo. A fita de cetim não é um material só: é uma por
cor, comprada separadamente. A essência também: Lavanda e Bamboo são
frascos diferentes. Comprar pela soma total daria o número errado, porque
juntaria cores e aromas que se compram em vidros distintos.

Por isso cada linha da ficha técnica diz de onde vem o insumo:

1. **Fixo** — o mesmo sempre. Copo de vidro, caixinha, pavio, cera.
2. **Pelo aroma** — a variação escolhida define o insumo. Aroma Lavanda
   usa a essência de lavanda. Cada valor da opção "Aroma" aponta para o
   seu insumo.
3. **Por campo de personalização** — a resposta do cliente define o
   insumo. O campo "Cor do laço" com resposta "Verde oliva" usa a fita
   verde oliva. Cada opção do campo aponta para o seu insumo.

Consequência prática na lista de compras: ela sai **quebrada por escolha**.
Num lote de 100 velas, 60 em Lavanda e 40 em Bamboo, a lista pede essência
de lavanda e de bamboo em quantidades separadas, e o mesmo vale para as
cores de fita do pedido.

Consequência no cadastro: os campos de personalização do tipo "escolha uma
opção" precisam que cada opção possa apontar para um insumo. Hoje elas são
só texto separado por vírgula; vira uma lista com insumo vinculado.

#### A conversão da cera: peso comprado, volume envasado

A cera é comprada sólida, em quilo, e envasada líquida, em mililitro. O
copo de 70 ml recebe cerca de 60 ml, porque não se enche até a borda.

A ponte entre as duas unidades é a **densidade da cera derretida**, que
fica entre 0,85 e 0,90 g/ml em ceras de soja e coco. Com 0,86 g/ml:

- 60 ml envasados = 60 × 0,86 = **51,6 g de cera por peça**
- 1 kg rende 1000 ÷ 0,86 = 1.162 ml, ou cerca de **19 velas** de 60 ml

Por isso o insumo cera ganha um campo `densidade` (g/ml, padrão 0,86),
editável, já que muda entre soja, coco e parafina. Na ficha técnica o dono
informa o que ele sabe de verdade: **quantos ml o copo recebe**. As gramas
saem da densidade, e o quilo a comprar sai das gramas.

A perda do derretimento entra por cima disso, como percentual do insumo:
resíduo que fica na panela e o que se perde no manuseio.

A essência segue a cera por proporção, e não por peça: `200 ml por 7 kg de
cera`. No cálculo, a quantidade de essência sai da quantidade de cera do
lote, não da contagem de velas.

### Regras de cálculo

1. Somar as peças por produto, a partir dos pedidos escolhidos.
2. Para cada insumo: `necessário = peças × quantidadePorPeça × (1 + perda)`.
3. Insumos proporcionais (essência) entram depois, calculados sobre o
   total do insumo base (cera).
4. Descontar o estoque atual, quando informado.
5. Converter para unidade de compra e **arredondar para cima**, porque não
   se compra meia caixa de pavio.
6. Mostrar o necessário e o arredondado lado a lado, para o dono enxergar
   quanto vai sobrar.

## Perguntas ainda em aberto

Nenhuma delas trava o começo; são para afinar os números na hora de usar.

- Quantas velas saem de 7 kg de cera, na prática? É o número que define o
  consumo por peça e não dá para estimar sem a experiência dele.
- Qual a perda percentual observada no derretimento?
- Quantos centímetros de fita vão em cada peça?
- A essência varia por aroma, ou os 200 ml por 7 kg valem para todos?
- A lista deve considerar pedidos em quais situações: só os pagos, ou
  também os que estão aguardando pagamento?
- Quer controlar estoque de insumos, ou a lista sempre considera estoque
  zero e manda comprar tudo?
