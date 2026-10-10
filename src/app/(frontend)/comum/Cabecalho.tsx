import { getCart } from '../../../commerce/cart/cart-service.ts'
import { listarOcasioes, listarPecasDaVitrine } from '../../../commerce/catalog/get-vitrine.ts'
import { dadosDaEmpresa } from '../../../commerce/store/configuracoes.ts'
import { BarraDoCabecalho } from './BarraDoCabecalho.tsx'

/**
 * O cabeçalho, com os dados que ele mostra.
 *
 * A parte de servidor só busca: as ocasiões e as contagens do menu, o
 * número da sacola e o WhatsApp da loja. A interação toda — encolher,
 * abrir o menu, filtrar — fica na barra, que é componente de cliente.
 *
 * As consultas passam pelo `cache` do React, então a lista de peças que o
 * menu usa é a mesma que a vitrine desenha: uma ida ao banco, não duas.
 */
export async function Cabecalho() {
  const [pecas, empresa, carrinho] = await Promise.all([
    listarPecasDaVitrine(),
    dadosDaEmpresa(),
    // Sem cookie de carrinho isto não toca no banco: devolve vazio na hora.
    getCart().catch(() => null),
  ])

  /*
   * As ocasiões entram todas, com a contagem real — inclusive as que
   * estão em zero. Esconder as vazias deixaria o menu com uma linha só
   * enquanto o catálogo não tiver ocasião marcada, e o dono não teria
   * como descobrir que o que falta é marcar a ocasião em cada peça. Com a
   * contagem à vista, o menu conta o que está acontecendo.
   */
  const ocasioes = await listarOcasioes(pecas)

  return (
    <BarraDoCabecalho
      ocasioes={ocasioes}
      totalDePecas={pecas.length}
      itensNaSacola={carrinho?.lines.length ?? 0}
      whatsapp={empresa.whatsapp}
    />
  )
}
