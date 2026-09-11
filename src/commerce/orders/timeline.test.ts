import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { construirLinhaDoTempo, contarAteOEvento, tituloDoPedido } from './timeline.ts'

const base = {
  status: 'processing' as const,
  temArte: false,
  criadoEm: '2026-09-01T10:00:00Z',
}

describe('linha do tempo', () => {
  test('mostra as cinco etapas quando o pedido não tem arte', () => {
    const etapas = construirLinhaDoTempo(base)
    assert.deepEqual(
      etapas.map((e) => e.chave),
      ['recebido', 'pago', 'producao', 'enviado', 'entregue'],
    )
  })

  test('inclui a etapa da arte quando o pedido tem personalização', () => {
    const etapas = construirLinhaDoTempo({ ...base, temArte: true })
    assert.ok(etapas.some((e) => e.chave === 'arte'))
    assert.equal(etapas.length, 6)
  })

  test('marca o que já passou, o que está acontecendo e o que vem', () => {
    const etapas = construirLinhaDoTempo({ ...base, status: 'production', temArte: false })

    assert.equal(etapas.find((e) => e.chave === 'recebido')?.estado, 'concluida')
    assert.equal(etapas.find((e) => e.chave === 'pago')?.estado, 'concluida')
    assert.equal(etapas.find((e) => e.chave === 'producao')?.estado, 'atual')
    assert.equal(etapas.find((e) => e.chave === 'enviado')?.estado, 'futura')
  })

  test('o texto muda conforme a etapa é passada, atual ou futura', () => {
    const emProducao = construirLinhaDoTempo({ ...base, status: 'production' })
    const producao = emProducao.find((e) => e.chave === 'producao')!
    assert.match(producao.descricao, /sendo feitas à mão/)

    const entregue = construirLinhaDoTempo({ ...base, status: 'completed' })
    assert.match(entregue.find((e) => e.chave === 'producao')!.descricao, /ficaram prontas/)
    assert.match(entregue.find((e) => e.chave === 'entregue')!.descricao, /evento seja/)
  })

  test('avisa quando há foto da produção para ver', () => {
    const sem = construirLinhaDoTempo({ ...base, status: 'production' })
    const com = construirLinhaDoTempo({ ...base, status: 'production', temFotoDaProducao: true })

    assert.doesNotMatch(sem.find((e) => e.chave === 'producao')!.descricao, /foto/)
    assert.match(com.find((e) => e.chave === 'producao')!.descricao, /foto delas/)
  })

  test('na etapa da arte, deixa claro que nada é produzido antes da aprovação', () => {
    const etapas = construirLinhaDoTempo({ ...base, status: 'art_approval', temArte: true })
    const arte = etapas.find((e) => e.chave === 'arte')!
    assert.equal(arte.estado, 'atual')
    assert.match(arte.descricao, /antes da sua aprovação/)
  })

  test('quando enviado sem rastreio, não promete um código que não existe', () => {
    const sem = construirLinhaDoTempo({ ...base, status: 'shipped' })
    assert.match(sem.find((e) => e.chave === 'enviado')!.descricao, /Em breve o código/)

    const com = construirLinhaDoTempo({ ...base, status: 'shipped', codigoRastreio: 'AB123' })
    assert.match(com.find((e) => e.chave === 'enviado')!.descricao, /código de rastreio abaixo/)
  })

  test('pedido cancelado tem tela própria, sem etapas', () => {
    const etapas = construirLinhaDoTempo({ ...base, status: 'cancelled' })
    assert.equal(etapas.length, 1)
    assert.equal(etapas[0].estado, 'interrompida')
    assert.match(etapas[0].descricao, /fale com a gente/)
  })

  test('pagamento não concluído convida a tentar de novo, em vez de acusar', () => {
    const etapas = construirLinhaDoTempo({ ...base, status: 'failed' })
    assert.match(etapas[0].descricao, /continua guardado/)
    assert.match(etapas[0].descricao, /tentar de novo/)
  })

  test('guarda a data de cada etapa que já aconteceu', () => {
    const etapas = construirLinhaDoTempo({
      ...base,
      status: 'shipped',
      pagoEm: '2026-09-02T10:00:00Z',
      enviadoEm: '2026-09-20T10:00:00Z',
    })
    assert.equal(etapas.find((e) => e.chave === 'pago')?.em, '2026-09-02T10:00:00Z')
    assert.equal(etapas.find((e) => e.chave === 'enviado')?.em, '2026-09-20T10:00:00Z')
    assert.equal(etapas.find((e) => e.chave === 'entregue')?.em, null)
  })
})

describe('contagem até o evento', () => {
  test('conta os dias que faltam', () => {
    const contagem = contarAteOEvento('2026-10-12', '2026-09-10')
    assert.equal(contagem.diasCorridos, 32)
    assert.equal(contagem.passou, false)
    assert.match(contagem.texto, /Faltam 32 dias/)
  })

  test('conta também os dias úteis, que é o que a produção usa', () => {
    // De 10/09 a 12/10 de 2026 há 32 dias corridos e menos dias úteis,
    // porque fins de semana e o feriado de 07/09 já passou.
    const contagem = contarAteOEvento('2026-10-12', '2026-09-10')
    assert.ok(contagem.diasUteis < contagem.diasCorridos)
    assert.ok(contagem.diasUteis > 0)
  })

  test('trata o dia do evento e a véspera com texto próprio', () => {
    assert.match(contarAteOEvento('2026-10-12', '2026-10-12').texto, /É hoje/)
    assert.match(contarAteOEvento('2026-10-12', '2026-10-11').texto, /Falta 1 dia/)
  })

  test('evento que já passou não vira número negativo na tela', () => {
    const contagem = contarAteOEvento('2026-09-01', '2026-09-10')
    assert.equal(contagem.passou, true)
    assert.match(contagem.texto, /já aconteceu/)
    assert.doesNotMatch(contagem.texto, /-\d/)
  })
})

describe('título do pedido', () => {
  test('usa o evento da cliente, e não o número do pedido', () => {
    assert.equal(
      tituloDoPedido({ number: '5000', eventType: 'Casamento', eventDate: '2026-10-12' }),
      'Suas lembrancinhas de casamento, 12 de outubro',
    )
  })

  test('sem data, ainda fala do evento', () => {
    assert.equal(
      tituloDoPedido({ number: '5000', eventType: 'Batizado', eventDate: null }),
      'Suas lembrancinhas de batizado',
    )
  })

  test('sem evento nenhum, cai para o número', () => {
    assert.equal(
      tituloDoPedido({ number: '5000', eventType: null, eventDate: null }),
      'Seu pedido 5000',
    )
  })
})
