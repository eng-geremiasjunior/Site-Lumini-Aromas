import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import {
  DIAS_ATE_DESISTIR,
  deveDesistir,
  estaAbandonado,
  proximoLembrete,
} from '../commerce/carts/abandonment.ts'
import { enfileirar } from './outbox.ts'

/**
 * A varredura dos carrinhos parados.
 *
 * Roda no cron, algumas vezes por dia. Não manda e-mail: só decide quem
 * merece lembrete e coloca na caixa de saída, que é quem entrega, repete a
 * tentativa quando falha e mostra o erro no painel.
 */
export async function varrerCarrinhos(
  payload: Payload,
  agora: Date = new Date(),
): Promise<{ marcados: number; lembretes: number; desistidos: number }> {
  const limite = new Date(agora.getTime() - (DIAS_ATE_DESISTIR + 7) * 24 * 60 * 60_000)

  const { docs } = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { status: { in: ['active', 'abandoned'] } },
        { lastActivityAt: { greater_than: limite.toISOString() } },
      ],
    },
    limit: 200,
    sort: 'lastActivityAt',
    depth: 0,
    overrideAccess: true,
  })

  let marcados = 0
  let lembretes = 0
  let desistidos = 0

  for (const doc of docs) {
    const estado = {
      status: doc.status,
      email: doc.email,
      lastActivityAt: doc.lastActivityAt,
      recoveryStep: doc.recoveryStep,
      temItens: Array.isArray(doc.items) && doc.items.length > 0,
    }

    if (deveDesistir(estado, agora)) {
      await atualizar(payload, doc.id, doc.lastActivityAt, { status: 'lost' })
      desistidos += 1
      continue
    }

    if (doc.status === 'active' && estaAbandonado(estado, agora)) {
      await atualizar(payload, doc.id, doc.lastActivityAt, { status: 'abandoned' })
      marcados += 1
    }

    const passo = proximoLembrete(estado, agora)
    if (!passo) continue

    // Carrinho de antes de o código de retomada existir ganha o seu agora,
    // senão o link do lembrete sairia vazio.
    if (!doc.restoreToken) {
      await atualizar(payload, doc.id, doc.lastActivityAt, { restoreToken: randomUUID() })
    }

    await enfileirar(payload, [
      {
        tipo: 'email',
        // Um lembrete por passo por carrinho. Se a varredura rodar duas
        // vezes na mesma hora, o segundo não entra.
        dedupeKey: `email:lembrete:${doc.id}:${passo}`,
        payload: { tipoDeEmail: 'lembrete_carrinho', carrinhoId: doc.id, passo },
      },
    ])

    lembretes += 1
  }

  return { marcados, lembretes, desistidos }
}

async function atualizar(
  payload: Payload,
  id: number | string,
  atividadeOriginal: string | null | undefined,
  data: Record<string, unknown>,
) {
  // A data de atividade volta igual como veio: é ela que conta o tempo de
  // abandono, e a varredura não pode reiniciar o próprio relógio.
  await payload.update({
    collection: 'carts',
    id,
    overrideAccess: true,
    data: { ...data, lastActivityAt: atividadeOriginal ?? undefined },
  })
}
