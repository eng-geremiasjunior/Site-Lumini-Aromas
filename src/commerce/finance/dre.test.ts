import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  mesDe,
  montarDre,
  nomeDoMes,
  percentual,
  ultimosMeses,
  type PedidoParaDre,
} from './dre.ts'
import { aliquotaEfetiva, faixaDoFaturamento, impostoSobre } from './simples-nacional.ts'

const REAL = 100

function pedido(ajustes: Partial<PedidoParaDre> = {}): PedidoParaDre {
  return {
    numero: '1001',
    pagoEm: '2026-09-10T14:00:00.000Z',
    canal: 'site',
    itens: [
      {
        categoria: 'Velas',
        produto: 'Gota de cristal',
        receita: 2_280 * REAL,
        cmv: 760 * REAL,
        pecas: 60,
        anexo: 'II',
      },
    ],
    frete: 80 * REAL,
    desconto: 0,
    total: 2_360 * REAL,
    taxaDePagamento: 0,
    fretePago: 0,
    embalagem: 0,
    reembolsado: 0,
    ...ajustes,
  }
}

describe('alíquota do Simples', () => {
  it('usa a alíquota efetiva, não a da tabela', () => {
    // Faturamento de R$ 500 mil no Anexo II: a tabela diz 10%, mas a
    // parcela a deduzir de R$ 13.860 derruba a conta para 7,23%.
    const efetiva = aliquotaEfetiva(500_000 * REAL, 'II')

    assert.equal(Number(efetiva.toFixed(2)), 7.23)
  })

  it('cobra menos da indústria só nas faixas iniciais', () => {
    // Uma diferença que aparece no DRE e surpreende: na última faixa, o
    // Anexo II é bem mais caro que o Anexo I.
    assert.ok(aliquotaEfetiva(150_000 * REAL, 'I') < aliquotaEfetiva(150_000 * REAL, 'II'))
    assert.ok(aliquotaEfetiva(4_000_000 * REAL, 'I') < aliquotaEfetiva(4_000_000 * REAL, 'II'))
  })

  it('empresa sem histórico fica na primeira faixa', () => {
    assert.equal(aliquotaEfetiva(0, 'II'), 4.5)
    assert.equal(aliquotaEfetiva(0, 'I'), 4.0)
  })

  it('escolhe a faixa pelo faturamento dos doze meses', () => {
    assert.equal(faixaDoFaturamento(180_000 * REAL, 'II').aliquota, 4.5)
    assert.equal(faixaDoFaturamento(180_001 * REAL, 'II').aliquota, 7.8)
  })

  it('não devolve imposto negativo se a tabela for editada errado', () => {
    assert.equal(impostoSobre(0, 500_000 * REAL, 'II'), 0)
  })

  it('calcula o imposto em centavos inteiros', () => {
    const valor = impostoSobre(2_280 * REAL, 500_000 * REAL, 'II')

    assert.ok(Number.isInteger(valor))
    assert.equal(valor, 16_480) // R$ 164,80
  })
})

describe('DRE do mês', () => {
  it('desce da receita ao resultado na ordem certa', () => {
    const dre = montarDre({
      rbt12: 500_000 * REAL,
      pedidos: [
        pedido({
          taxaDePagamento: 113 * REAL,
          fretePago: 62 * REAL,
          embalagem: 15 * REAL,
        }),
      ],
      lancamentos: [
        { grupo: 'marketing', categoria: 'Anúncios', valor: 400 * REAL, plataforma: 'Meta' },
        { grupo: 'fixa', categoria: 'Aluguel', valor: 900 * REAL },
      ],
    })

    assert.equal(dre.receitaBruta, 2_360 * REAL)
    assert.equal(dre.receitaDeProdutos, 2_280 * REAL)
    assert.equal(dre.receitaDeFrete, 80 * REAL)

    // Imposto sobre a receita de produtos, no Anexo II, a 7,23%.
    assert.equal(dre.imposto, 16_480)
    assert.equal(dre.receitaLiquida, 2_360 * REAL - 16_480)
    assert.equal(dre.lucroBruto, dre.receitaLiquida - 760 * REAL)
    assert.equal(dre.custosVariaveis, (113 + 62 + 15) * REAL)
    assert.equal(dre.margemDeContribuicao, dre.lucroBruto - dre.custosVariaveis)
    assert.equal(dre.resultado, dre.margemDeContribuicao - 400 * REAL - 900 * REAL)
  })

  it('tira cupom e reembolso da receita', () => {
    const dre = montarDre({
      rbt12: 0,
      pedidos: [pedido({ desconto: 200 * REAL, reembolsado: 100 * REAL })],
      lancamentos: [],
    })

    assert.equal(dre.deducoes, 300 * REAL)
    assert.equal(dre.receitaLiquida, dre.receitaBruta - 300 * REAL - dre.imposto)
  })

  it('separa o tráfego por plataforma', () => {
    // É a conta que ele precisa para decidir se o remarketing no Google
    // se paga: quanto entrou de cada lado.
    const dre = montarDre({
      rbt12: 0,
      pedidos: [pedido()],
      lancamentos: [
        { grupo: 'marketing', categoria: 'Anúncios', valor: 1_200 * REAL, plataforma: 'Meta' },
        { grupo: 'marketing', categoria: 'Remarketing', valor: 300 * REAL, plataforma: 'Google' },
      ],
    })

    assert.equal(dre.marketing, 1_500 * REAL)
    assert.deepEqual(dre.marketingPorPlataforma, [
      { plataforma: 'Meta', valor: 1_200 * REAL },
      { plataforma: 'Google', valor: 300 * REAL },
    ])
    assert.equal(dre.custoPorPedido, 1_500 * REAL)
  })

  it('divide por categoria e ordena pela maior receita', () => {
    const dre = montarDre({
      rbt12: 0,
      pedidos: [
        pedido({
          itens: [
            {
              categoria: 'Velas',
              produto: 'Gota',
              receita: 2_280 * REAL,
              cmv: 760 * REAL,
              pecas: 60,
              anexo: 'II',
            },
            {
              categoria: 'Difusores',
              produto: 'Mini difusor',
              receita: 400 * REAL,
              cmv: 200 * REAL,
              pecas: 20,
              anexo: 'I',
            },
          ],
        }),
      ],
      lancamentos: [],
    })

    assert.equal(dre.porCategoria.length, 2)
    assert.equal(dre.porCategoria[0]?.categoria, 'Velas')
    assert.equal(dre.porCategoria[0]?.lucroBruto, 1_520 * REAL)
    assert.equal(dre.porCategoria[1]?.categoria, 'Difusores')
    assert.equal(dre.porCategoria[1]?.margem, 50)

    // As participações somam 100% da receita de produtos.
    const soma = dre.porCategoria.reduce((total, linha) => total + linha.participacao, 0)
    assert.ok(Math.abs(soma - 100) < 0.2)
  })

  it('produto revendido e produto fabricado pagam tabelas diferentes', () => {
    const industria = montarDre({
      rbt12: 500_000 * REAL,
      pedidos: [
        pedido({
          itens: [
            { categoria: 'Velas', produto: 'x', receita: 1_000 * REAL, cmv: 0, pecas: 20, anexo: 'II' },
          ],
          frete: 0,
        }),
      ],
      lancamentos: [],
    })

    const comercio = montarDre({
      rbt12: 500_000 * REAL,
      pedidos: [
        pedido({
          itens: [
            { categoria: 'Difusores', produto: 'x', receita: 1_000 * REAL, cmv: 0, pecas: 20, anexo: 'I' },
          ],
          frete: 0,
        }),
      ],
      lancamentos: [],
    })

    assert.ok(industria.imposto > comercio.imposto)
  })

  it('mês sem venda não quebra e não mostra infinito', () => {
    const dre = montarDre({
      rbt12: 0,
      pedidos: [],
      lancamentos: [{ grupo: 'fixa', categoria: 'Aluguel', valor: 900 * REAL }],
    })

    assert.equal(dre.receitaBruta, 0)
    assert.equal(dre.margemBruta, 0)
    assert.equal(dre.ticketMedio, 0)
    assert.equal(dre.retornoSobreTrafego, 0)
    assert.equal(dre.resultado, -900 * REAL)
  })

  it('conta o ticket médio sobre a receita bruta', () => {
    const dre = montarDre({
      rbt12: 0,
      pedidos: [pedido(), pedido({ numero: '1002' })],
      lancamentos: [],
    })

    assert.equal(dre.pedidos, 2)
    assert.equal(dre.ticketMedio, 2_360 * REAL)
    assert.equal(dre.pecas, 120)
  })

  it('mantém tudo em centavos inteiros', () => {
    const dre = montarDre({
      rbt12: 333_333 * REAL,
      pedidos: [pedido({ taxaDePagamento: 11_733 })],
      lancamentos: [],
    })

    for (const valor of [dre.receitaBruta, dre.imposto, dre.lucroBruto, dre.resultado]) {
      assert.ok(Number.isInteger(valor), `valor não inteiro: ${valor}`)
    }
  })
})

describe('apoio de datas', () => {
  it('extrai o mês da data do pagamento', () => {
    assert.equal(mesDe('2026-09-10T14:00:00.000Z'), '2026-09')
  })

  it('monta a série dos últimos meses virando o ano', () => {
    assert.deepEqual(ultimosMeses('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('escreve o mês por extenso', () => {
    assert.equal(nomeDoMes('2026-09'), 'setembro de 2026')
    assert.equal(nomeDoMes('2026-03'), 'março de 2026')
  })

  it('percentual não estoura na divisão por zero', () => {
    assert.equal(percentual(100, 0), 0)
    assert.equal(percentual(50, 200), 25)
  })
})
