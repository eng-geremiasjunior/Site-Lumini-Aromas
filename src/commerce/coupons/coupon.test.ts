import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  aplicarCupom,
  normalizarCodigo,
  totalComCupom,
  type ContextoDoCupom,
  type Cupom,
} from './coupon.ts'

const DEZ_POR_CENTO: Cupom = {
  codigo: 'PARCEIRO10',
  tipo: 'percentual',
  percentual: 10,
  ativo: true,
}

const CARRINHO: ContextoDoCupom = {
  linhas: [{ produtoId: 'p1', categoriaId: 'c1', total: 228000 }],
  subtotal: 228000,
  freteCentavos: 8900,
  agora: new Date('2026-09-11T12:00:00.000Z'),
}

describe('normalizarCodigo', () => {
  it('não faz a cliente sofrer com caixa e espaço', () => {
    assert.equal(normalizarCodigo(' parceiro 10 '), 'PARCEIRO10')
  })
})

describe('percentual', () => {
  it('desconta sobre o subtotal', () => {
    const resultado = aplicarCupom(DEZ_POR_CENTO, CARRINHO)
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.descontoCentavos, 22800)
  })

  it('arredonda para o centavo, sem sobrar fração', () => {
    const resultado = aplicarCupom(
      { ...DEZ_POR_CENTO, percentual: 7 },
      { ...CARRINHO, linhas: [{ produtoId: 'p1', total: 33333 }], subtotal: 33333 },
    )
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.descontoCentavos, 2333)
    assert.equal(Number.isInteger(resultado.cupom.descontoCentavos), true)
  })
})

describe('valor fixo', () => {
  const CEM_REAIS: Cupom = { codigo: 'BEMVINDA', tipo: 'valor', valorCentavos: 10000, ativo: true }

  it('desconta o valor combinado', () => {
    const resultado = aplicarCupom(CEM_REAIS, CARRINHO)
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.descontoCentavos, 10000)
  })

  it('nunca desconta mais do que o carrinho vale', () => {
    const resultado = aplicarCupom(CEM_REAIS, {
      ...CARRINHO,
      linhas: [{ produtoId: 'p1', total: 5000 }],
      subtotal: 5000,
    })
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.descontoCentavos, 5000)
  })
})

describe('frete grátis', () => {
  it('não mexe no subtotal, zera o frete', () => {
    const resultado = aplicarCupom({ codigo: 'FRETE', tipo: 'frete_gratis', ativo: true }, CARRINHO)
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.descontoCentavos, 0)
    assert.equal(resultado.cupom.freteGratis, true)

    const totais = totalComCupom(228000, 8900, resultado.cupom)
    assert.equal(totais.frete, 0)
    assert.equal(totais.total, 228000)
  })
})

describe('validade', () => {
  it('recusa cupom desligado', () => {
    const resultado = aplicarCupom({ ...DEZ_POR_CENTO, ativo: false }, CARRINHO)
    assert.equal(resultado.ok, false)
  })

  it('recusa antes de começar', () => {
    const resultado = aplicarCupom(
      { ...DEZ_POR_CENTO, validoDe: '2026-10-01T00:00:00.000Z' },
      CARRINHO,
    )
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('ainda não'))
  })

  it('recusa depois de expirar', () => {
    const resultado = aplicarCupom(
      { ...DEZ_POR_CENTO, validoAte: '2026-09-01T00:00:00.000Z' },
      CARRINHO,
    )
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('expirou'))
  })

  it('aceita dentro da janela', () => {
    const resultado = aplicarCupom(
      {
        ...DEZ_POR_CENTO,
        validoDe: '2026-09-01T00:00:00.000Z',
        validoAte: '2026-12-31T23:59:59.000Z',
      },
      CARRINHO,
    )
    assert.equal(resultado.ok, true)
  })
})

describe('gasto mínimo', () => {
  it('explica o valor que falta em vez de só recusar', () => {
    const resultado = aplicarCupom(
      { ...DEZ_POR_CENTO, gastoMinimoCentavos: 300000 },
      CARRINHO,
    )
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('3.000,00'))
  })
})

describe('limites de uso', () => {
  it('para quando o cupom acabou', () => {
    const resultado = aplicarCupom({ ...DEZ_POR_CENTO, usoMaximo: 5 }, { ...CARRINHO, usos: 5 })
    assert.equal(resultado.ok, false)
  })

  it('deixa usar enquanto sobra', () => {
    const resultado = aplicarCupom({ ...DEZ_POR_CENTO, usoMaximo: 5 }, { ...CARRINHO, usos: 4 })
    assert.equal(resultado.ok, true)
  })

  it('respeita o limite por pessoa', () => {
    const resultado = aplicarCupom(
      { ...DEZ_POR_CENTO, usoMaximoPorCliente: 1 },
      { ...CARRINHO, usosDoCliente: 1 },
    )
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('Você já usou'))
  })
})

describe('cupom restrito a e-mail', () => {
  const CORPORATIVO: Cupom = {
    ...DEZ_POR_CENTO,
    codigo: 'HOSPITAL',
    emailsPermitidos: ['*@hospital.com.br', 'diretoria@outra.com'],
  }

  it('aceita qualquer e-mail do domínio combinado', () => {
    const resultado = aplicarCupom(CORPORATIVO, { ...CARRINHO, email: 'Ana@Hospital.com.br' })
    assert.equal(resultado.ok, true)
  })

  it('aceita o e-mail exato da lista', () => {
    const resultado = aplicarCupom(CORPORATIVO, { ...CARRINHO, email: 'diretoria@outra.com' })
    assert.equal(resultado.ok, true)
  })

  it('recusa quem não está na lista', () => {
    const resultado = aplicarCupom(CORPORATIVO, { ...CARRINHO, email: 'ana@gmail.com' })
    assert.equal(resultado.ok, false)
  })

  it('recusa quando ainda não sabemos o e-mail', () => {
    const resultado = aplicarCupom(CORPORATIVO, { ...CARRINHO, email: null })
    assert.equal(resultado.ok, false)
  })

  it('domínio parecido não engana: hospital.com.br.golpe.com', () => {
    const resultado = aplicarCupom(CORPORATIVO, {
      ...CARRINHO,
      email: 'ana@hospital.com.br.golpe.com',
    })
    assert.equal(resultado.ok, false)
  })
})

describe('cupom restrito a produtos', () => {
  const SO_BOMBONIERE: Cupom = { ...DEZ_POR_CENTO, produtos: ['p1'] }

  const DOIS_ITENS: ContextoDoCupom = {
    ...CARRINHO,
    linhas: [
      { produtoId: 'p1', categoriaId: 'c1', total: 100000 },
      { produtoId: 'p2', categoriaId: 'c2', total: 100000 },
    ],
    subtotal: 200000,
  }

  it('desconta só sobre a linha que se encaixa', () => {
    const resultado = aplicarCupom(SO_BOMBONIERE, DOIS_ITENS)
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.baseCentavos, 100000)
    assert.equal(resultado.cupom.descontoCentavos, 10000)
  })

  it('recusa quando nenhum item do carrinho se encaixa', () => {
    const resultado = aplicarCupom({ ...DEZ_POR_CENTO, produtos: ['p9'] }, DOIS_ITENS)
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('não vale para os itens'))
  })

  it('restrição por categoria também vale', () => {
    const resultado = aplicarCupom({ ...DEZ_POR_CENTO, categorias: ['c2'] }, DOIS_ITENS)
    assert.ok(resultado.ok)
    assert.equal(resultado.cupom.baseCentavos, 100000)
  })
})

describe('cupom mal configurado', () => {
  it('não aplica desconto de zero em silêncio', () => {
    const resultado = aplicarCupom({ codigo: 'VAZIO', tipo: 'valor', ativo: true }, CARRINHO)
    assert.equal(resultado.ok, false)
  })
})

describe('totalComCupom', () => {
  it('sem cupom, é subtotal mais frete', () => {
    assert.deepEqual(totalComCupom(228000, 8900, null), {
      desconto: 0,
      frete: 8900,
      total: 236900,
    })
  })

  it('com desconto, abate do subtotal e mantém o frete', () => {
    const resultado = aplicarCupom(DEZ_POR_CENTO, CARRINHO)
    assert.ok(resultado.ok)
    assert.deepEqual(totalComCupom(228000, 8900, resultado.cupom), {
      desconto: 22800,
      frete: 8900,
      total: 214100,
    })
  })

  it('o total nunca fica negativo', () => {
    const totais = totalComCupom(5000, 0, {
      codigo: 'X',
      tipo: 'valor',
      descontoCentavos: 900000,
      freteGratis: false,
      baseCentavos: 5000,
    })
    assert.equal(totais.total, 0)
  })
})
