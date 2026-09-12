import Link from 'next/link'

/**
 * O botão que abre a tela de lançar venda.
 *
 * Fica no topo do menu, antes das coleções, porque é a ação mais frequente
 * do dia: a maioria das vendas fecha no WhatsApp, e cada uma delas passa
 * por aqui.
 */
export function BotaoNovoPedido() {
  return (
    <Link
      href="/admin/novo-pedido"
      style={{
        display: 'block',
        margin: '0 0 1.5rem',
        padding: '0.7rem 1rem',
        borderRadius: 4,
        background: 'var(--theme-elevation-800)',
        color: 'var(--theme-elevation-0)',
        textDecoration: 'none',
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      + Novo pedido
    </Link>
  )
}

export default BotaoNovoPedido
