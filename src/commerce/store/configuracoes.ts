import { cache } from 'react'

import { getPayloadClient } from '../../lib/payload.ts'
import type { StoreSetting } from '../../payload-types.ts'

/**
 * Os dados da loja, lidos uma vez por requisição.
 *
 * Cabeçalho, rodapé, páginas legais e contato pedem os mesmos campos. Com
 * o `cache` do React, as quatro leituras viram uma consulta por visita.
 *
 * O `catch` não é descuido: banco fora do ar não pode derrubar o rodapé
 * com o CNPJ, que é exigência do Decreto 7.962. A loja aparece sem os
 * dados em vez de não aparecer.
 */
export const configuracoesDaLoja = cache(carregar)

async function carregar(): Promise<StoreSetting | null> {
  const payload = await getPayloadClient()

  return (await payload
    .findGlobal({ slug: 'store-settings', depth: 0, overrideAccess: true })
    .catch(() => null)) as StoreSetting | null
}

export type DadosDaEmpresa = {
  razaoSocial: string | null
  nomeFantasia: string | null
  cnpj: string | null
  inscricaoEstadual: string | null
  email: string | null
  whatsapp: string | null
  horario: string | null
  endereco: string | null
  cidade: string | null
  versao: string | null
  avisoDeProducao: string | null
  pedidoMinimo: number
}

export const dadosDaEmpresa = cache(async (): Promise<DadosDaEmpresa> => {
  const config = await configuracoesDaLoja()
  const endereco = config?.address ?? null

  const linha = endereco
    ? [
        [endereco.street, endereco.number].filter(Boolean).join(', '),
        endereco.complement,
        endereco.district,
        [endereco.city, endereco.state].filter(Boolean).join('/'),
        endereco.postalCode ? `CEP ${endereco.postalCode}` : null,
      ]
        .filter((parte) => parte && parte.length > 0)
        .join(' · ')
    : null

  const cidade =
    endereco?.city && endereco.state ? `${endereco.city} · ${endereco.state}` : (endereco?.city ?? null)

  return {
    razaoSocial: config?.legalName ?? null,
    nomeFantasia: config?.tradeName ?? null,
    cnpj: config?.cnpj ?? null,
    inscricaoEstadual: config?.stateRegistration ?? null,
    email: config?.email ?? null,
    whatsapp: config?.whatsapp ?? null,
    horario: config?.businessHours ?? null,
    endereco: linha && linha.length > 0 ? linha : null,
    cidade,
    versao: config?.legalVersion ?? null,
    avisoDeProducao: config?.productionBanner ?? null,
    pedidoMinimo: config?.defaultMinQty ?? 20,
  }
})

/** `5533999478774` vira `(33) 99947-8774`, que é como se lê um telefone. */
export function formatarWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, '').replace(/^55/, '')
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return numero
}
