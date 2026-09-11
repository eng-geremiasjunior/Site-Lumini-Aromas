import type { NumberField } from 'payload'

/**
 * Campo de dinheiro.
 *
 * Por dentro guarda SEMPRE centavos (inteiro). Nunca usamos float para
 * dinheiro. Na tela, o componente MoneyField mostra e recebe reais.
 */
/** Dinheiro é sempre um valor único, nunca lista: por isso `hasMany` fica de fora. */
type MoneyOverrides = Partial<
  Omit<NumberField, 'name' | 'type' | 'hasMany' | 'maxRows' | 'minRows' | 'validate'>
> & {
  name: string
  label: string
}

export function money(overrides: MoneyOverrides): NumberField {
  const { name, label, admin, ...rest } = overrides

  return {
    ...rest,
    name,
    label,
    type: 'number',
    hasMany: false,
    min: rest.min ?? 0,
    admin: {
      ...admin,
      components: {
        ...admin?.components,
        Field: '@/fields/MoneyField#MoneyField',
      },
    },
  }
}

/** Converte reais digitados pelo usuário para centavos. Aceita "38,00", "38.00", "R$ 38". */
export function reaisToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null
  if (typeof input === 'number') return Math.round(input * 100)

  const cleaned = input
    .replace(/[R$\s ]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')

  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/** Converte centavos para o texto em reais mostrado no campo (sem o símbolo). */
export function centsToReais(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
