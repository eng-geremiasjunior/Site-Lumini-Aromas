/**
 * Preenche a página de venda de um produto com texto de exemplo.
 *
 * Serve para você ver a estrutura funcionando antes de escrever o texto
 * definitivo. **Tudo aqui é rascunho** — em especial as especificações,
 * que estão marcadas com "conferir" justamente para não irem ao ar com
 * número inventado.
 *
 * Uso: node --env-file=.env scripts/exemplo-pagina-de-venda.mjs [slug]
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const slug = process.argv[2] ?? 'bomboniere'
const payload = await getPayload({ config })

const { docs } = await payload.find({
  collection: 'products',
  where: { slug: { equals: slug } },
  limit: 1,
  depth: 0,
})

const produto = docs[0]
if (!produto) {
  console.log(`Produto "${slug}" não encontrado.`)
  process.exit(1)
}

const aromas = {
  'Capim Limão': 'Cítrico e leve. Desperta o ambiente sem pesar — combina com festa de dia e com celebração ao ar livre.',
  Vanilla: 'Doce e acolhedor. O aroma que faz o convidado parar e cheirar de novo antes de guardar na bolsa.',
  'Chá Branco': 'Delicado e limpo. Discreto o suficiente para não disputar com o perfume de ninguém na mesa.',
  Lavanda: 'Floral e calmo. Clássico de casamento, e o mais pedido para quem quer algo atemporal.',
}

const variacoes = (produto.variants ?? []).map((variante) => ({
  ...variante,
  descricao: variante.descricao || aromas[variante.label] || null,
}))

await payload.update({
  collection: 'products',
  id: produto.id,
  data: {
    variants: variacoes,

    promessa: {
      titulo: 'O detalhe que transforma uma celebração em memória.',
      texto:
        'A lembrancinha é a última coisa que o convidado leva do seu evento — e a única que continua na casa dele depois. Uma vela acesa semanas depois traz de volta a mesa, a música e o abraço daquele dia. É por isso que cada peça sai daqui feita à mão, uma a uma.',
    },

    acabamento: [
      {
        titulo: 'A vela',
        texto:
          'Feita à mão, envasada em vidro, com o aroma escolhido por você. A queima é limpa e o vidro pode ser reaproveitado depois — o convidado guarda.',
        detalhe: 'Conferir antes de publicar: peso, altura e tipo de cera.',
      },
      {
        titulo: 'A personalização',
        texto:
          'O rótulo leva o nome, a data ou a arte do seu evento, impresso exatamente como você escrever. Nada é produzido antes de você aprovar a prova.',
        detalhe: 'Até 40 caracteres no rótulo. Logomarca em PNG, JPG ou PDF.',
      },
      {
        titulo: 'A apresentação',
        texto:
          'Cada peça sai embalada e pronta para ir direto para a mesa. Laço, tag e acabamento combinados com a paleta da sua celebração.',
        detalhe: 'Conferir antes de publicar: itens que acompanham cada composição.',
      },
    ],

    secaoAromas: {
      titulo: 'Um aroma para cada história.',
      texto:
        'Trabalhamos com quatro fragrâncias, escolhidas por combinarem com ambiente de festa: presentes o suficiente para serem lembradas, discretas o suficiente para não incomodar ninguém.',
    },

    secaoPersonalizacao: {
      titulo: 'Seu evento tem uma identidade. Sua lembrança também.',
      texto:
        'Cada celebração tem cores, detalhes e uma história própria. A personalização é pensada para conversar com essa identidade — do tipo de letra do rótulo à cor do laço.',
    },

    comoFunciona: [
      {
        titulo: 'Você escolhe',
        texto: 'Modelo, aroma, quantidade e o que vai escrito no rótulo.',
      },
      {
        titulo: 'A gente prepara a arte',
        texto: 'Você recebe a prova do rótulo e aprova com um clique. Nada é produzido antes disso.',
      },
      {
        titulo: 'Produzimos à mão',
        texto: 'Uma peça de cada vez. Colocamos fotos da produção na sua área, para acompanhar.',
      },
      {
        titulo: 'Chega antes do seu evento',
        texto: 'Com o código de rastreio e o prazo combinado desde o começo.',
      },
    ],

    faq: [
      {
        pergunta: 'Qual é a quantidade mínima?',
        resposta:
          'São 20 peças. O preço aparece sempre pelo lote fechado, então você já vê o valor total antes de decidir.',
      },
      {
        pergunta: 'Qual é o prazo de produção?',
        resposta:
          'Depende da quantidade, e o prazo aparece na página antes de você fechar. O cálculo já considera a produção artesanal e a entrega — conferir os dias antes de publicar.',
      },
      {
        pergunta: 'Posso escolher o aroma?',
        resposta:
          'Pode. São quatro aromas e cada lote sai com um deles. Se quiser misturar, fale com a gente pelo WhatsApp.',
      },
      {
        pergunta: 'Como funciona a personalização?',
        resposta:
          'Você escreve a frase e, se quiser, envia a sua logomarca. A gente prepara a prova do rótulo e você aprova antes de qualquer peça ser produzida.',
      },
      {
        pergunta: 'Vocês enviam para todo o Brasil?',
        resposta:
          'Sim. O frete é calculado no carrinho pelo CEP, e para pedidos grandes dá para combinar o envio pelo WhatsApp.',
      },
    ],
  },
})

console.log(`✓ ${slug}: página de venda preenchida com texto de exemplo.`)
console.log('  Revise antes de publicar — os campos com "conferir" têm dado a confirmar.')
process.exit(0)
