'use client'

/**
 * Imprimir, que na prática é "salvar em PDF".
 *
 * Não existe geração de PDF no servidor de propósito: a caixa de impressão
 * do navegador já salva em PDF, já deixa escolher a página e não acrescenta
 * nenhuma biblioteca ao projeto. O arquivo sai do mesmo jeito, e é ele que
 * vai para o contador ou para o sócio.
 */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="lumini-sem-impressao"
      style={{
        padding: '0.55rem 1.1rem',
        borderRadius: 4,
        border: 'none',
        background: '#111',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.9rem',
      }}
    >
      Imprimir ou salvar em PDF
    </button>
  )
}
