import type { TextField } from 'payload'

/** Transforma um texto em slug de URL: "Vela de Coração" -> "vela-de-coracao". */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Campo de slug com preenchimento automático a partir de outro campo.
 *
 * O slug faz parte da URL e do link dos anúncios ativos. Depois que um
 * produto está no ar, mudar o slug exige um redirecionamento 301, senão
 * o anúncio e o ranking do Google quebram.
 */
/** O slug é sempre um texto único, nunca lista: por isso `hasMany` fica de fora. */
type SlugOverrides = Partial<
  Omit<TextField, 'name' | 'type' | 'hasMany' | 'maxRows' | 'minRows' | 'validate'>
>

export function slugField(from = 'name', overrides: SlugOverrides = {}): TextField {
  return {
    ...overrides,
    name: 'slug',
    type: 'text',
    hasMany: false,
    label: overrides.label ?? 'Endereço na web (slug)',
    index: true,
    unique: true,
    admin: {
      position: 'sidebar',
      description:
        'Preenchido sozinho a partir do nome. Depois que a página estiver no ar, evite mudar: os links dos anúncios usam este endereço.',
      ...overrides.admin,
    },
    hooks: {
      beforeValidate: [
        ({ value, data, originalDoc }) => {
          if (typeof value === 'string' && value.trim() !== '') return slugify(value)
          const source = (data?.[from] ?? originalDoc?.[from]) as string | undefined
          return source ? slugify(source) : value
        },
      ],
      ...overrides.hooks,
    },
  }
}
