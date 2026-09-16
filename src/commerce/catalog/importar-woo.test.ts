import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  apurarPrecoUnitario,
  aromasDe,
  faixasDe,
  lerFichaTecnica,
  lerResumo,
  quantidadeDoTermo,
  variacaoDoLoteMinimo,
  type VariacaoDoWoo,
} from './importar-woo.ts'

const REAL = 100

/** A gota de cristal como está hoje: R$ 38 a peça, com dois erros conhecidos. */
function variacoes(): VariacaoDoWoo[] {
  const linhas: VariacaoDoWoo[] = []
  let id = 4800

  for (const aroma of ['lavanda', 'morango']) {
    for (const quantidade of [20, 30, 60, 100, 120]) {
      linhas.push({
        id: id++,
        aroma,
        quantidade,
        precoEmCentavos: 38 * REAL * quantidade,
      })
    }
  }

  return linhas
}

describe('preço apurado pela maioria', () => {
  it('lê R$ 38 a peça de um produto sem erro', () => {
    const apurado = apurarPrecoUnitario(variacoes())

    assert.equal(apurado?.unitPrice, 38 * REAL)
    assert.equal(apurado?.confirmam, 10)
    assert.deepEqual(apurado?.divergencias, [])
  })

  it('ignora o preço digitado errado e aponta qual é', () => {
    // Os dois erros reais do produto 77: 120 peças de Bamboo lançadas como
    // R$ 4.520 em vez de R$ 4.560, e 60 de Lavanda como R$ 2.660 em vez de
    // R$ 2.280. A maioria manda.
    const linhas = variacoes()
    linhas[4] = { ...(linhas[4] as VariacaoDoWoo), precoEmCentavos: 4_520 * REAL }
    linhas[7] = { ...(linhas[7] as VariacaoDoWoo), precoEmCentavos: 2_660 * REAL }

    const apurado = apurarPrecoUnitario(linhas)

    assert.equal(apurado?.unitPrice, 38 * REAL)
    assert.equal(apurado?.divergencias.length, 2)

    const primeira = apurado?.divergencias[0]
    assert.equal(primeira?.esperado, 4_560 * REAL)
    assert.equal(primeira?.encontrado, 4_520 * REAL)
  })

  it('conta as variações sem preço, que hoje somem da loja', () => {
    const linhas = variacoes().map((linha, indice) =>
      indice >= 5 ? { ...linha, precoEmCentavos: 0 } : linha,
    )

    const apurado = apurarPrecoUnitario(linhas)

    assert.equal(apurado?.unitPrice, 38 * REAL)
    assert.equal(apurado?.semPreco, 5)
  })

  it('devolve nada quando nenhuma variação tem preço', () => {
    const linhas = variacoes().map((linha) => ({ ...linha, precoEmCentavos: 0 }))

    assert.equal(apurarPrecoUnitario(linhas), null)
  })

  it('no empate, fica com o preço maior', () => {
    // Errar para cima é recuperável na conversa; errar para baixo é
    // prejuízo já entregue.
    const apurado = apurarPrecoUnitario([
      { id: 1, aroma: 'lavanda', quantidade: 20, precoEmCentavos: 760 * REAL },
      { id: 2, aroma: 'lavanda', quantidade: 30, precoEmCentavos: 1_110 * REAL },
    ])

    assert.equal(apurado?.unitPrice, 38 * REAL)
  })
})

describe('quantidade do termo', () => {
  it('lê o número do rótulo do site atual', () => {
    assert.equal(quantidadeDoTermo('20 PEÇAS'), 20)
    assert.equal(quantidadeDoTermo('120 PEÇAS'), 120)
    assert.equal(quantidadeDoTermo('20'), 20)
  })

  it('devolve nada para termo sem número', () => {
    assert.equal(quantidadeDoTermo('Lavanda'), null)
    assert.equal(quantidadeDoTermo(''), null)
  })
})

describe('ficha técnica solta da descrição', () => {
  const descricao = `<p>O kit velas arom&aacute;ticas Lumini Aromas possui um padr&atilde;o de qualidade inquestion&aacute;vel.</p>
<p>&nbsp;</p>
<p>INFORMA&Ccedil;&Otilde;ES:<br />
Duração Aproximada: 08hs<br />
Peso líq: 60g<br />
Altura: 09cm<br />
Largura: 8cm<br />
Recipiente: Vidro<br />
lembrancinhas acompanham caixa de acetato com fita de cetim.</p>`

  it('separa cada informação em um campo', () => {
    const ficha = lerFichaTecnica(descricao)

    assert.equal(ficha.durationHours, 8)
    assert.equal(ficha.weight, '60g')
    assert.equal(ficha.height, '09cm')
    assert.equal(ficha.width, '8cm')
    assert.equal(ficha.container, 'Vidro')
    assert.equal(ficha.includes, 'caixa de acetato com fita de cetim')
  })

  it('não inventa campo que não está no texto', () => {
    const ficha = lerFichaTecnica('<p>Vela artesanal.</p>')

    assert.equal(ficha.weight, null)
    assert.equal(ficha.container, null)
    assert.equal(ficha.durationHours, null)
  })
})

describe('resumo', () => {
  it('descarta o resumo que é instrução de tela', () => {
    // Quase todos os produtos têm "Escolha a quantidade abaixo" no resumo,
    // que não descreve nada.
    const resumo = lerResumo(
      '<p>&nbsp; Escolha a quantidade abaixo</p>',
      '<p>Velas aromáticas artesanais, feitas uma a uma, que perfumam o ambiente por horas.</p>',
    )

    assert.match(resumo ?? '', /^Velas aromáticas artesanais/)
  })

  it('mantém o resumo quando ele descreve o produto', () => {
    const resumo = lerResumo('<p>Vela em vidro com tampa, 60 g, feita à mão.</p>', '<p>Outro.</p>')

    assert.equal(resumo, 'Vela em vidro com tampa, 60 g, feita à mão.')
  })

  it('devolve nada quando não há texto aproveitável', () => {
    assert.equal(lerResumo('', ''), null)
  })
})

describe('faixas e aromas', () => {
  it('lista as faixas em ordem', () => {
    assert.deepEqual(faixasDe(variacoes()), [20, 30, 60, 100, 120])
  })

  it('deixa de fora o aroma que não tem uma variação comprável', () => {
    // A Vanilla da gota de cristal: aparece no site e não dá para comprar.
    // Trazer para o sistema novo repetiria o problema em silêncio.
    const linhas = [
      ...variacoes(),
      { id: 9001, aroma: 'vanilla', quantidade: 20, precoEmCentavos: 0 },
      { id: 9002, aroma: 'vanilla', quantidade: 30, precoEmCentavos: 0 },
    ]

    assert.deepEqual(aromasDe(linhas), ['lavanda', 'morango'])
  })

  it('acha a variação do lote mínimo de cada aroma', () => {
    const linhas = variacoes()

    assert.equal(variacaoDoLoteMinimo(linhas, 'lavanda'), 4800)
    assert.equal(variacaoDoLoteMinimo(linhas, 'morango'), 4805)
  })
})
