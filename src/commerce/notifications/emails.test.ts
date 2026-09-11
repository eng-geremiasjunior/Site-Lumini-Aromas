import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { emHtml, linkDoPedido, montarEmail, type DadosDoEmail, type TipoDeEmail } from './emails.ts'

const BASE: DadosDoEmail = {
  numero: '5012',
  nome: 'Ana Clara',
  email: 'ana@exemplo.com.br',
  token: 'b8709f0f-a55f-4ab7-8bf2-32fb2689fd95',
  urlDaLoja: 'https://luminiaromas.com.br',
  whatsapp: '5533999478774',
  totalCentavos: 236900,
  itens: [{ descricao: 'Vela gota de cristal · Lavanda', quantidade: 60 }],
  eventType: 'Casamento',
  eventDate: '2026-10-12T00:00:00.000Z',
}

const TODOS: TipoDeEmail[] = [
  'pedido_recebido',
  'pagamento_aprovado',
  'arte_para_aprovar',
  'em_producao',
  'pedido_enviado',
  'pedido_entregue',
  'pedido_cancelado',
]

describe('montarEmail', () => {
  it('toda mensagem leva o número do pedido no assunto ou no corpo', () => {
    for (const tipo of TODOS) {
      const email = montarEmail(tipo, BASE)
      assert.ok(
        email.assunto.includes('5012') || email.texto.includes('5012'),
        `${tipo} não identifica o pedido`,
      )
    }
  })

  it('toda mensagem leva o link direto da área da cliente', () => {
    for (const tipo of TODOS) {
      const email = montarEmail(tipo, BASE)
      assert.ok(
        email.texto.includes('/minhaconta/pedido/b8709f0f-a55f-4ab7-8bf2-32fb2689fd95/'),
        `${tipo} não leva o link do pedido`,
      )
    }
  })

  it('toda mensagem lembra o par que abre a área: número e e-mail', () => {
    for (const tipo of TODOS) {
      const email = montarEmail(tipo, BASE)
      assert.ok(email.texto.includes('ana@exemplo.com.br'), `${tipo} não lembra o e-mail da compra`)
    }
  })

  it('toda mensagem oferece o WhatsApp como saída', () => {
    for (const tipo of TODOS) {
      const email = montarEmail(tipo, BASE)
      assert.ok(email.texto.includes('wa.me/5533999478774'), `${tipo} não oferece o WhatsApp`)
    }
  })

  it('chama a cliente pelo nome logo na primeira linha', () => {
    for (const tipo of TODOS) {
      const email = montarEmail(tipo, BASE)
      assert.ok(email.texto.startsWith('Ana Clara,'), `${tipo} não começa falando com ela`)
    }
  })
})

describe('prazo prometido', () => {
  // Prazo anunciado vincula o fornecedor (CDC art. 35). A mensagem só pode
  // citar data quando ela foi calculada no pedido.
  it('não inventa previsão quando o pedido não tem prazo calculado', () => {
    const email = montarEmail('pagamento_aprovado', { ...BASE, prazoPrometido: null })
    assert.ok(!email.texto.includes('Previsão de entrega'))
  })

  it('usa a data do pedido quando ela existe', () => {
    const email = montarEmail('pagamento_aprovado', {
      ...BASE,
      prazoPrometido: '2026-09-30T00:00:00.000Z',
    })
    assert.ok(email.texto.includes('Previsão de entrega: 30 de setembro.'))
  })
})

describe('aprovação de arte', () => {
  it('deixa claro que nada é produzido antes da aprovação', () => {
    const email = montarEmail('arte_para_aprovar', BASE)
    assert.ok(email.texto.includes('nada é produzido'))
  })

  it('oferece o caminho de pedir ajuste, não só o de aprovar', () => {
    const email = montarEmail('arte_para_aprovar', BASE)
    assert.ok(email.texto.toLowerCase().includes('ajuste'))
  })
})

describe('pedido enviado', () => {
  it('leva o código e o link de rastreio quando já existem', () => {
    const email = montarEmail('pedido_enviado', {
      ...BASE,
      codigoRastreio: 'BR123456789BR',
      transportadora: 'Jadlog .Package',
    })
    assert.ok(email.texto.includes('BR123456789BR'))
    assert.ok(email.texto.includes('melhorrastreio.com.br/rastreio/BR123456789BR'))
    assert.ok(email.texto.includes('Jadlog'))
  })

  it('não finge que existe rastreio quando a transportadora ainda não liberou', () => {
    const email = montarEmail('pedido_enviado', { ...BASE, codigoRastreio: null })
    assert.ok(!email.texto.includes('melhorrastreio'))
    assert.ok(email.texto.includes('assim que a transportadora liberar'))
  })
})

describe('cancelamento', () => {
  it('não acusa a cliente e deixa a porta aberta', () => {
    const email = montarEmail('pedido_cancelado', BASE)
    assert.ok(email.texto.includes('engano'))
  })

  it('mostra o motivo quando existe', () => {
    const email = montarEmail('pedido_cancelado', { ...BASE, motivo: 'Pix não foi pago a tempo' })
    assert.ok(email.texto.includes('Pix não foi pago a tempo'))
  })
})

describe('evento da cliente', () => {
  it('cita o evento quando o pedido sabe qual é', () => {
    const email = montarEmail('pedido_recebido', BASE)
    assert.ok(email.texto.includes('casamento de 12 de outubro'))
  })

  it('funciona sem evento nenhum, sem deixar buraco no texto', () => {
    const email = montarEmail('pedido_recebido', { ...BASE, eventType: null, eventDate: null })
    assert.ok(!email.texto.includes('undefined'))
    assert.ok(!email.texto.includes('null'))
    assert.ok(email.texto.includes('5012'))
  })
})

describe('linkDoPedido', () => {
  it('não duplica a barra quando a URL da loja termina com uma', () => {
    const link = linkDoPedido({ urlDaLoja: 'https://luminiaromas.com.br/', token: 'abc' })
    assert.equal(link, 'https://luminiaromas.com.br/minhaconta/pedido/abc/')
  })
})

describe('emHtml', () => {
  it('transforma os links do texto em links clicáveis', () => {
    const html = emHtml(montarEmail('arte_para_aprovar', BASE), BASE.urlDaLoja)
    assert.ok(html.includes('<a href="https://luminiaromas.com.br/minhaconta/pedido/'))
  })

  it('escapa o que a cliente escreveu, para o e-mail não virar vetor de HTML', () => {
    const html = emHtml(
      montarEmail('pedido_cancelado', { ...BASE, motivo: '<script>alert(1)</script>' }),
      BASE.urlDaLoja,
    )
    assert.ok(!html.includes('<script>'))
    assert.ok(html.includes('&lt;script&gt;'))
  })

  it('não perde nenhum parágrafo do texto', () => {
    const email = montarEmail('pedido_recebido', BASE)
    const html = emHtml(email, BASE.urlDaLoja)
    const blocos = email.texto.split('\n\n').length
    assert.equal(html.split('<p style="margin:0 0 1rem').length - 1, blocos)
  })
})
