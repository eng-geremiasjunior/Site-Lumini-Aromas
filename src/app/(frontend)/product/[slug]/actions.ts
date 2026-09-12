'use server'

import { revalidatePath } from 'next/cache'

import { addToCart } from '../../../../commerce/cart/cart-service.ts'
import { getPayloadClient } from '../../../../lib/payload.ts'

export type ResultadoAdicao =
  | { ok: true; totalPecas: number; subtotal: number }
  | { ok: false; mensagem: string; campo?: string }

export type EntradaAdicao = {
  slug: string
  variantKey: string | null
  qty: number
  personalization: Record<string, string>
  addonIds: string[]
  /** Logo que a cliente enviou, quando o produto pede arquivo. */
  artFileId?: number | null
}

/**
 * Coloca o item no carrinho.
 *
 * O navegador manda apenas a escolha: produto, aroma, quantidade,
 * personalização e acabamentos. O preço é calculado no servidor, pelo
 * mesmo motor que o painel usa. Se o valor viesse da tela, bastaria
 * alterar um campo pelo navegador para comprar por qualquer preço.
 */
export async function adicionarAoCarrinho(entrada: EntradaAdicao): Promise<ResultadoAdicao> {
  const resultado = await addToCart({
    productSlug: entrada.slug,
    variantKey: entrada.variantKey,
    qty: entrada.qty,
    personalization: entrada.personalization,
    addonIds: entrada.addonIds,
    artFileId: entrada.artFileId ?? null,
  })

  if (!resultado.ok) {
    return { ok: false, mensagem: resultado.mensagem, campo: resultado.campo }
  }

  revalidatePath('/meucarrinho')

  return {
    ok: true,
    totalPecas: resultado.cart.totalPieces,
    subtotal: resultado.cart.subtotal,
  }
}

/** Tamanho máximo da logo, igual ao limite de envio do painel. */
// Arquivo "use server" só pode exportar função: por isso a constante fica
// aqui dentro, sem export.
const TAMANHO_MAXIMO_DA_LOGO = 5_000_000

const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

type ResultadoDoEnvio =
  | { ok: true; id: number; nome: string; url: string | null }
  | { ok: false; mensagem: string }

/**
 * Recebe a logo da cliente.
 *
 * Sobe antes de o item entrar no carrinho, para ela ver o arquivo aceito na
 * hora e não descobrir na finalização que o PDF de 12 MB não passou.
 *
 * O tipo e o tamanho são conferidos aqui, no servidor: validação só no
 * navegador é sugestão, não regra.
 */
export async function enviarLogo(formData: FormData): Promise<ResultadoDoEnvio> {
  const arquivo = formData.get('arquivo')

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, mensagem: 'Escolha um arquivo.' }
  }

  if (arquivo.size > TAMANHO_MAXIMO_DA_LOGO) {
    const emMegas = (arquivo.size / 1_000_000).toFixed(1)
    return { ok: false, mensagem: `O arquivo tem ${emMegas} MB. O limite é 5 MB.` }
  }

  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return { ok: false, mensagem: 'Envie a logo em PNG, JPG, WEBP ou PDF.' }
  }

  const payload = await getPayloadClient()
  const bytes = Buffer.from(await arquivo.arrayBuffer())

  const midia = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: `Logo enviada pela cliente: ${arquivo.name}` },
    file: { data: bytes, mimetype: arquivo.type, name: arquivo.name, size: bytes.length },
  })

  return { ok: true, id: Number(midia.id), nome: arquivo.name, url: midia.url ?? null }
}
