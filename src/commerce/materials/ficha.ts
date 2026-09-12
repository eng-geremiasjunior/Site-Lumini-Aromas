// Ponte entre o cadastro do Payload e o cálculo puro. Só roda no servidor.

import {
  custoDaPeca,
  type FichaDoProduto,
  type Insumo,
  type LinhaDaFicha,
} from './materiais.ts'

/** O identificador de um relacionamento, que pode vir cheio ou só como id. */
function idDe(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'object') {
    const doc = valor as { id?: string | number }
    return doc.id === undefined ? null : String(doc.id)
  }
  return String(valor)
}

export function insumoDoDocumento(doc: Record<string, unknown>): Insumo {
  const bruto = doc as {
    id: string | number
    nome?: string
    unidadeDeUso?: string
    unidadeDeCompra?: string
    quantidadePorEmbalagem?: number | null
    perdaPercentual?: number | null
    densidade?: number | null
    estoqueAtual?: number | null
    compras?: Array<{ em?: string | null; embalagens?: number | null; valorPago?: number | null; fornecedor?: string | null }> | null
  }

  return {
    id: String(bruto.id),
    nome: bruto.nome ?? '',
    unidadeDeUso: (bruto.unidadeDeUso ?? 'un') as Insumo['unidadeDeUso'],
    unidadeDeCompra: (bruto.unidadeDeCompra ?? 'unidade') as Insumo['unidadeDeCompra'],
    quantidadePorEmbalagem: bruto.quantidadePorEmbalagem ?? 1,
    perdaPercentual: bruto.perdaPercentual ?? 0,
    densidade: bruto.densidade ?? null,
    estoqueAtual: bruto.estoqueAtual ?? null,
    compras: (bruto.compras ?? [])
      .filter((compra) => compra?.em && (compra.embalagens ?? 0) > 0)
      .map((compra) => ({
        em: String(compra.em),
        embalagens: compra.embalagens as number,
        valorPago: compra.valorPago ?? 0,
        fornecedor: compra.fornecedor ?? null,
      })),
  }
}

export function fichaDoDocumento(doc: Record<string, unknown>): FichaDoProduto {
  const bruto = doc as { id: string | number; materiais?: Array<Record<string, unknown>> | null }

  const linhas: LinhaDaFicha[] = (bruto.materiais ?? []).map((item) => {
    const linha = item as {
      vinculo?: string
      insumo?: unknown
      campo?: string | null
      opcoes?: Array<{ valor?: string; insumo?: unknown }> | null
      quantidadePorPeca?: number | null
      informadaEmMililitros?: boolean | null
      insumoBase?: unknown
      paraCada?: number | null
    }

    return {
      vinculo: (linha.vinculo ?? 'fixo') as LinhaDaFicha['vinculo'],
      insumoId: idDe(linha.insumo),
      campo: linha.campo ?? null,
      opcoes: (linha.opcoes ?? [])
        .map((opcao) => ({ valor: opcao.valor ?? '', insumoId: idDe(opcao.insumo) ?? '' }))
        .filter((opcao) => opcao.valor !== '' && opcao.insumoId !== ''),
      quantidadePorPeca: linha.quantidadePorPeca ?? null,
      informadaEmMililitros: linha.informadaEmMililitros ?? null,
      insumoBaseId: idDe(linha.insumoBase),
      paraCada: linha.paraCada ?? null,
    }
  })

  return { produtoId: String(bruto.id), linhas }
}

type PayloadLike = {
  find: (args: Record<string, unknown>) => Promise<{ docs: Array<Record<string, unknown>> }>
  update: (args: Record<string, unknown>) => Promise<unknown>
}

export async function carregarInsumos(payload: PayloadLike, req?: unknown): Promise<Insumo[]> {
  const { docs } = await payload.find({
    collection: 'supplies',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })

  return docs.map(insumoDoDocumento)
}

/**
 * Recalcula o custo de uma peça a partir da ficha de materiais.
 *
 * Existe porque o custo digitado à mão envelhece em silêncio: a cera sobe de
 * R$ 24 para R$ 30 e o DRE continua mostrando a margem antiga por meses. Com
 * a ficha preenchida, registrar a compra do insumo basta — o custo dos
 * produtos que o usam se atualiza junto.
 *
 * Só escreve quando o valor muda, para não gerar uma versão nova do produto
 * a cada passagem.
 */
export async function recalcularCustoDosProdutos(
  payload: PayloadLike,
  opcoes: { insumoId?: string | null; req?: unknown } = {},
): Promise<{ atualizados: number; semPreco: string[] }> {
  const insumos = await carregarInsumos(payload, opcoes.req)

  // `draft: true` traz a versão mais recente, publicada ou não. Sem isso,
  // produto ainda em rascunho ficaria de fora e o custo dele nunca sairia
  // do zero.
  const { docs: produtos } = await payload.find({
    collection: 'products',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    draft: true,
    req: opcoes.req,
  })

  let atualizados = 0
  const semPreco: string[] = []

  for (const doc of produtos) {
    const ficha = fichaDoDocumento(doc)
    if (ficha.linhas.length === 0) continue

    if (opcoes.insumoId && !usaOInsumo(ficha, opcoes.insumoId)) continue

    const custo = custoDaPeca(ficha, insumos, {}, 'medio')

    if (custo === null) {
      semPreco.push(String((doc as { name?: string }).name ?? doc.id))
      continue
    }

    if (custo === (doc as { unitCost?: number | null }).unitCost) continue

    await payload.update({
      collection: 'products',
      id: doc.id,
      data: { unitCost: custo },
      overrideAccess: true,
      req: opcoes.req,
      // Rascunho continua rascunho. Atualizar um custo nunca pode publicar
      // um produto que ainda não estava à venda.
      draft: (doc as { _status?: string })._status !== 'published',
    })

    atualizados += 1
  }

  return { atualizados, semPreco }
}

function usaOInsumo(ficha: FichaDoProduto, insumoId: string): boolean {
  return ficha.linhas.some(
    (linha) =>
      linha.insumoId === insumoId ||
      linha.insumoBaseId === insumoId ||
      (linha.opcoes ?? []).some((opcao) => opcao.insumoId === insumoId),
  )
}
