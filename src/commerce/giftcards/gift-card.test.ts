import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  MESES_DE_VALIDADE,
  aplicarCartao,
  estaExpirado,
  gerarCodigo,
  normalizarCodigo,
  situacaoAposUso,
  validadePadrao,
  valoresDisponiveis,
  type CartaoPresente,
} from './gift-card.ts'

const AGORA = new Date('2026-09-12T12:00:00.000Z')

const CARTAO: CartaoPresente = {
  codigo: 'ABCD-EFGH-JKLM-NPQR',
  valorCentavos: 114000,
  saldoCentavos: 114000,
  situacao: 'ativo',
  validoAte: '2027-09-12T12:00:00.000Z',
}

describe('gerarCodigo', () => {
  it('sai em quatro grupos de quatro, como se lê ao telefone', () => {
    assert.match(gerarCodigo(), /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  })

  it('não usa os caracteres que se confundem ao copiar do papel', () => {
    // O e 0, I e 1, S e 5: quem digita erra, e o erro vira "cartão inválido".
    for (let i = 0; i < 200; i += 1) {
      assert.ok(!/[O0I1S5]/.test(gerarCodigo()))
    }
  })

  it('não repete na prática', () => {
    const codigos = new Set(Array.from({ length: 500 }, () => gerarCodigo()))
    assert.equal(codigos.size, 500)
  })
})

describe('normalizarCodigo', () => {
  it('aceita como a pessoa digitou', () => {
    assert.equal(normalizarCodigo('abcd efgh jklm npqr'), 'ABCD-EFGH-JKLM-NPQR')
    assert.equal(normalizarCodigo('ABCD-EFGH-JKLM-NPQR'), 'ABCD-EFGH-JKLM-NPQR')
    assert.equal(normalizarCodigo('abcdefghjklmnpqr'), 'ABCD-EFGH-JKLM-NPQR')
  })
})

describe('aplicarCartao', () => {
  it('paga o pedido inteiro quando o saldo cobre', () => {
    const resultado = aplicarCartao(CARTAO, 76000, AGORA)

    assert.ok(resultado.ok)
    assert.equal(resultado.abatido, 76000)
    assert.equal(resultado.saldoRestante, 38000)
  })

  it('guarda o troco em vez de engolir', () => {
    // Quem ganhou R$ 1.140 e gastou R$ 760 continua com R$ 380. Perder o
    // troco é prática abusiva.
    const resultado = aplicarCartao(CARTAO, 76000, AGORA)
    assert.ok(resultado.ok && resultado.saldoRestante === 38000)
  })

  it('abate o que tem quando o pedido é maior, sem recusar', () => {
    const resultado = aplicarCartao({ ...CARTAO, saldoCentavos: 38000 }, 236900, AGORA)

    assert.ok(resultado.ok)
    assert.equal(resultado.abatido, 38000)
    assert.equal(resultado.saldoRestante, 0)
  })

  it('recusa cartão sem saldo', () => {
    const resultado = aplicarCartao({ ...CARTAO, saldoCentavos: 0 }, 76000, AGORA)
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('já foi usado'))
  })

  it('recusa cartão cancelado', () => {
    const resultado = aplicarCartao({ ...CARTAO, situacao: 'cancelado' }, 76000, AGORA)
    assert.equal(resultado.ok, false)
  })

  it('recusa cartão vencido, mandando falar com a loja', () => {
    const resultado = aplicarCartao({ ...CARTAO, validoAte: '2026-01-01T00:00:00.000Z' }, 76000, AGORA)
    assert.equal(resultado.ok, false)
    assert.ok(!resultado.ok && resultado.motivo.includes('Fale com a gente'))
  })

  it('cartão sem validade nunca vence', () => {
    const resultado = aplicarCartao({ ...CARTAO, validoAte: null }, 76000, AGORA)
    assert.equal(resultado.ok, true)
  })

  it('nada a pagar não consome saldo', () => {
    const resultado = aplicarCartao(CARTAO, 0, AGORA)
    assert.equal(resultado.ok, false)
  })

  it('o abatimento é sempre inteiro em centavos', () => {
    const resultado = aplicarCartao({ ...CARTAO, saldoCentavos: 33333 }, 76000, AGORA)
    assert.ok(resultado.ok)
    assert.equal(Number.isInteger(resultado.abatido), true)
  })
})

describe('validade', () => {
  it('o padrão é um ano', () => {
    const limite = new Date(validadePadrao(AGORA))
    assert.equal(limite.getUTCFullYear(), 2027)
    assert.equal(MESES_DE_VALIDADE, 12)
  })

  it('data inválida não vira cartão vencido por engano', () => {
    assert.equal(estaExpirado({ validoAte: 'qualquer coisa' }, AGORA), false)
  })
})

describe('situacaoAposUso', () => {
  it('some da lista de ativos quando zera', () => {
    assert.equal(situacaoAposUso(0), 'usado')
  })

  it('continua ativo com troco', () => {
    assert.equal(situacaoAposUso(38000), 'ativo')
  })
})

describe('valoresDisponiveis', () => {
  it('tira os valores da tabela de lotes, sem repetir e em ordem', () => {
    assert.deepEqual(valoresDisponiveis([114000, 76000, 76000, 152000]), [76000, 114000, 152000])
  })

  it('ignora preço zerado', () => {
    assert.deepEqual(valoresDisponiveis([0, 76000]), [76000])
  })

  it('nunca inventa valor redondo fora da tabela', () => {
    // Um cartão de R$ 500 não compra o lote mínimo de R$ 760, e quem recebe
    // só descobre na hora de usar.
    const valores = valoresDisponiveis([76000, 114000, 152000, 228000])
    assert.ok(valores.every((valor) => [76000, 114000, 152000, 228000].includes(valor)))
  })

  it('quando há muitos lotes, espalha em vez de pegar só os menores', () => {
    const lotes = [76000, 114000, 152000, 190000, 228000, 266000, 304000, 380000, 570000, 760000]
    const valores = valoresDisponiveis(lotes, 4)

    assert.equal(valores.length, 4)
    assert.equal(valores[0], 76000)
    assert.equal(valores.at(-1), 760000)
  })

  it('devolve tudo quando cabe', () => {
    assert.deepEqual(valoresDisponiveis([76000, 114000], 6), [76000, 114000])
  })
})
