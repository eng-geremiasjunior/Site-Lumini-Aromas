import Link from 'next/link'

/**
 * O atalho para a tela de clientes.
 *
 * Fica junto dos outros dois porque as três são o que se abre fora do
 * fluxo das coleções: lançar a venda que fechou no WhatsApp, ver se o mês
 * está de pé, e ver quem está montando pedido agora.
 */
export function BotaoClientes() {
  return (
    <Link
      href="/admin/clientes"
      style={{
        display: 'block',
        margin: '-1rem 0 1.5rem',
        padding: '0.7rem 1rem',
        borderRadius: 5,
        border: '1px solid var(--theme-border-color)',
        color: 'var(--theme-elevation-700)',
        textDecoration: 'none',
        textAlign: 'center',
        fontWeight: 500,
        fontSize: 13,
      }}
    >
      Clientes
    </Link>
  )
}

export default BotaoClientes
