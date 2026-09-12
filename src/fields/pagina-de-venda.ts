import type { Tab } from 'payload'

/**
 * A página do produto como página de venda.
 *
 * Uma vitrine genérica mostra foto, preço e botão, e deixa a cliente
 * montar sozinha o resto da história. Aqui o produto conta a própria
 * história: o que ele significa no evento, do que é feito, como cheira,
 * como fica personalizado, para que celebrações serve, e como o pedido
 * acontece do primeiro contato à caixa na mão dela.
 *
 * A regra que faz isso funcionar sem virar bagunça: **cada bloco só
 * aparece no site quando está preenchido.** Seção vazia dizendo "em breve"
 * não é estrutura, é promessa não cumprida logo na primeira visita. Então
 * dá para publicar com dois blocos hoje e crescer depois, sem nunca mostrar
 * buraco.
 *
 * Nada aqui é obrigatório, e nada aqui inventa característica: se a vela
 * não tem cera vegetal premium, o campo fica vazio e a seção some.
 */
export function paginaDeVenda(): Tab {
  return {
        label: 'Página de venda',
        description:
          'O que a página do produto conta além do preço. Cada bloco em branco simplesmente não aparece no site.',
        fields: [
          {
            name: 'promessa',
            type: 'group',
            label: '1. Mais do que uma lembrança',
            admin: {
              description:
                'O porquê emocional, logo abaixo da compra. É o que separa "vela de 45 g" de "a lembrança que os convidados levam para casa".',
            },
            fields: [
              {
                name: 'titulo',
                type: 'text',
                label: 'Título',
                admin: { description: 'Ex.: O detalhe que transforma uma celebração em memória.' },
              },
              { name: 'texto', type: 'textarea', label: 'Texto' },
              {
                name: 'imagens',
                type: 'upload',
                relationTo: 'media',
                hasMany: true,
                label: 'Fotos desta seção',
              },
            ],
          },

          {
            name: 'acabamento',
            type: 'array',
            label: '2. Características e acabamento',
            labels: { singular: 'Bloco', plural: 'Blocos' },
            admin: {
              description:
                'A vela, a personalização, a apresentação. Informação concreta com foto — luxo se sustenta em fato, não em adjetivo. Não escreva o que o produto não tem.',
            },
            fields: [
              { name: 'titulo', type: 'text', label: 'Título', required: true },
              { name: 'texto', type: 'textarea', label: 'Texto', required: true },
              {
                name: 'detalhe',
                type: 'text',
                label: 'Especificação',
                admin: { description: 'Ex.: 45 g · 7 cm de altura · vidro com tampa.' },
              },
              { name: 'imagem', type: 'upload', relationTo: 'media', label: 'Foto' },
            ],
          },

          {
            name: 'secaoAromas',
            type: 'group',
            label: '3. Aromas',
            admin: {
              description:
                'A descrição de cada aroma fica na aba Opções, em cada variação. Aqui entra só a abertura da seção.',
            },
            fields: [
              {
                name: 'titulo',
                type: 'text',
                label: 'Título',
                admin: { description: 'Ex.: Um aroma para cada história.' },
              },
              { name: 'texto', type: 'textarea', label: 'Texto' },
            ],
          },

          {
            name: 'secaoPersonalizacao',
            type: 'group',
            label: '4. Personalização',
            admin: {
              description:
                'Mostre composições reais já entregues. É onde ela entende que a peça vai ter a cara do evento dela.',
            },
            fields: [
              {
                name: 'titulo',
                type: 'text',
                label: 'Título',
                admin: { description: 'Ex.: Seu evento tem uma identidade. Sua lembrança também.' },
              },
              { name: 'texto', type: 'textarea', label: 'Texto' },
              {
                name: 'exemplos',
                type: 'upload',
                relationTo: 'media',
                hasMany: true,
                label: 'Exemplos de personalização',
              },
            ],
          },

          {
            name: 'comoFunciona',
            type: 'array',
            label: '5. Como funciona o pedido',
            labels: { singular: 'Passo', plural: 'Passos' },
            admin: {
              description:
                'Da ideia à lembrança pronta. Esta seção reduz dúvida e, na prática, reduz pergunta repetida no WhatsApp. Se ficar vazia, a loja usa os passos gerais das Configurações.',
            },
            fields: [
              { name: 'titulo', type: 'text', label: 'Passo', required: true },
              { name: 'texto', type: 'textarea', label: 'Explicação' },
            ],
          },

          {
            name: 'faq',
            type: 'array',
            label: '6. Perguntas frequentes',
            labels: { singular: 'Pergunta', plural: 'Perguntas' },
            admin: {
              description:
                'Quantidade mínima, prazo, escolha de aroma, envio. Cada resposta aqui é uma pergunta a menos no seu WhatsApp. Vazio aqui usa as perguntas gerais das Configurações.',
            },
            fields: [
              { name: 'pergunta', type: 'text', label: 'Pergunta', required: true },
              { name: 'resposta', type: 'textarea', label: 'Resposta', required: true },
            ],
          },
        ],
  }
}
