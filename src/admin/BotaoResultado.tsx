import Link from 'next/link'

/**
 * O atalho para o resultado do mês.
 *
 * Fica logo abaixo do "Novo pedido" porque são as duas coisas que se faz
 * fora do fluxo das coleções: lançar a venda que fechou no WhatsApp e olhar
 * se o mês está de pé.
 */
export function BotaoResultado() {
  return (
    <Link
      href="/admin/dre"
      style={{
        display: 'block',
        margin: '-1rem 0 1.5rem',
        padding: '0.7rem 1rem',
        borderRadius: 4,
        border: '1px solid var(--theme-elevation-150)',
        color: 'var(--theme-elevation-800)',
        textDecoration: 'none',
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      Resultado do mês
    </Link>
  )
}

export default BotaoResultado
