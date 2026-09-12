'use client'

import { useEffect, useRef } from 'react'

import type { DadosDoEvento, EventoDaLoja } from '../../../commerce/marketing/google-tag.ts'
import { dispararEvento, jaContou } from './disparar.ts'

/**
 * Dispara um evento ao abrir a página.
 *
 * Não desenha nada: é colocado na página que representa o passo, e o passo
 * acontece uma vez. A trava de montagem existe porque o React, em
 * desenvolvimento, monta cada componente duas vezes de propósito — sem ela,
 * todo evento sairia dobrado nos testes.
 */
export function Evento({
  nome,
  dados,
  comprador,
}: {
  nome: EventoDaLoja
  dados: DadosDoEvento
  comprador?: Record<string, unknown> | null
}) {
  const jaDisparou = useRef(false)

  useEffect(() => {
    if (jaDisparou.current) return
    jaDisparou.current = true

    if (nome === 'purchase' && dados.idDoPedido && jaContou(dados.idDoPedido)) return

    dispararEvento(nome, dados, comprador)
  }, [nome, dados, comprador])

  return null
}
