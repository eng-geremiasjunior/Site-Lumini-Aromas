'use server'

import { getPayloadClient } from '../../lib/payload.ts'
import { intervaloDoMes } from '../../commerce/finance/coletar.ts'
import { nomeDoMes } from '../../commerce/finance/dre.ts'
import {
  lerRelatorio,
  type LeituraDoRelatorio,
  type LinhaDeCampanha,
} from '../../commerce/marketing/relatorio-de-anuncios.ts'

/**
 * O que a tela de importar anúncios precisa do servidor.
 *
 * A leitura acontece aqui, e não no navegador, pelo mesmo motivo de sempre:
 * o que vira dinheiro no relatório é decidido no servidor. O navegador só
 * mostra o que foi entendido para você conferir antes de confirmar.
 */

export async function lerColagem(texto: string): Promise<LeituraDoRelatorio> {
  // O `interpretador` de IA entra aqui, como na leitura da mensagem da
  // cliente: tenta o que a regra não conseguiu, nunca sobrescreve o que ela
  // já leu.
  return lerRelatorio(texto)
}

export type PedidoDeImportacao = {
  /** AAAA-MM. */
  mes: string
  plataforma: string
  /** Categoria financeira que recebe o lançamento. */
  categoriaId: string
  linhas: LinhaDeCampanha[]
}

export type ResultadoDaImportacao =
  | { ok: true; criados: number; atualizados: number; total: number }
  | { ok: false; erro: string }

/**
 * Grava o mês.
 *
 * Um lançamento por campanha, por mês. Importar o mesmo mês de novo
 * **substitui** o que foi importado antes, em vez de somar — é o que permite
 * colar de novo no dia 5 e no dia 30 sem medo de dobrar o custo.
 */
export async function importarAnuncios(
  pedido: PedidoDeImportacao,
): Promise<ResultadoDaImportacao> {
  if (!/^\d{4}-\d{2}$/.test(pedido.mes)) return { ok: false, erro: 'Mês inválido.' }
  if (!pedido.categoriaId) return { ok: false, erro: 'Escolha a categoria financeira.' }
  if (pedido.linhas.length === 0) return { ok: false, erro: 'Nada para importar.' }

  const payload = await getPayloadClient()
  const [inicio, fim] = intervaloDoMes(pedido.mes)

  // A competência fica no primeiro dia do mês, ao meio-dia, para o
  // lançamento não escorregar de mês por causa de fuso horário.
  const competencia = new Date(`${pedido.mes}-01T12:00:00.000Z`).toISOString()

  let criados = 0
  let atualizados = 0
  let total = 0

  for (const linha of pedido.linhas) {
    const nome = linha.campanha.trim()
    if (nome === '') continue

    const campanhaId = await acharOuCriarCampanha(payload, nome, pedido.plataforma)

    const dados = {
      descricao: `${nome} — ${nomeDoMes(pedido.mes)}`,
      // O identificador chega da tela como texto; no banco é número.
      categoria: Number(pedido.categoriaId),
      valor: linha.investimento,
      competencia,
      campanha: campanhaId,
      origem: 'importado' as const,
      desempenho: {
        alcance: linha.alcance,
        impressoes: linha.impressoes,
        cliques: linha.cliques,
        resultados: linha.resultados,
      },
    }

    const { docs } = await payload.find({
      collection: 'ledger-entries',
      where: {
        and: [
          { campanha: { equals: campanhaId } },
          { competencia: { greater_than_equal: inicio } },
          { competencia: { less_than: fim } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const existente = docs[0]

    if (existente) {
      await payload.update({
        collection: 'ledger-entries',
        id: existente.id,
        data: dados,
        overrideAccess: true,
      })
      atualizados += 1
    } else {
      await payload.create({ collection: 'ledger-entries', data: dados, overrideAccess: true })
      criados += 1
    }

    total += linha.investimento
  }

  return { ok: true, criados, atualizados, total }
}

async function acharOuCriarCampanha(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  nome: string,
  plataforma: string,
): Promise<number> {
  const { docs } = await payload.find({
    collection: 'campaigns',
    where: { nome: { equals: nome } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const existente = docs[0]
  if (existente) return Number(existente.id)

  const criada = await payload.create({
    collection: 'campaigns',
    data: {
      nome,
      plataforma: (plataforma === 'Google' ? 'Google' : plataforma === 'Meta' ? 'Meta' : 'Outros') as
        | 'Meta'
        | 'Google'
        | 'Outros',
      ativa: true,
    },
    overrideAccess: true,
  })

  return Number(criada.id)
}

/** As categorias de marketing, para o seletor da tela. */
export async function categoriasDeMarketing(): Promise<
  Array<{ id: string; nome: string; plataforma: string | null }>
> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'finance-categories',
    where: { grupo: { equals: 'marketing' } },
    limit: 50,
    depth: 0,
    sort: 'nome',
    overrideAccess: true,
  })

  return docs.map((doc) => ({
    id: String(doc.id),
    nome: doc.nome,
    plataforma: doc.plataforma ?? null,
  }))
}
