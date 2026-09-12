/**
 * As frases da prova social.
 *
 * Regra que vale para todas: **nunca o nome da cliente.** Tipo de evento,
 * cidade e mês são o suficiente para a frase soar real, e são dados que não
 * identificam ninguém. Nome de pessoa numa página pública, sem base legal,
 * é problema — não é marketing.
 *
 * A segunda regra é o silêncio. Quando não há do que falar, não se fala:
 * produto novo fica sem frase, e não com "seja o primeiro a comprar", que
 * anuncia que ninguém comprou.
 *
 * Funções puras: recebem o que já aconteceu, devolvem texto.
 */

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export type VendaAnterior = {
  /** Quantas peças foram naquele pedido. */
  quantidade: number
  tipoDoEvento?: string | null
  cidade?: string | null
  /** ISO da data do evento, ou da venda quando não houver evento. */
  quando?: string | null
}

/**
 * A linha que fica perto do seletor de quantidade.
 *
 * "As últimas 100 peças deste modelo foram para um casamento em Governador
 * Valadares, em outubro." Responde duas dúvidas de uma vez — a loja vende
 * mesmo, e este modelo já foi feito nessa quantidade — em uma frase que a
 * pessoa lê sem parar de decidir.
 */
export function fraseDaUltimaVenda(venda: VendaAnterior | null): string | null {
  if (!venda || venda.quantidade <= 0) return null

  const pedacos: string[] = [`As últimas ${venda.quantidade} peças deste modelo foram`]

  if (venda.tipoDoEvento) {
    pedacos.push(`para ${artigo(venda.tipoDoEvento)} ${venda.tipoDoEvento.toLowerCase()}`)
  } else {
    pedacos.push('para um evento')
  }

  if (venda.cidade) pedacos.push(`em ${venda.cidade}`)

  const mes = mesPorExtenso(venda.quando)
  if (mes) pedacos.push(`, em ${mes}`)

  return `${pedacos.join(' ').replace(' ,', ',')}.`
}

/** A legenda da foto de cliente na galeria. */
export function legendaDaFoto(evento: {
  tipo?: string | null
  cidade?: string | null
  quando?: string | null
}): string | null {
  const partes = [evento.tipo, evento.cidade, mesPorExtenso(evento.quando)].filter(
    (parte): parte is string => Boolean(parte),
  )

  return partes.length > 0 ? partes.join(' · ') : null
}

function mesPorExtenso(iso?: string | null): string | null {
  if (!iso) return null
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  return MESES[data.getUTCMonth()] ?? null
}

/** "um casamento", "uma festa de 15 anos". */
function artigo(tipo: string): string {
  const femininos = ['bodas', 'maternidade']
  return femininos.some((palavra) => tipo.toLowerCase().includes(palavra)) ? 'umas' : 'um'
}
