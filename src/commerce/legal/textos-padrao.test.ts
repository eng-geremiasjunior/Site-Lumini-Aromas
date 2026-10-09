import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PRIVACIDADE, TERMOS, TEXTOS_LEGAIS, TROCAS, paraLexical } from './textos-padrao.ts'

describe('textos legais padrão', () => {
  it('cobre os três campos do painel, sem repetir nenhum', () => {
    const campos = TEXTOS_LEGAIS.map((t) => t.campo)
    assert.deepEqual([...campos].sort(), ['privacyPolicy', 'returnPolicy', 'termsOfUse'])
  })

  it('não tem bloco vazio', () => {
    for (const texto of TEXTOS_LEGAIS) {
      assert.ok(texto.blocos.length > 0, `${texto.campo} sem blocos`)
      assert.ok(texto.titulo.length > 0)
      assert.ok(texto.resumo.length > 0)

      for (const bloco of texto.blocos) {
        if (bloco.tipo === 'lista') {
          assert.ok(bloco.itens.length > 0, `lista vazia em ${texto.campo}`)
          for (const item of bloco.itens) assert.ok(item.trim().length > 0)
        } else {
          assert.ok(bloco.texto.trim().length > 0, `bloco vazio em ${texto.campo}`)
        }
      }
    }
  })

  // O prazo de 7 dias é o compromisso que separa esta loja do risco que o
  // TJSP reconheceu em 2025: produto personalizado não afasta o art. 49.
  // Se alguém reescrever o texto e tirar isso, o teste cai.
  it('promete o arrependimento de 7 dias mesmo em peça personalizada', () => {
    const corrido = JSON.stringify(TROCAS.blocos).toLowerCase()
    assert.match(corrido, /7 dias/)
    assert.match(corrido, /personalizad/)
    assert.match(corrido, /artigo 49/)
  })

  it('a privacidade lista com quem os dados são compartilhados', () => {
    const corrido = JSON.stringify(PRIVACIDADE.blocos).toLowerCase()
    for (const parceiro of ['mercado pago', 'melhor envio', 'meta', 'google']) {
      assert.ok(corrido.includes(parceiro), `não cita ${parceiro}`)
    }
  })

  it('os termos dizem como o preço do lote é formado', () => {
    const corrido = JSON.stringify(TERMOS.blocos).toLowerCase()
    assert.match(corrido, /multiplica/)
    assert.match(corrido, /quantidade mínima/)
  })
})

describe('conversão para o editor do painel', () => {
  it('monta um documento com um nó por bloco', () => {
    const doc = paraLexical(TROCAS.blocos) as {
      root: { type: string; children: Array<{ type: string }> }
    }

    assert.equal(doc.root.type, 'root')
    assert.equal(doc.root.children.length, TROCAS.blocos.length)
  })

  it('traduz título, parágrafo e lista para os nós certos', () => {
    const doc = paraLexical([
      { tipo: 'titulo', texto: 'Um título' },
      { tipo: 'paragrafo', texto: 'Um parágrafo.' },
      { tipo: 'lista', itens: ['Primeiro', 'Segundo'] },
    ]) as {
      root: {
        children: Array<{
          type: string
          tag?: string
          children: Array<{ type: string; text?: string; children?: Array<{ text: string }> }>
        }>
      }
    }

    const [titulo, paragrafo, lista] = doc.root.children

    assert.equal(titulo?.type, 'heading')
    assert.equal(titulo?.tag, 'h2')
    assert.equal(titulo?.children[0]?.text, 'Um título')

    assert.equal(paragrafo?.type, 'paragraph')
    assert.equal(paragrafo?.children[0]?.text, 'Um parágrafo.')

    assert.equal(lista?.type, 'list')
    assert.equal(lista?.children.length, 2)
    assert.equal(lista?.children[0]?.type, 'listitem')
    assert.equal(lista?.children[1]?.children?.[0]?.text, 'Segundo')
  })

  it('todo nó carrega versão, que é o que o editor exige para abrir', () => {
    const doc = paraLexical(PRIVACIDADE.blocos) as {
      root: { version: number; children: Array<{ version: number; children: unknown[] }> }
    }

    assert.equal(doc.root.version, 1)
    for (const no of doc.root.children) {
      assert.equal(no.version, 1)
      assert.ok(no.children.length > 0)
    }
  })
})
