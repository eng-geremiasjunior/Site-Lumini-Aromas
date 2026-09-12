import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { linkDeRetorno, montarLembrete, type DadosDoLembrete } from './emails-carrinho.ts'

const BASE: DadosDoLembrete = {
  nome: 'Ana',
  urlDaLoja: 'https://luminiaromas.com.br',
  tokenDeRecuperacao: 'f1f2f3f4-0000-0000-0000-aaaaaaaaaaaa',
  whatsapp: '5533999478774',
  itens: [{ descricao: 'Bomboniere · Lavanda', quantidade: 60 }],
  subtotalCentavos: 228000,
  instagram: 'https://instagram.com/luminiaromas',
}

const PASSOS = [1, 2, 3]

describe('lembretes de carrinho', () => {
  it('nenhum deles oferece desconto', () => {
    // É a regra de posicionamento da marca, e a mais fácil de quebrar sem
    // querer: este teste existe para o cupom nunca entrar aqui por descuido.
    for (const passo of PASSOS) {
      const texto = montarLembrete(passo, BASE).texto.toLowerCase()
      for (const palavra of ['desconto', 'cupom', '% off', 'promoção', 'oferta']) {
        assert.ok(!texto.includes(palavra), `lembrete ${passo} fala em "${palavra}"`)
      }
    }
  })

  it('todos devolvem o carrinho montado', () => {
    for (const passo of PASSOS) {
      const texto = montarLembrete(passo, BASE).texto
      assert.ok(texto.includes('/retomar/f1f2f3f4-0000-0000-0000-aaaaaaaaaaaa/'))
    }
  })

  it('todos oferecem o caminho de não receber mais', () => {
    for (const passo of PASSOS) {
      const texto = montarLembrete(passo, BASE).texto
      assert.ok(texto.includes('/nao-quero-lembrete/'), `lembrete ${passo} não tem saída`)
    }
  })

  it('todos mostram o que ela montou', () => {
    for (const passo of PASSOS) {
      const texto = montarLembrete(passo, BASE).texto
      assert.ok(texto.includes('60 × Bomboniere · Lavanda'))
      // O espaço depois de "R$" que o Intl gera não é o espaço comum.
      assert.match(texto, /R\$\s2\.280,00/)
    }
  })

  it('cada assunto é diferente do outro', () => {
    const assuntos = PASSOS.map((passo) => montarLembrete(passo, BASE).assunto)
    assert.equal(new Set(assuntos).size, PASSOS.length)
  })

  it('funciona sem o nome, sem deixar buraco no texto', () => {
    const texto = montarLembrete(1, { ...BASE, nome: null }).texto
    assert.ok(texto.startsWith('Olá,'))
    assert.ok(!texto.includes('undefined'))
  })

  it('o segundo não cita o Instagram quando não há link', () => {
    const texto = montarLembrete(2, { ...BASE, instagram: null }).texto
    assert.ok(!texto.includes('Ver o nosso trabalho'))
    assert.ok(!texto.includes('null'))
  })

  it('o terceiro fala de prazo e de data, que é o argumento verdadeiro', () => {
    const texto = montarLembrete(3, BASE).texto.toLowerCase()
    assert.ok(texto.includes('prazo'))
    assert.ok(texto.includes('data'))
  })

  it('o terceiro avisa que é o último', () => {
    assert.ok(montarLembrete(3, BASE).texto.includes('para de escrever'))
  })
})

describe('linkDeRetorno', () => {
  it('não duplica a barra da loja', () => {
    assert.equal(
      linkDeRetorno({ urlDaLoja: 'https://luminiaromas.com.br/', tokenDeRecuperacao: 'abc' }),
      'https://luminiaromas.com.br/retomar/abc/',
    )
  })
})
