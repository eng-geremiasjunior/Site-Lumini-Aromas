import { getPayloadClient } from '../../lib/payload.ts'
import { buildLotTable, type LotTableRow } from '../pricing/lot-pricing.ts'
import { toPricingConfig, type PricingProduct } from '../cart/price-line.ts'
import { estimateDelivery, formatIsoDate, type ProductionRule } from '../shipping/business-days.ts'
import { ofertaId } from '../feeds/oferta-id.ts'

/** Tudo que a página de produto precisa, já pronto para exibir. */
export type ProductView = {
  id: string
  name: string
  slug: string
  /** Categoria, usada pelo cupom restrito a uma linha de produtos. */
  categoryId: string | null
  shortDescription: string | null
  description: unknown
  images: Array<{ url: string; alt: string; width?: number | null; height?: number | null }>
  variants: Array<{
    key: string
    label: string
    sku: string | null
    imageUrl: string | null
    /** A experiência olfativa, para a seção de aromas. */
    descricao: string | null
    /**
     * O identificador desta oferta no Google e na Meta.
     *
     * É o mesmo que vai no feed. Sem isso igual dos dois lados, o anúncio
     * de remarketing não encontra o produto no catálogo e mostra algo
     * genérico no lugar da vela que a pessoa olhou.
     */
    idDeAnuncio: string
  }>
  /** Os blocos que fazem a página vender sozinha. Cada um pode estar vazio. */
  pagina: PaginaDeVenda
  lotTable: LotTableRow[]
  minQty: number
  maxQty: number
  unitPrice: number
  personalizationFields: Array<{
    label: string
    type: string
    required: boolean
    maxChars: number | null
    placeholder: string | null
    options: string[]
  }>
  addons: Array<{ id: string; name: string; pricePerUnit: number; description: string | null }>
  techSheet: Array<{ rotulo: string; valor: string }>
  productionRules: ProductionRule[]
  /** Prazo estimado para o lote mínimo, sem contar o frete. */
  deadlineHint: string | null
  pricing: PricingProduct
}

type MediaLike = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null }>
}

function toImage(media: unknown): ProductView['images'][number] | null {
  if (!media || typeof media !== 'object') return null
  const m = media as MediaLike
  const url = m.sizes?.card?.url ?? m.url
  if (!url) return null
  return { url, alt: m.alt ?? '', width: m.width, height: m.height }
}

/**
 * Carrega um produto publicado pelo endereço na web.
 *
 * A tabela de lotes é recalculada aqui, em vez de ler o valor gravado:
 * assim a página nunca mostra um preço defasado se alguém alterou o
 * produto direto no banco.
 */
export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const payload = await getPayloadClient()

  const resultado = await payload.find({
    collection: 'products',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { archived: { not_equals: true } },
      ],
    },
    limit: 1,
    depth: 2,
  })

  const doc = resultado.docs[0]
  if (!doc) return null

  const pricing: PricingProduct = {
    id: doc.id,
    name: doc.name,
    slug: doc.slug ?? slug,
    status: 'published',
    archived: doc.archived ?? false,
    unitPrice: doc.unitPrice ?? 0,
    minQty: doc.minQty ?? 20,
    qtyStep: doc.qtyStep ?? 10,
    maxQty: doc.maxQty ?? 200,
    lotSizes: (doc.lotSizes as number[] | null) ?? null,
    volumeDiscounts:
      (doc.volumeDiscounts as Array<{ fromQty: number; unitPrice: number }> | null) ?? null,
    variants: (doc.variants ?? []).map((v) => ({
      key: v.key ?? null,
      label: v.label ?? null,
      sku: v.sku ?? null,
      active: v.active ?? true,
    })),
    personalizationFields: (doc.personalizationFields ?? []).map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      maxChars: f.maxChars ?? null,
    })),
  }

  const lotTable = buildLotTable(toPricingConfig(pricing))

  const productionRules: ProductionRule[] = (doc.productionDays ?? []).map((r) => ({
    fromQty: r.fromQty,
    minDays: r.minDays,
    maxDays: r.maxDays,
  }))

  const techSheet = buildTechSheet(doc.techSheet)

  return {
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug ?? slug,
    categoryId: idDoRelacionamento(doc.category),
    shortDescription: doc.shortDescription ?? null,
    description: doc.description ?? null,
    images: (Array.isArray(doc.gallery) ? doc.gallery : [])
      .map(toImage)
      .filter((image): image is ProductView['images'][number] => image !== null),
    variants: (doc.variants ?? [])
      .filter((v) => v.key && v.active !== false)
      .map((v) => ({
        key: v.key as string,
        label: v.label ?? (v.key as string),
        sku: v.sku ?? null,
        imageUrl: toImage(v.image)?.url ?? null,
        descricao: v.descricao ?? null,
        idDeAnuncio: ofertaId({
          produtoId: doc.id,
          loteMinimo: pricing.minQty ?? 20,
          sku: v.sku,
          legacyWooVariationId: v.legacyWooVariationId,
          preservarIdAntigo: doc.preserveLegacyFeedId,
        }),
      })),
    pagina: montarPagina(doc),
    lotTable,
    minQty: pricing.minQty ?? 20,
    maxQty: pricing.maxQty ?? 200,
    unitPrice: pricing.unitPrice ?? 0,
    personalizationFields: (doc.personalizationFields ?? []).map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      maxChars: f.maxChars ?? null,
      placeholder: f.placeholder ?? null,
      options: (f.options ?? '')
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean),
    })),
    // O relacionamento volta como identificador ou documento completo,
    // conforme a profundidade da consulta; aqui só interessam os completos.
    addons: (Array.isArray(doc.addons) ? doc.addons : [])
      .filter((a): a is Exclude<typeof a, number> => typeof a === 'object' && a !== null)
      .map((a) => ({
        id: String(a.id),
        name: a.name ?? '',
        pricePerUnit: a.pricePerUnit ?? 0,
        description: a.description ?? null,
      })),
    techSheet,
    productionRules,
    deadlineHint: buildDeadlineHint(productionRules, pricing.minQty ?? 20),
    pricing,
  }
}

function buildTechSheet(ficha: unknown): Array<{ rotulo: string; valor: string }> {
  if (!ficha || typeof ficha !== 'object') return []
  const f = ficha as Record<string, unknown>

  const linhas: Array<[string, unknown, string]> = [
    ['Duração aproximada', f.durationHours, 'h'],
    ['Peso / volume', f.weight, ''],
    ['Altura', f.height, ''],
    ['Largura', f.width, ''],
    ['Recipiente', f.container, ''],
    ['Acompanha', f.includes, ''],
    ['Validade', f.shelfLifeMonths, ' meses'],
  ]

  return linhas
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([rotulo, valor, sufixo]) => ({ rotulo, valor: `${valor}${sufixo}` }))
}

/** Texto curto de prazo para o lote mínimo, exibido antes de o cliente informar o CEP. */
function buildDeadlineHint(rules: ProductionRule[], minQty: number): string | null {
  if (rules.length === 0) return null

  const hoje = formatIsoDate(new Date())
  const prazo = estimateDelivery({
    orderedOn: hoje,
    qty: minQty,
    productionRules: rules,
    carrierMinDays: 0,
    carrierMaxDays: 0,
  })

  return prazo.productionMinDays === prazo.productionMaxDays
    ? `Produção artesanal em ${prazo.productionMaxDays} dias úteis`
    : `Produção artesanal em ${prazo.productionMinDays} a ${prazo.productionMaxDays} dias úteis`
}

/** Lista de produtos publicados, para a vitrine e o mapa do site. */
export async function listPublishedProducts(limit = 100) {
  const payload = await getPayloadClient()

  const resultado = await payload.find({
    collection: 'products',
    where: {
      and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
    },
    limit,
    depth: 1,
    sort: 'name',
  })

  return resultado.docs
}

/** O relacionamento volta como id ou como documento, conforme a profundidade. */
function idDoRelacionamento(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'object') {
    const doc = valor as { id?: string | number }
    return doc.id === undefined ? null : String(doc.id)
  }
  return String(valor)
}

/**
 * Os blocos da página de venda.
 *
 * Tudo aqui é opcional por desenho. A tela decide o que mostrar pelo que
 * veio preenchido, e nunca abre uma seção vazia: página de luxo com
 * "em breve" escrito nela é pior do que página curta.
 */
export type PaginaDeVenda = {
  promessa: { titulo: string | null; texto: string | null; imagens: ImagemDoProduto[] } | null
  acabamento: Array<{
    titulo: string
    texto: string
    detalhe: string | null
    imagem: ImagemDoProduto | null
  }>
  secaoAromas: { titulo: string | null; texto: string | null } | null
  secaoPersonalizacao: {
    titulo: string | null
    texto: string | null
    exemplos: ImagemDoProduto[]
  } | null
  comoFunciona: Array<{ titulo: string; texto: string | null }>
  faq: Array<{ pergunta: string; resposta: string }>
}

type ImagemDoProduto = { url: string; alt: string; width?: number | null; height?: number | null }

type DocumentoDoProduto = {
  promessa?: { titulo?: string | null; texto?: string | null; imagens?: unknown } | null
  acabamento?: Array<{
    titulo?: string | null
    texto?: string | null
    detalhe?: string | null
    imagem?: unknown
  }> | null
  secaoAromas?: { titulo?: string | null; texto?: string | null } | null
  secaoPersonalizacao?: { titulo?: string | null; texto?: string | null; exemplos?: unknown } | null
  comoFunciona?: Array<{ titulo?: string | null; texto?: string | null }> | null
  faq?: Array<{ pergunta?: string | null; resposta?: string | null }> | null
}

function montarPagina(doc: DocumentoDoProduto): PaginaDeVenda {
  const promessa = doc.promessa
  const personalizacao = doc.secaoPersonalizacao
  const aromas = doc.secaoAromas

  return {
    promessa: temAlgo(promessa?.titulo, promessa?.texto, promessa?.imagens)
      ? {
          titulo: promessa?.titulo ?? null,
          texto: promessa?.texto ?? null,
          imagens: listaDeImagens(promessa?.imagens),
        }
      : null,

    acabamento: (doc.acabamento ?? [])
      .filter((bloco) => bloco.titulo && bloco.texto)
      .map((bloco) => ({
        titulo: bloco.titulo as string,
        texto: bloco.texto as string,
        detalhe: bloco.detalhe ?? null,
        imagem: toImage(bloco.imagem),
      })),

    secaoAromas: temAlgo(aromas?.titulo, aromas?.texto)
      ? { titulo: aromas?.titulo ?? null, texto: aromas?.texto ?? null }
      : null,

    secaoPersonalizacao: temAlgo(
      personalizacao?.titulo,
      personalizacao?.texto,
      personalizacao?.exemplos,
    )
      ? {
          titulo: personalizacao?.titulo ?? null,
          texto: personalizacao?.texto ?? null,
          exemplos: listaDeImagens(personalizacao?.exemplos),
        }
      : null,

    comoFunciona: (doc.comoFunciona ?? [])
      .filter((passo) => passo.titulo)
      .map((passo) => ({ titulo: passo.titulo as string, texto: passo.texto ?? null })),

    faq: (doc.faq ?? [])
      .filter((item) => item.pergunta && item.resposta)
      .map((item) => ({ pergunta: item.pergunta as string, resposta: item.resposta as string })),
  }
}

/** Um bloco só existe quando tem texto ou foto. Nem título sozinho basta. */
function temAlgo(...valores: unknown[]): boolean {
  return valores.some((valor) => {
    if (Array.isArray(valor)) return valor.length > 0
    return typeof valor === 'string' ? valor.trim() !== '' : Boolean(valor)
  })
}

function listaDeImagens(valor: unknown): ImagemDoProduto[] {
  if (!Array.isArray(valor)) return []
  return valor.map(toImage).filter((imagem): imagem is ImagemDoProduto => imagem !== null)
}
