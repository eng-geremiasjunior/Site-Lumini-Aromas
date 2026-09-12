// Só roda no servidor: lê e escreve os cartões no banco.

import { getPayloadClient } from '../../lib/payload.ts'
import {
  aplicarCartao,
  normalizarCodigo,
  situacaoAposUso,
  type CartaoPresente,
} from './gift-card.ts'

export type CartaoEncontrado = {
  id: number | string
  codigo: string
  saldoCentavos: number
  valorCentavos: number
  situacao: string
  validoAte?: string | null
}

export async function buscarCartao(codigo: string): Promise<CartaoEncontrado | null> {
  const limpo = normalizarCodigo(codigo)
  if (limpo.length < 8) return null

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'gift-cards',
    where: { codigo: { equals: limpo } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = docs[0]
  if (!doc) return null

  return {
    id: doc.id,
    codigo: doc.codigo ?? limpo,
    saldoCentavos: doc.saldoCentavos ?? 0,
    valorCentavos: doc.valorCentavos ?? 0,
    situacao: doc.situacao ?? 'ativo',
    validoAte: doc.validoAte ?? null,
  }
}

/** Confere se o cartão pode ser usado, sem abater nada ainda. */
export async function conferirCartao(
  codigo: string,
): Promise<{ ok: true; cartao: CartaoEncontrado } | { ok: false; motivo: string }> {
  const cartao = await buscarCartao(codigo)
  if (!cartao) return { ok: false, motivo: 'Não encontramos este código.' }

  // Um real de teste: só para saber se o cartão está em condições de pagar
  // alguma coisa. O abatimento de verdade acontece ao fechar o pedido.
  const teste = aplicarCartao(paraRegra(cartao), 1)
  if (!teste.ok) return { ok: false, motivo: teste.motivo }

  return { ok: true, cartao }
}

/**
 * Abate do cartão e guarda o uso.
 *
 * Chamado uma vez, ao criar o pedido. O histórico fica no próprio cartão —
 * é o que permite responder "onde foi parar o meu saldo?" um ano depois.
 */
export async function usarCartao(
  codigo: string,
  totalCentavos: number,
  numeroDoPedido: string,
): Promise<{ ok: true; abatido: number; saldoRestante: number } | { ok: false; motivo: string }> {
  const cartao = await buscarCartao(codigo)
  if (!cartao) return { ok: false, motivo: 'Não encontramos este código.' }

  const resultado = aplicarCartao(paraRegra(cartao), totalCentavos)
  if (!resultado.ok) return resultado

  const payload = await getPayloadClient()
  const agora = new Date().toISOString()

  const doc = await payload.findByID({
    collection: 'gift-cards',
    id: cartao.id,
    depth: 0,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'gift-cards',
    id: cartao.id,
    overrideAccess: true,
    data: {
      saldoCentavos: resultado.saldoRestante,
      situacao: situacaoAposUso(resultado.saldoRestante),
      usos: [
        ...(Array.isArray(doc.usos) ? doc.usos : []),
        {
          em: agora,
          pedido: numeroDoPedido,
          valorCentavos: resultado.abatido,
          saldoDepois: resultado.saldoRestante,
        },
      ],
    },
  })

  return resultado
}

function paraRegra(cartao: CartaoEncontrado): CartaoPresente {
  return {
    codigo: cartao.codigo,
    valorCentavos: cartao.valorCentavos,
    saldoCentavos: cartao.saldoCentavos,
    situacao: cartao.situacao as CartaoPresente['situacao'],
    validoAte: cartao.validoAte,
  }
}
