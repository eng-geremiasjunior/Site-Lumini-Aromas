'use client'

import { useEffect } from 'react'

import { lerEscolha } from '../../../commerce/marketing/google-tag.ts'
import { PIXEL, carregarPixel } from './pixel.ts'

/**
 * Liga o Pixel da Meta quando a pessoa já tinha aceitado.
 *
 * Roda no navegador, e não no servidor como a tag do Google, por dois
 * motivos que se somam:
 *
 *   - o Pixel grava o cookie `_fbp` no instante em que carrega, então não
 *     pode estar no HTML antes do aceite;
 *   - ler o cookie no servidor tornaria dinâmica toda página da loja, e a
 *     vitrine precisa sair do cache.
 *
 * Quem aceita agora não passa por aqui: o próprio aviso de cookies chama
 * `carregarPixel()` na hora do clique. Este componente cuida das visitas
 * seguintes, em que a escolha já está gravada.
 */
export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL) return

    const bruto = document.cookie.match(/(?:^|; )lumini_consentimento=([^;]*)/)
    const escolha = lerEscolha(bruto ? decodeURIComponent(bruto[1] as string) : null)

    if (escolha?.publicidade) carregarPixel()
  }, [])

  return null
}
