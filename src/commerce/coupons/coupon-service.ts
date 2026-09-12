// Este módulo só roda no servidor: lê o banco e o carrinho da sessão.

import { getPayloadClient } from '../../lib/payload.ts'
import { revenueStatuses } from '../orders/statuses.ts'
import {
  aplicarCupom,
  normalizarCodigo,
  type ContextoDoCupom,
  type Cupom,
  type CupomAplicado,
  type ResultadoDoCupom,
} from './coupon.ts'

/**
 * A ponte entre o cupom guardado no painel e a regra pura.
 *
 * O uso não é um contador gravado no cupom: é contado nos pedidos pagos, na
 * hora. Assim um pedido cancelado devolve o uso sozinho, e nunca acontece
 * de o contador e a realidade discordarem — que é o tipo de divergência que
 * só aparece quando a cliente reclama.
 */
export async function validarCupom(
  codigo: string,
  contexto: Omit<ContextoDoCupom, 'usos' | 'usosDoCliente'>,
): Promise<ResultadoDoCupom> {
  const limpo = normalizarCodigo(codigo)
  if (!limpo) return { ok: false, motivo: 'Digite o código do cupom.' }

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'coupons',
    where: { codigo: { equals: limpo } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = docs[0]

  // Cupom que não existe e cupom desligado dizem a mesma coisa de propósito:
  // não é papel da loja informar quais códigos existem.
  if (!doc) return { ok: false, motivo: 'Não encontramos este cupom.' }

  const pagos = revenueStatuses()

  const { totalDocs: usos } = await payload.count({
    collection: 'orders',
    where: { and: [{ couponCode: { equals: limpo } }, { status: { in: pagos } }] },
    overrideAccess: true,
  })

  const usosDoCliente = contexto.email
    ? (
        await payload.count({
          collection: 'orders',
          where: {
            and: [
              { couponCode: { equals: limpo } },
              { status: { in: pagos } },
              { email: { equals: contexto.email.trim().toLowerCase() } },
            ],
          },
          overrideAccess: true,
        })
      ).totalDocs
    : 0

  return aplicarCupom(paraRegra(doc), { ...contexto, usos, usosDoCliente })
}

type CupomDoBanco = {
  codigo: string
  tipo: string
  percentual?: number | null
  valorCentavos?: number | null
  ativo?: boolean | null
  validoDe?: string | null
  validoAte?: string | null
  gastoMinimoCentavos?: number | null
  usoMaximo?: number | null
  usoMaximoPorCliente?: number | null
  produtos?: unknown
  categorias?: unknown
  emailsPermitidos?: Array<{ email?: string | null }> | null
}

function paraRegra(doc: CupomDoBanco): Cupom {
  return {
    codigo: doc.codigo,
    tipo: doc.tipo as Cupom['tipo'],
    percentual: doc.percentual ?? null,
    valorCentavos: doc.valorCentavos ?? null,
    ativo: doc.ativo !== false,
    validoDe: doc.validoDe ?? null,
    validoAte: doc.validoAte ?? null,
    gastoMinimoCentavos: doc.gastoMinimoCentavos ?? null,
    usoMaximo: doc.usoMaximo ?? null,
    usoMaximoPorCliente: doc.usoMaximoPorCliente ?? null,
    produtos: identificadores(doc.produtos),
    categorias: identificadores(doc.categorias),
    emailsPermitidos: (doc.emailsPermitidos ?? [])
      .map((linha) => linha.email ?? '')
      .filter(Boolean),
  }
}

function identificadores(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.map((item) =>
    typeof item === 'object' && item !== null
      ? String((item as { id?: string | number }).id ?? '')
      : String(item),
  )
}

export type { CupomAplicado }
