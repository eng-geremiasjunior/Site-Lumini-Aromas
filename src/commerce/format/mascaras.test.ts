import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  centavosDe,
  formatarReais,
  mascararCep,
  mascararCpfCnpj,
  mascararDinheiro,
  mascararTelefone,
  mascararUf,
} from './mascaras.ts'

describe('mascararTelefone', () => {
  it('monta o celular no formato de sempre', () => {
    assert.equal(mascararTelefone('33999478774'), '(33) 99947-8774')
  })

  it('monta o fixo com quatro dígitos antes do hífen', () => {
    assert.equal(mascararTelefone('3332711234'), '(33) 3271-1234')
  })

  it('vai se formando enquanto se digita', () => {
    assert.equal(mascararTelefone('3'), '(3')
    assert.equal(mascararTelefone('33'), '(33')
    assert.equal(mascararTelefone('339'), '(33) 9')
    // Enquanto cabe num fixo, o hífen fica depois do quarto dígito; quando
    // chega o nono, ele anda uma casa e o número vira celular. É como todo
    // formulário brasileiro se comporta, e é o que a mão já espera.
    assert.equal(mascararTelefone('3399947'), '(33) 9994-7')
    assert.equal(mascararTelefone('3399947877'), '(33) 9994-7877')
    assert.equal(mascararTelefone('33999478774'), '(33) 99947-8774')
  })

  it('joga fora o código do país quando colam com ele', () => {
    assert.equal(mascararTelefone('+55 33 99947-8774'), '(33) 99947-8774')
  })

  it('ignora o que não é dígito', () => {
    assert.equal(mascararTelefone('(33) 99947-8774'), '(33) 99947-8774')
  })

  it('não deixa passar de onze dígitos', () => {
    assert.equal(mascararTelefone('339994787740000'), '(33) 99947-8774')
  })
})

describe('mascararCpfCnpj', () => {
  it('escreve CPF com os pontos e o hífen', () => {
    assert.equal(mascararCpfCnpj('52998224725'), '529.982.247-25')
  })

  it('vira CNPJ sozinho quando passa de onze dígitos', () => {
    assert.equal(mascararCpfCnpj('11222333000181'), '11.222.333/0001-81')
  })

  it('vai se formando enquanto se digita', () => {
    assert.equal(mascararCpfCnpj('529'), '529')
    assert.equal(mascararCpfCnpj('529982'), '529.982')
    assert.equal(mascararCpfCnpj('5299822'), '529.982.2')
    assert.equal(mascararCpfCnpj('529982247'), '529.982.247')
  })

  it('aceita o que já veio pontuado sem duplicar nada', () => {
    assert.equal(mascararCpfCnpj('529.982.247-25'), '529.982.247-25')
  })
})

describe('mascararCep', () => {
  it('escreve com o hífen', () => {
    assert.equal(mascararCep('35010000'), '35010-000')
  })

  it('mostra que falta dígito em vez de esconder', () => {
    // Sem máscara, "3501000" parece um CEP inteiro. Com ela, a falta salta.
    assert.equal(mascararCep('3501000'), '35010-00')
  })

  it('não deixa passar de oito dígitos', () => {
    assert.equal(mascararCep('350100001234'), '35010-000')
  })
})

describe('dinheiro', () => {
  it('preenche da direita, como máquina de cartão', () => {
    assert.equal(mascararDinheiro('1'), 'R$ 0,01')
    assert.equal(mascararDinheiro('100'), 'R$ 1,00')
    assert.equal(mascararDinheiro('100000'), 'R$ 1.000,00')
    assert.equal(mascararDinheiro('228000'), 'R$ 2.280,00')
  })

  it('separa o milhar', () => {
    assert.equal(formatarReais(1_100_000), 'R$ 11.000,00')
    assert.equal(formatarReais(123_456_789), 'R$ 1.234.567,89')
  })

  it('devolve centavos inteiros, nunca float', () => {
    assert.equal(centavosDe('R$ 1.000,00'), 100000)
    assert.equal(Number.isInteger(centavosDe('R$ 2.280,00')), true)
  })

  it('campo vazio é zero, não é erro', () => {
    assert.equal(centavosDe(''), 0)
    assert.equal(mascararDinheiro(''), 'R$ 0,00')
  })

  it('ida e volta não perde centavo', () => {
    for (const centavos of [1, 99, 100, 3800, 228000, 1100000]) {
      assert.equal(centavosDe(formatarReais(centavos)), centavos)
    }
  })

  it('usa espaço comum depois do R$, para poder comparar com texto', () => {
    // O Intl do Node coloca um espaço estreito não separável aqui, e é ele
    // que faz uma busca por "R$ 2.280,00" não encontrar nada.
    assert.equal(formatarReais(228000).charCodeAt(2), 32)
  })
})

describe('mascararUf', () => {
  it('deixa duas letras maiúsculas', () => {
    assert.equal(mascararUf('mg'), 'MG')
    assert.equal(mascararUf('minas'), 'MI')
    assert.equal(mascararUf('m1g'), 'MG')
  })
})
