'use client'

import { useField, FieldLabel } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'

import type { LotTableRow } from '../commerce/pricing/lot-pricing.ts'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Mostra a tabela de preços gerada a partir do preço de uma peça.
 *
 * É somente leitura de propósito. No WooCommerce cada faixa era digitada
 * à mão, o que produziu preços errados e faixas sem preço. Aqui a tabela
 * é consequência de um único campo.
 */
export const LotTableField: JSONFieldClientComponent = ({ field, path }) => {
  const { value } = useField<LotTableRow[]>({ path })
  const rows = Array.isArray(value) ? value : []
  const label = typeof field.label === 'string' ? field.label : 'Tabela de preços gerada'
  const hasDiscount = rows.some((row) => row.savingsPerUnit > 0)

  return (
    <div className="field-type json">
      <FieldLabel label={label} />

      {rows.length === 0 ? (
        <p style={{ opacity: 0.7, margin: '0.5rem 0' }}>
          Preencha o preço de uma peça e salve. A tabela aparece aqui.
        </p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                <th style={{ padding: '0.4rem 0.5rem' }}>Quantidade</th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Preço da peça</th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Preço do lote</th>
                {hasDiscount ? <th style={{ padding: '0.4rem 0.5rem' }}>Economia</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.qty} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                  <td style={{ padding: '0.4rem 0.5rem' }}>{row.qty} peças</td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>{brl(row.unitPrice)}</td>
                  <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{brl(row.lotPrice)}</td>
                  {hasDiscount ? (
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      {row.savingsTotal > 0 ? brl(row.savingsTotal) : '—'}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ opacity: 0.7, marginTop: '0.6rem', fontSize: '0.85rem' }}>
            Calculada a partir do preço de uma peça. Para mudar os valores, altere o preço da peça
            ou as faixas de desconto por volume.
          </p>
        </>
      )}
    </div>
  )
}
