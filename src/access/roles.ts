import type { Access, FieldAccess, Where } from 'payload'

/**
 * Papéis da equipe:
 * - dono: acesso total, inclusive financeiro e configurações.
 * - atendente: pedidos, clientes, orçamentos e leads; não mexe em preço nem em configurações.
 * - designer: só enxerga a personalização dos pedidos e anexa a prova de arte.
 */
export type Role = 'dono' | 'atendente' | 'designer'

export const ROLE_OPTIONS: Array<{ label: string; value: Role }> = [
  { label: 'Dono', value: 'dono' },
  { label: 'Atendente', value: 'atendente' },
  { label: 'Designer', value: 'designer' },
]

type UserWithRole = { role?: Role } | null | undefined

function hasRole(user: UserWithRole, ...roles: Role[]): boolean {
  if (!user?.role) return false
  return roles.includes(user.role)
}

/** Qualquer visitante, inclusive não autenticado (usado na vitrine). */
export const anyone: Access = () => true

/** Somente o dono. */
export const owner: Access = ({ req }) => hasRole(req.user as UserWithRole, 'dono')

/** Dono e atendente. */
export const admins: Access = ({ req }) =>
  hasRole(req.user as UserWithRole, 'dono', 'atendente')

/** Toda a equipe logada, incluindo o designer. */
export const staff: Access = ({ req }) =>
  hasRole(req.user as UserWithRole, 'dono', 'atendente', 'designer')

/** Somente o dono, para campos sensíveis (custo, margem, taxas). */
export const ownerField: FieldAccess = ({ req }) => hasRole(req.user as UserWithRole, 'dono')

/**
 * Publicado e não arquivado é visível a todos; o resto só para a equipe.
 * `_status` é o campo que o próprio Payload usa para rascunho e publicado.
 */
export const publishedOrStaff: Access = ({ req }) => {
  if (hasRole(req.user as UserWithRole, 'dono', 'atendente', 'designer')) return true

  const somentePublicados: Where = {
    and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
  }
  return somentePublicados
}
