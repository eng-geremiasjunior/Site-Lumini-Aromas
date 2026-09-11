'use client'

import { useField, FieldLabel, FieldDescription } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import { centsToReais, reaisToCents } from './money.ts'

/**
 * Campo de dinheiro do admin.
 *
 * O dono digita reais ("38,00"); o banco guarda centavos (3800).
 * Assim nenhuma conta da loja depende de ponto flutuante.
 */
export const MoneyField: NumberFieldClientComponent = ({ field, path }) => {
  const { value, setValue, showError, errorMessage } = useField<number>({ path })
  const [text, setText] = useState<string>(() => centsToReais(value))

  // Mantém o texto em sincronia quando o valor muda por fora (ex.: carregar o documento).
  useEffect(() => {
    const cents = reaisToCents(text)
    if (cents !== (value ?? null)) setText(centsToReais(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const label = typeof field.label === 'string' ? field.label : field.name
  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined

  return (
    <div className={`field-type number${showError ? ' error' : ''}`}>
      <FieldLabel htmlFor={`field-${path}`} label={label} required={field.required} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ opacity: 0.65 }}>R$</span>
        <input
          id={`field-${path}`}
          name={path}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={text}
          onChange={(event) => {
            const raw = event.target.value
            setText(raw)
            setValue(reaisToCents(raw))
          }}
          onBlur={() => setText(centsToReais(value))}
          style={{ width: '100%' }}
        />
      </div>

      {showError && errorMessage ? <div className="field-error">{errorMessage}</div> : null}
      {description ? <FieldDescription description={description} path={path} /> : null}
    </div>
  )
}
