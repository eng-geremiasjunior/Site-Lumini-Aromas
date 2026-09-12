import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  custoDaPeca,
  custoDe,
  faixaDePrecos,
  listaDeCompras,
  precoMedio,
  ultimoPreco,
  type FichaDoProduto,
  type Insumo,
} from './materiais.ts'

const REAL = 100

/**
 * O caso real descrito pelo dono: a vela no copinho.
 *
 * Copo e caixinha por peça, cera medida em mililitros e comprada em quilo,
 * pavio em caixa de 50, fita em rolo, e essência proporcional à cera.
 */
const copo: Insumo = {
  id: 'copo',
  nome: 'Copo de vidro 70 ml',
  unidadeDeUso: 'un',
  unidadeDeCompra: 'unidade',
  quantidadePorEmbalagem: 1,
  compras: [{ em: '2026-08-10', embalagens: 200, valorPago: 200 * 320 }],
}

const caixinha: Insumo = {
  id: 'caixinha',
  nome: 'Caixinha',
  unidadeDeUso: 'un',
  unidadeDeCompra: 'unidade',
  quantidadePorEmbalagem: 1,
  compras: [{ em: '2026-08-10', embalagens: 200, valorPago: 200 * 150 }],
}

const cera: Insumo = {
  id: 'cera',
  nome: 'Cera de soja',
  unidadeDeUso: 'g',
  unidadeDeCompra: 'kg',
  quantidadePorEmbalagem: 1000,
  densidade: 0.86,
  perdaPercentual: 12,
  compras: [
    { em: '2026-06-02', embalagens: 10, valorPago: 10 * 24 * REAL },
    { em: '2026-08-15', embalagens: 5, valorPago: 5 * 30 * REAL },
  ],
}

const pavio: Insumo = {
  id: 'pavio',
  nome: 'Pavio',
  unidadeDeUso: 'un',
  unidadeDeCompra: 'caixa',
  quantidadePorEmbalagem: 50,
  compras: [{ em: '2026-07-01', embalagens: 4, valorPago: 4 * 18 * REAL }],
}

const fitaVerde: Insumo = {
  id: 'fita-verde',
  nome: 'Fita verde oliva',
  unidadeDeUso: 'cm',
  unidadeDeCompra: 'rolo',
  quantidadePorEmbalagem: 5000,
  compras: [{ em: '2026-05-20', embalagens: 2, valorPago: 2 * 22 * REAL }],
}

const fitaBege: Insumo = {
  id: 'fita-bege',
  nome: 'Fita bege',
  unidadeDeUso: 'cm',
  unidadeDeCompra: 'rolo',
  quantidadePorEmbalagem: 5000,
  compras: [{ em: '2026-05-20', embalagens: 1, valorPago: 22 * REAL }],
}

const essenciaLavanda: Insumo = {
  id: 'ess-lavanda',
  nome: 'Essência de lavanda',
  unidadeDeUso: 'ml',
  unidadeDeCompra: 'litro',
  quantidadePorEmbalagem: 1000,
  compras: [{ em: '2026-07-10', embalagens: 1, valorPago: 180 * REAL }],
}

const essenciaBamboo: Insumo = {
  id: 'ess-bamboo',
  nome: 'Essência de bamboo',
  unidadeDeUso: 'ml',
  unidadeDeCompra: 'litro',
  quantidadePorEmbalagem: 1000,
  compras: [{ em: '2026-07-10', embalagens: 1, valorPago: 180 * REAL }],
}

const INSUMOS = [copo, caixinha, cera, pavio, fitaVerde, fitaBege, essenciaLavanda, essenciaBamboo]

const ficha: FichaDoProduto = {
  produtoId: 'vela-copinho',
  linhas: [
    { vinculo: 'fixo', insumoId: 'copo', quantidadePorPeca: 1 },
    { vinculo: 'fixo', insumoId: 'caixinha', quantidadePorPeca: 1 },
    { vinculo: 'fixo', insumoId: 'pavio', quantidadePorPeca: 1 },
    // O dono sabe que o copo recebe 60 ml. As gramas saem da densidade.
    { vinculo: 'fixo', insumoId: 'cera', quantidadePorPeca: 60, informadaEmMililitros: true },
    {
      vinculo: 'escolha',
      campo: 'aroma',
      opcoes: [
        { valor: 'lavanda', insumoId: 'ess-lavanda' },
        { valor: 'bamboo', insumoId: 'ess-bamboo' },
      ],
      quantidadePorPeca: 0,
    },
    {
      vinculo: 'escolha',
      campo: 'Cor do laço',
      opcoes: [
        { valor: 'Verde oliva', insumoId: 'fita-verde' },
        { valor: 'Bege', insumoId: 'fita-bege' },
      ],
      quantidadePorPeca: 35,
    },
  ],
}

/** A ficha com a essência proporcional: 200 ml para cada 7 kg de cera. */
const fichaComEssencia: FichaDoProduto = {
  produtoId: 'vela-copinho',
  linhas: [
    ...ficha.linhas.filter((linha) => linha.campo !== 'aroma'),
    {
      vinculo: 'proporcional',
      insumoId: 'ess-lavanda',
      insumoBaseId: 'cera',
      quantidadePorPeca: 200,
      paraCada: 7000,
    },
  ],
}

describe('preço do insumo', () => {
  it('usa o preço da compra mais recente', () => {
    assert.equal(ultimoPreco(cera), 30 * REAL)
  })

  it('pondera a média pela quantidade, não pelos preços', () => {
    // 10 kg a R$ 24 e 5 kg a R$ 30 dão R$ 26,00 o quilo — não R$ 27,00,
    // que seria a média simples dos dois preços.
    assert.equal(precoMedio(cera), 26 * REAL)
  })

  it('mostra a faixa observada', () => {
    assert.deepEqual(faixaDePrecos(cera), { minimo: 24 * REAL, maximo: 30 * REAL })
  })

  it('não inventa preço para insumo nunca comprado', () => {
    const novo: Insumo = { ...cera, id: 'x', compras: [] }

    assert.equal(ultimoPreco(novo), null)
    assert.equal(custoDe(novo, 1000), null)
  })

  it('divide e multiplica na mesma conta, para não perder centavos', () => {
    // 5.779 g a R$ 26,00 o quilo. Arredondar o preço por grama para
    // centavos inteiros (3 centavos) daria R$ 173,37; o certo é R$ 150,25.
    assert.equal(custoDe(cera, 5779, 'medio'), 15025)
  })
})

describe('lista de compras', () => {
  it('resolve as 100 velas do copinho', () => {
    const lista = listaDeCompras(
      [
        {
          produtoId: 'vela-copinho',
          variante: 'lavanda',
          personalizacao: { 'Cor do laço': 'Verde oliva' },
          pecas: 100,
        },
      ],
      [fichaComEssencia],
      INSUMOS,
    )

    const porNome = new Map(lista.linhas.map((linha) => [linha.insumoId, linha]))

    assert.equal(porNome.get('copo')?.embalagens, 100)
    assert.equal(porNome.get('caixinha')?.embalagens, 100)

    // 60 ml x 0,86 = 51,6 g por peça; 5.160 g no lote; com 12% de perda,
    // 5.779,2 g — que se compra em 6 quilos.
    assert.equal(porNome.get('cera')?.consumo, 5160)
    assert.equal(porNome.get('cera')?.necessario, 5779.2)
    assert.equal(porNome.get('cera')?.embalagens, 6)

    // 100 pavios em caixa de 50.
    assert.equal(porNome.get('pavio')?.embalagens, 2)

    // 35 cm por peça = 35 m; o rolo tem 50 m.
    assert.equal(porNome.get('fita-verde')?.necessario, 3500)
    assert.equal(porNome.get('fita-verde')?.embalagens, 1)

    // 200 ml para cada 7 kg de cera derretida (a cera com perda).
    assert.equal(porNome.get('ess-lavanda')?.necessario, 165.12)
    assert.equal(porNome.get('ess-lavanda')?.embalagens, 1)
  })

  it('separa a compra por aroma, porque são frascos diferentes', () => {
    // Somar tudo junto daria "330 ml de essência", que não se compra.
    const lista = listaDeCompras(
      [
        { produtoId: 'vela-copinho', variante: 'lavanda', pecas: 60 },
        { produtoId: 'vela-copinho', variante: 'bamboo', pecas: 40 },
      ],
      [ficha],
      INSUMOS,
    )

    const ids = lista.linhas.map((linha) => linha.insumoId)
    assert.ok(!ids.includes('ess-lavanda'), 'a ficha sem quantidade não consome essência')
    assert.equal(lista.pecas, 100)
  })

  it('separa a compra por cor de fita', () => {
    const lista = listaDeCompras(
      [
        {
          produtoId: 'vela-copinho',
          personalizacao: { 'Cor do laço': 'Verde oliva' },
          pecas: 60,
        },
        { produtoId: 'vela-copinho', personalizacao: { 'Cor do laço': 'Bege' }, pecas: 40 },
      ],
      [ficha],
      INSUMOS,
    )

    const porId = new Map(lista.linhas.map((linha) => [linha.insumoId, linha]))

    assert.equal(porId.get('fita-verde')?.necessario, 2100)
    assert.equal(porId.get('fita-bege')?.necessario, 1400)
  })

  it('aceita a resposta escrita de outro jeito', () => {
    // A cliente escreve "verde oliva", o cadastro diz "Verde oliva".
    const lista = listaDeCompras(
      [{ produtoId: 'vela-copinho', personalizacao: { 'Cor do laço': 'verde oliva' }, pecas: 20 }],
      [ficha],
      INSUMOS,
    )

    assert.ok(lista.linhas.some((linha) => linha.insumoId === 'fita-verde'))
  })

  it('desconta o estoque antes de mandar comprar', () => {
    const comEstoque = INSUMOS.map((insumo) =>
      insumo.id === 'copo' ? { ...insumo, estoqueAtual: 70 } : insumo,
    )

    const lista = listaDeCompras(
      [{ produtoId: 'vela-copinho', pecas: 100 }],
      [ficha],
      comEstoque,
    )

    const copos = lista.linhas.find((linha) => linha.insumoId === 'copo')
    assert.equal(copos?.necessario, 100)
    assert.equal(copos?.aComprar, 30)
    assert.equal(copos?.embalagens, 30)
  })

  it('arredonda a embalagem para cima, porque não se compra meia caixa', () => {
    const lista = listaDeCompras([{ produtoId: 'vela-copinho', pecas: 51 }], [ficha], INSUMOS)
    const pavios = lista.linhas.find((linha) => linha.insumoId === 'pavio')

    assert.equal(pavios?.necessario, 51)
    assert.equal(pavios?.embalagens, 2)
    assert.equal(pavios?.compraArredondada, 100)
  })

  it('avisa quando uma escolha não tem material cadastrado', () => {
    const lista = listaDeCompras(
      [{ produtoId: 'vela-copinho', personalizacao: { 'Cor do laço': 'Dourado' }, pecas: 20 }],
      [ficha],
      INSUMOS,
    )

    assert.ok(lista.semInsumo.some((aviso) => aviso.includes('Dourado')))
  })

  it('avisa quando falta preço em vez de somar zero', () => {
    const semCompra = INSUMOS.map((insumo) =>
      insumo.id === 'copo' ? { ...insumo, compras: [] } : insumo,
    )

    const lista = listaDeCompras([{ produtoId: 'vela-copinho', pecas: 20 }], [ficha], semCompra)

    assert.deepEqual(lista.semPreco, ['Copo de vidro 70 ml'])
    assert.equal(lista.linhas.find((linha) => linha.insumoId === 'copo')?.custoEstimado, null)
  })

  it('junta pedidos diferentes do mesmo produto numa compra só', () => {
    const lista = listaDeCompras(
      [
        { produtoId: 'vela-copinho', pecas: 60 },
        { produtoId: 'vela-copinho', pecas: 60 },
      ],
      [ficha],
      INSUMOS,
    )

    assert.equal(lista.linhas.find((linha) => linha.insumoId === 'copo')?.necessario, 120)
  })

  it('não quebra com produto sem ficha cadastrada', () => {
    const lista = listaDeCompras([{ produtoId: 'outro', pecas: 40 }], [ficha], INSUMOS)

    assert.equal(lista.linhas.length, 0)
    assert.equal(lista.pecas, 40)
  })
})

describe('custo da peça pela ficha', () => {
  it('soma o que a peça consome, e não a embalagem inteira', () => {
    // A sobra do rolo de fita não é custo desta vela.
    const custo = custoDaPeca(
      fichaComEssencia,
      INSUMOS,
      { personalizacao: { 'Cor do laço': 'Verde oliva' } },
      'medio',
    )

    assert.ok(custo !== null)
    // Copo 3,20 + caixinha 1,50 + pavio 0,36 + cera 57,8 g a R$ 26/kg
    // + fita 35 cm + essência.
    assert.ok(custo > 6 * REAL && custo < 10 * REAL, `custo fora do esperado: ${custo}`)
  })

  it('devolve nada quando falta preço de algum insumo', () => {
    // Um custo parcial parece certo, e é pior do que um custo ausente.
    const semCompra = INSUMOS.map((insumo) =>
      insumo.id === 'cera' ? { ...insumo, compras: [] } : insumo,
    )

    assert.equal(custoDaPeca(ficha, semCompra), null)
  })

  it('devolve nada quando o produto não tem ficha', () => {
    assert.equal(custoDaPeca({ produtoId: 'x', linhas: [] }, INSUMOS), null)
  })
})
