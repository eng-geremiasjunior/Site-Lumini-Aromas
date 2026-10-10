/**
 * A faixa de condições, logo abaixo da abertura.
 *
 * Responde de uma vez as quatro perguntas que fazem a pessoa desistir
 * antes de rolar: é feito à mão?, qual o mínimo?, eu vejo antes?, como
 * pago? É um componente de servidor — não tem interação nenhuma, só
 * entrada escalonada, que é CSS.
 *
 * No celular tudo isso vira uma linha. Quatro blocos empilhados empurram
 * a vitrine para fora da primeira tela, e a vitrine é o que vende.
 */

const CONDICOES = [
  {
    titulo: 'Montada à mão',
    apoio: 'Cada peça é produzida do zero para o seu evento, uma a uma.',
  },
  {
    titulo: 'A partir de 20 peças',
    apoio: 'Lotes fechados, com os nomes e a data na tag.',
  },
  {
    titulo: 'Arte aprovada antes',
    apoio: 'Você vê a prévia da tag e só então a produção começa.',
  },
  {
    titulo: 'Pix ou cartão em até 6x',
    apoio: 'Pagamento seguro pelo Mercado Pago, enviamos para todo o Brasil.',
  },
]

export function Condicoes({ pedidoMinimo = 20 }: { pedidoMinimo?: number }) {
  return (
    <section className="lumini-condicoes" aria-label="Como funciona">
      <div className="lumini-condicoes-grade">
        {CONDICOES.map((condicao, i) => (
          <div
            key={condicao.titulo}
            className="lumini-condicao"
            data-entrada
            style={{ '--atraso': `${i * 90}ms` } as React.CSSProperties}
          >
            <h3>
              {condicao.titulo === 'A partir de 20 peças'
                ? `A partir de ${pedidoMinimo} peças`
                : condicao.titulo}
            </h3>
            <p>{condicao.apoio}</p>
          </div>
        ))}
      </div>

      <div className="lumini-condicoes-linha">
        Montada à mão · Mínimo {pedidoMinimo} peças · Até 6x
      </div>
    </section>
  )
}
