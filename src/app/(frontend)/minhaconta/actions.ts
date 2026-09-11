'use server'

import type { Payload } from 'payload'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'

import { getPayloadClient } from '../../../lib/payload.ts'
import { canTransition, type OrderStatus } from '../../../commerce/orders/statuses.ts'

export type ResultadoAcesso =
  | { ok: true; token: string }
  | { ok: false; mensagem: string }

/**
 * Abre o pedido pelo número e pelo e-mail.
 *
 * Sem senha de propósito: quem acabou de comprar tem os dois à mão, no
 * e-mail de confirmação, e obrigar a criar conta antes de ver o pedido é
 * exatamente o atrito que faz a cliente ir perguntar no WhatsApp.
 *
 * O que protege é o par número + e-mail. Acertar o número é fácil, já que
 * são sequenciais; acertar o e-mail junto, não. E a resposta é sempre a
 * mesma quando falha, para não revelar quais números existem.
 */
export async function acessarPedido(
  numero: string,
  email: string,
): Promise<ResultadoAcesso> {
  const numeroLimpo = numero.replace(/\D/g, '').trim()
  const emailLimpo = email.trim().toLowerCase()

  if (!numeroLimpo || !emailLimpo.includes('@')) {
    return { ok: false, mensagem: 'Confira o número do pedido e o e-mail usado na compra.' }
  }

  const payload = await getPayloadClient()

  const resultado = await payload.find({
    collection: 'orders',
    where: {
      and: [{ number: { equals: numeroLimpo } }, { email: { equals: emailLimpo } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const pedido = resultado.docs[0]

  if (!pedido) {
    return {
      ok: false,
      mensagem:
        'Não encontramos um pedido com esse número e e-mail. Confira os dados ou fale com a gente pelo WhatsApp.',
    }
  }

  // Pedido antigo, de antes do código de acesso existir — inclusive os 237
  // que vêm do WooCommerce. Ganha o código na primeira vez que a cliente
  // procura por ele, em vez de ficar inacessível para sempre.
  if (!pedido.trackingToken) {
    const token = randomUUID()
    await payload.update({
      collection: 'orders',
      id: pedido.id,
      overrideAccess: true,
      data: { trackingToken: token },
    })
    return { ok: true, token }
  }

  return { ok: true, token: pedido.trackingToken }
}

/**
 * Aprovação da arte pela cliente.
 *
 * Este é o ponto mais delicado do pedido: depois daqui o lote inteiro é
 * produzido com o rótulo que está na tela. Por isso a aprovação fica
 * registrada com data e hora no próprio item — é o que protege os dois
 * lados se depois alguém disser que o nome saiu errado.
 *
 * Enquanto ela não aprova, nada é produzido e o cancelamento é gratuito.
 */
export async function aprovarArte(
  token: string,
  indiceDoItem: number,
): Promise<{ ok: boolean; mensagem?: string }> {
  const payload = await getPayloadClient()
  const pedido = await pedidoPorToken(payload, token)

  if (!pedido) return { ok: false, mensagem: 'Não encontramos este pedido.' }

  const itens = Array.isArray(pedido.items) ? [...pedido.items] : []
  const item = itens[indiceDoItem]

  if (!item?.artProof) {
    return { ok: false, mensagem: 'Não há arte para aprovar neste item.' }
  }
  if (item.artApprovedAt) {
    return { ok: true }
  }

  const agora = new Date().toISOString()
  itens[indiceDoItem] = { ...item, artApprovedAt: agora }

  // A produção só começa quando todas as artes do pedido estiverem aprovadas,
  // e ainda assim passando pela mesma máquina de estados que o painel usa.
  const faltaAprovar = itens.some((outro) => outro.artProof && !outro.artApprovedAt)
  const situacaoAtual = pedido.status as OrderStatus
  const liberaProducao =
    !faltaAprovar &&
    canTransition(situacaoAtual, 'production', {
      requiresArtApproval: true,
      artApprovedAt: agora,
    }).ok

  const novoStatus: OrderStatus = liberaProducao ? 'production' : situacaoAtual

  const eventos = Array.isArray(pedido.events) ? pedido.events : []

  await payload.update({
    collection: 'orders',
    id: pedido.id,
    overrideAccess: true,
    data: {
      items: itens,
      status: novoStatus,
      events: [
        ...eventos,
        {
          at: agora,
          type: 'art_approved',
          message: `Arte do item ${indiceDoItem + 1} aprovada pela cliente.`,
          actor: pedido.email ?? 'cliente',
        },
        ...(novoStatus !== pedido.status
          ? [
              {
                at: agora,
                type: 'status_changed',
                message: 'Todas as artes aprovadas. Pedido liberado para produção.',
                actor: 'sistema',
              },
            ]
          : []),
      ],
    },
  })

  revalidatePath(`/minhaconta/pedido/${token}/`)
  return { ok: true }
}

/**
 * Pedido de ajuste na arte.
 *
 * Não muda a situação do pedido: só registra o que ela quer mudar, de forma
 * que a equipe veja e refaça a prova. É melhor do que ela desistir de avisar
 * e receber 100 peças com o nome errado.
 */
export async function pedirAjusteNaArte(
  token: string,
  indiceDoItem: number,
  texto: string,
): Promise<{ ok: boolean; mensagem?: string }> {
  const recado = texto.trim().slice(0, 1000)
  if (recado.length < 3) {
    return { ok: false, mensagem: 'Escreva o que você gostaria de mudar.' }
  }

  const payload = await getPayloadClient()
  const pedido = await pedidoPorToken(payload, token)
  if (!pedido) return { ok: false, mensagem: 'Não encontramos este pedido.' }

  const agora = new Date().toISOString()
  const eventos = Array.isArray(pedido.events) ? pedido.events : []
  const anotacoes = Array.isArray(pedido.notes) ? pedido.notes : []

  await payload.update({
    collection: 'orders',
    id: pedido.id,
    overrideAccess: true,
    data: {
      events: [
        ...eventos,
        {
          at: agora,
          type: 'art_change_requested',
          message: `Ajuste pedido no item ${indiceDoItem + 1}: ${recado}`,
          actor: pedido.email ?? 'cliente',
        },
      ],
      // Fica como anotação interna: é uma instrução para a equipe refazer a
      // prova, não um recado da Lumini para a cliente.
      notes: [
        ...anotacoes,
        { visibleToCustomer: false, text: `Ajuste pedido pela cliente: ${recado}` },
      ],
    },
  })

  revalidatePath(`/minhaconta/pedido/${token}/`)
  return { ok: true }
}

async function pedidoPorToken(payload: Payload, token: string) {
  if (!token || token.length < 20) return null

  const resultado = await payload.find({
    collection: 'orders',
    where: { trackingToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return resultado.docs[0] ?? null
}
