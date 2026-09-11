import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  ESPERAS_EM_MINUTOS,
  MAXIMO_DE_TENTATIVAS,
  estaNaVez,
  eventosDaTransicao,
  proximaTentativa,
  situacaoAposFalha,
} from './outbox.ts'

describe('eventosDaTransicao', () => {
  it('pedido criado gera o e-mail de recebimento', () => {
    const eventos = eventosDaTransicao({ numero: '5012', de: null, para: 'pending' })
    assert.equal(eventos.length, 1)
    assert.equal(eventos[0].payload.tipoDeEmail, 'pedido_recebido')
  })

  it('pagamento aprovado avisa a cliente', () => {
    const eventos = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    assert.equal(eventos[0].payload.tipoDeEmail, 'pagamento_aprovado')
  })

  it('não produz nada quando a situação não mudou', () => {
    assert.deepEqual(
      eventosDaTransicao({ numero: '5012', de: 'production', para: 'production' }),
      [],
    )
  })

  it('situação sem mensagem própria não gera e-mail', () => {
    assert.deepEqual(
      eventosDaTransicao({ numero: '5012', de: 'processing', para: 'disputed' }),
      [],
    )
  })

  it('cada etapa do caminho avisa a cliente uma vez', () => {
    const caminho = [
      ['pending', 'processing'],
      ['processing', 'art_approval'],
      ['art_approval', 'production'],
      ['production', 'shipped'],
      ['shipped', 'completed'],
    ] as const

    for (const [de, para] of caminho) {
      const eventos = eventosDaTransicao({ numero: '5012', de, para })
      assert.equal(eventos.length, 1, `${de} → ${para} deveria avisar a cliente`)
    }
  })
})

describe('chave de deduplicação', () => {
  // O webhook do Mercado Pago repete notificação. Sem esta chave, a cliente
  // recebe "pagamento aprovado" duas ou três vezes.
  it('é a mesma para o mesmo efeito no mesmo pedido', () => {
    const primeira = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    const repetida = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    assert.equal(primeira[0].dedupeKey, repetida[0].dedupeKey)
  })

  it('muda entre pedidos diferentes', () => {
    const a = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    const b = eventosDaTransicao({ numero: '5013', de: 'pending', para: 'processing' })
    assert.notEqual(a[0].dedupeKey, b[0].dedupeKey)
  })

  it('muda entre efeitos diferentes do mesmo pedido', () => {
    const pago = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    const enviado = eventosDaTransicao({ numero: '5012', de: 'production', para: 'shipped' })
    assert.notEqual(pago[0].dedupeKey, enviado[0].dedupeKey)
  })

  it('o pedido que vai e volta de situação não reenvia a mesma mensagem', () => {
    // Cancelado por engano e reaberto: a chave de "pagamento aprovado"
    // continua sendo a mesma, então o segundo envio não sai.
    const primeiro = eventosDaTransicao({ numero: '5012', de: 'pending', para: 'processing' })
    const segundo = eventosDaTransicao({ numero: '5012', de: 'cancelled', para: 'processing' })
    assert.equal(primeiro[0].dedupeKey, segundo[0].dedupeKey)
  })
})

describe('proximaTentativa', () => {
  const agora = new Date('2026-09-11T12:00:00.000Z')

  it('espera pouco na primeira falha e muito na última', () => {
    const primeira = proximaTentativa(1, agora)!
    const ultima = proximaTentativa(ESPERAS_EM_MINUTOS.length, agora)!

    assert.equal(primeira.getTime() - agora.getTime(), 60_000)
    assert.equal(ultima.getTime() - agora.getTime(), 360 * 60_000)
  })

  it('para de reagendar depois do limite', () => {
    assert.equal(proximaTentativa(MAXIMO_DE_TENTATIVAS, agora), null)
  })
})

describe('situacaoAposFalha', () => {
  it('continua tentando enquanto há tentativa sobrando', () => {
    assert.equal(situacaoAposFalha(1), 'falhou')
  })

  it('desiste depois do limite, mas não some do painel', () => {
    assert.equal(situacaoAposFalha(MAXIMO_DE_TENTATIVAS), 'desistiu')
  })
})

describe('estaNaVez', () => {
  const agora = new Date('2026-09-11T12:00:00.000Z')

  it('evento novo sai na hora', () => {
    assert.equal(estaNaVez({ situacao: 'pendente' }, agora), true)
  })

  it('evento que falhou espera a hora marcada', () => {
    assert.equal(
      estaNaVez({ situacao: 'falhou', proximaTentativaEm: '2026-09-11T12:05:00.000Z' }, agora),
      false,
    )
    assert.equal(
      estaNaVez({ situacao: 'falhou', proximaTentativaEm: '2026-09-11T11:59:00.000Z' }, agora),
      true,
    )
  })

  it('evento já enviado nunca sai de novo', () => {
    assert.equal(estaNaVez({ situacao: 'enviado' }, agora), false)
  })

  it('evento desistido só sai se alguém mandar à mão', () => {
    assert.equal(estaNaVez({ situacao: 'desistiu', proximaTentativaEm: null }, agora), false)
  })
})
