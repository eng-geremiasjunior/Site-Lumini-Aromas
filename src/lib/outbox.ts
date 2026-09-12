import type { Payload, PayloadRequest } from 'payload'

import {
  estaNaVez,
  proximaTentativa,
  situacaoAposFalha,
  type EventoASair,
} from '../commerce/integrations/outbox.ts'
import { montarEmail, type DadosDoEmail, type TipoDeEmail } from '../commerce/notifications/emails.ts'
import { montarLembrete } from '../commerce/notifications/emails-carrinho.ts'
import { resumoDoCarrinho } from '../commerce/cart/cart-view.ts'
import { enviarEmail } from './enviar-email.ts'

/**
 * A parte da caixa de saída que fala com o mundo.
 *
 * A decisão de o que sai, com que chave e quando tentar de novo está em
 * `src/commerce/integrations/outbox.ts`, que é pura e testada. Aqui é só
 * gravar, ler e entregar.
 */

/**
 * Coloca os eventos na fila.
 *
 * Evento repetido não entra. A checagem aqui é a primeira linha de defesa;
 * a garantia mesmo é o índice único da chave no banco, que segura o caso
 * raro de dois webhooks chegarem no mesmo instante.
 */
export async function enfileirar(
  payload: Payload,
  eventos: EventoASair[],
  orderId?: number,
  req?: PayloadRequest,
): Promise<void> {
  for (const evento of eventos) {
    try {
      // O `req` leva a gravação para dentro da mesma transação do pedido.
      // Sem ele, a caixa de saída tentaria apontar para um pedido que
      // ainda não existe fora da transação, e a chave estrangeira recusa.
      const { totalDocs } = await payload.count({
        collection: 'integration-events',
        where: { dedupeKey: { equals: evento.dedupeKey } },
        overrideAccess: true,
        req,
      })

      // Já saiu, ou já está esperando na fila.
      if (totalDocs > 0) continue

      await payload.create({
        collection: 'integration-events',
        overrideAccess: true,
        req,
        data: {
          tipo: evento.tipo,
          situacao: 'pendente',
          dedupeKey: evento.dedupeKey,
          payload: evento.payload,
          order: orderId ?? null,
          tentativas: 0,
        },
      })
    } catch (erro) {
      console.error(
        '[caixa de saída] não consegui enfileirar',
        evento.dedupeKey,
        erro instanceof Error ? erro.message : String(erro),
      )
    }
  }
}

/**
 * Tenta entregar o que está na fila.
 *
 * Chamada pelo cron da Vercel. Processa um punhado por vez: no volume da
 * Lumini isso é folgado, e mantém a função longe do limite de tempo.
 */
export async function processarFila(
  payload: Payload,
  limite = 25,
): Promise<{ processados: number; enviados: number; falharam: number }> {
  const agora = new Date()

  const { docs } = await payload.find({
    collection: 'integration-events',
    where: { situacao: { in: ['pendente', 'falhou'] } },
    sort: 'createdAt',
    limit: limite,
    depth: 0,
    overrideAccess: true,
  })

  let enviados = 0
  let falharam = 0
  let processados = 0

  for (const evento of docs) {
    if (!estaNaVez({ situacao: evento.situacao, proximaTentativaEm: evento.proximaTentativaEm }, agora)) {
      continue
    }

    processados += 1
    const tentativas = (evento.tentativas ?? 0) + 1
    const resultado = await entregar(payload, evento)

    if (resultado.ok) {
      enviados += 1
      await payload.update({
        collection: 'integration-events',
        id: evento.id,
        overrideAccess: true,
        data: {
          situacao: 'enviado',
          tentativas,
          enviadoEm: new Date().toISOString(),
          erro: null,
          proximaTentativaEm: null,
        },
      })
    } else {
      falharam += 1
      const proxima = proximaTentativa(tentativas, agora)
      await payload.update({
        collection: 'integration-events',
        id: evento.id,
        overrideAccess: true,
        data: {
          situacao: situacaoAposFalha(tentativas),
          tentativas,
          erro: resultado.erro,
          proximaTentativaEm: proxima ? proxima.toISOString() : null,
        },
      })
    }
  }

  return { processados, enviados, falharam }
}

async function entregar(
  payload: Payload,
  evento: { tipo: string; payload?: unknown },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (evento.tipo === 'email') return entregarEmail(payload, evento.payload)

  // Meta, GA4, Google Ads e DRE entram aqui quando tiverem credencial.
  // Até lá o evento fica na fila, visível, em vez de sumir.
  return { ok: false, erro: `Ainda não sei entregar eventos do tipo "${evento.tipo}".` }
}

async function entregarEmail(
  payload: Payload,
  dados: unknown,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const entrada = (dados ?? {}) as {
    tipoDeEmail?: TipoDeEmail | 'lembrete_carrinho'
    numero?: string
    carrinhoId?: number | string
    passo?: number
  }

  if (entrada.tipoDeEmail === 'lembrete_carrinho') {
    return entregarLembreteDeCarrinho(payload, entrada.carrinhoId, entrada.passo)
  }

  const { tipoDeEmail, numero } = entrada as { tipoDeEmail?: TipoDeEmail; numero?: string }
  if (!tipoDeEmail || !numero) return { ok: false, erro: 'Evento de e-mail sem tipo ou sem pedido.' }

  const { docs } = await payload.find({
    collection: 'orders',
    where: { number: { equals: numero } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const pedido = docs[0]
  if (!pedido) return { ok: false, erro: `Pedido ${numero} não existe mais.` }
  if (!pedido.email) return { ok: false, erro: `Pedido ${numero} não tem e-mail do cliente.` }
  if (!pedido.trackingToken) return { ok: false, erro: `Pedido ${numero} sem código de acesso.` }

  const loja = await payload.findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })

  const conteudo = montarEmail(tipoDeEmail, montarDados(pedido, loja))
  return enviarEmail(pedido.email, conteudo)
}

type PedidoParaEmail = {
  number: string
  email?: string | null
  customerName?: string | null
  trackingToken?: string | null
  total?: number | null
  items?: Array<{ productName?: string | null; variantLabel?: string | null; qty?: number | null }> | null
  eventType?: string | null
  eventDate?: string | null
  productionDeadline?: string | null
  trackingCode?: string | null
  shippingService?: string | null
}

function montarDados(pedido: PedidoParaEmail, loja: unknown): DadosDoEmail {
  const configuracoes = (loja ?? {}) as { whatsapp?: string | null }

  return {
    numero: String(pedido.number),
    nome: primeiroNome(pedido.customerName),
    email: pedido.email ?? '',
    token: pedido.trackingToken ?? '',
    urlDaLoja: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br',
    whatsapp: soDigitos(configuracoes.whatsapp) || '5533999478774',
    totalCentavos: pedido.total ?? 0,
    itens: (pedido.items ?? []).map((item) => ({
      descricao: [item.productName, item.variantLabel].filter(Boolean).join(' · ') || 'Peça',
      quantidade: item.qty ?? 0,
    })),
    eventType: pedido.eventType ?? null,
    eventDate: pedido.eventDate ?? null,
    prazoPrometido: pedido.productionDeadline ?? null,
    codigoRastreio: pedido.trackingCode ?? null,
    transportadora: pedido.shippingService ?? null,
  }
}

/**
 * "Ana Clara Ribeiro" vira "Ana". Só a primeira palavra mesmo: tentar
 * adivinhar nome composto erra com frequência ("Carla Souza Lima" viraria
 * "Carla Souza"), e errar o nome de alguém é pior do que ser sucinto.
 */
function primeiroNome(nomeCompleto?: string | null): string {
  const primeira = (nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean)[0]
  return primeira ?? 'Olá'
}

function soDigitos(texto?: string | null): string {
  return (texto ?? '').replace(/\D/g, '')
}

/**
 * Lembrete de carrinho abandonado.
 *
 * O conteúdo é montado na hora do envio, e não na hora de enfileirar: se a
 * cliente voltou e mexeu no carrinho nesse meio tempo, o e-mail sai com o
 * que está lá agora — ou não sai, se ela já fechou o pedido.
 */
async function entregarLembreteDeCarrinho(
  payload: Payload,
  carrinhoId?: number | string,
  passo?: number,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!carrinhoId || !passo) return { ok: false, erro: 'Lembrete sem carrinho ou sem passo.' }

  const doc = await payload
    .findByID({ collection: 'carts', id: carrinhoId, depth: 0, overrideAccess: true })
    .catch(() => null)

  if (!doc) return { ok: false, erro: 'Este carrinho não existe mais.' }

  // A cliente voltou e comprou, ou pediu para não receber mais: o lembrete
  // perde o sentido. Marcar como entregue é o certo — não é falha.
  if (doc.status !== 'active' && doc.status !== 'abandoned') return { ok: true }
  if (!doc.email) return { ok: true }

  const carrinho = await resumoDoCarrinho(doc.id)
  if (!carrinho || carrinho.isEmpty) return { ok: true }

  const loja = await payload.findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })
  const configuracoes = (loja ?? {}) as { whatsapp?: string | null; instagram?: string | null }

  const conteudo = montarLembrete(passo, {
    nome: primeiroNome(doc.customerName ?? null),
    urlDaLoja: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br',
    tokenDeRecuperacao: doc.restoreToken ?? '',
    whatsapp: soDigitos(configuracoes.whatsapp) || '5533999478774',
    itens: carrinho.lines.map((linha) => ({
      descricao: [linha.productName, linha.variantLabel].filter(Boolean).join(' · '),
      quantidade: linha.qty,
    })),
    subtotalCentavos: carrinho.subtotal,
    instagram: configuracoes.instagram ?? null,
  })

  const resultado = await enviarEmail(doc.email, conteudo)
  if (!resultado.ok) return resultado

  await payload.update({
    collection: 'carts',
    id: doc.id,
    overrideAccess: true,
    data: { recoveryStep: passo, lastRecoveryAt: new Date().toISOString(), status: 'abandoned' },
  })

  return { ok: true }
}
