/**
 * A linha do tempo que a cliente vê.
 *
 * O painel do WooCommerce mostra "Pedido #4954 — Processando". Isso não diz
 * nada para quem está esperando as lembrancinhas do próprio casamento.
 *
 * Aqui cada etapa tem nome de gente, explica o que está acontecendo e o que
 * vem depois. O objetivo é a cliente fechar a página sabendo que está tudo
 * certo, em vez de mandar mensagem perguntando.
 */

import { ORDER_STATUSES, type OrderStatus } from './statuses.ts'
import { countBusinessDays, formatIsoDate, type IsoDate } from '../shipping/business-days.ts'

export type EtapaEstado = 'concluida' | 'atual' | 'futura' | 'interrompida'

export type Etapa = {
  chave: string
  titulo: string
  /** O que está acontecendo agora, ou o que aconteceu. */
  descricao: string
  estado: EtapaEstado
  /** Quando aconteceu, se já aconteceu. */
  em?: string | null
}

/** As etapas normais, na ordem em que a cliente as vive. */
const CAMINHO: Array<{ chave: string; status: OrderStatus[] }> = [
  { chave: 'recebido', status: ['pending'] },
  { chave: 'pago', status: ['processing'] },
  { chave: 'arte', status: ['art_approval'] },
  { chave: 'producao', status: ['production'] },
  { chave: 'enviado', status: ['shipped'] },
  { chave: 'entregue', status: ['completed'] },
]

export type TimelineInput = {
  status: OrderStatus
  /** O pedido tem peça com arte a aprovar. */
  temArte: boolean
  arteAprovadaEm?: string | null
  pagoEm?: string | null
  enviadoEm?: string | null
  concluidoEm?: string | null
  criadoEm?: string | null
  codigoRastreio?: string | null
  /** Foi tirada foto da produção das peças dela. */
  temFotoDaProducao?: boolean
}

export function construirLinhaDoTempo(pedido: TimelineInput): Etapa[] {
  // Situações que interrompem o caminho normal têm tela própria.
  if (['cancelled', 'refunded', 'failed', 'disputed'].includes(pedido.status)) {
    return [
      {
        chave: 'interrompido',
        titulo: ORDER_STATUSES[pedido.status].label,
        descricao: textoDeInterrupcao(pedido.status),
        estado: 'interrompida',
      },
    ]
  }

  const etapas = CAMINHO.filter((etapa) => etapa.chave !== 'arte' || pedido.temArte)
  const atual = etapas.findIndex((etapa) => etapa.status.includes(pedido.status))
  const indiceAtual = atual === -1 ? 0 : atual

  return etapas.map((etapa, indice) => {
    const estado: EtapaEstado =
      indice < indiceAtual ? 'concluida' : indice === indiceAtual ? 'atual' : 'futura'

    return {
      chave: etapa.chave,
      titulo: titulo(etapa.chave),
      descricao: descricao(etapa.chave, estado, pedido),
      estado,
      em: dataDaEtapa(etapa.chave, pedido),
    }
  })
}

function titulo(chave: string): string {
  const titulos: Record<string, string> = {
    recebido: 'Pedido recebido',
    pago: 'Pagamento confirmado',
    arte: 'Arte do rótulo',
    producao: 'Produção artesanal',
    enviado: 'A caminho',
    entregue: 'Entregue',
  }
  return titulos[chave] ?? chave
}

/**
 * O texto muda conforme a etapa já passou, está acontecendo ou ainda vem.
 * É o que faz a página conversar com a cliente em vez de listar estados.
 */
function descricao(chave: string, estado: EtapaEstado, pedido: TimelineInput): string {
  const textos: Record<string, Record<EtapaEstado, string>> = {
    recebido: {
      concluida: 'Recebemos o seu pedido.',
      atual: 'Recebemos o seu pedido e estamos aguardando a confirmação do pagamento.',
      futura: 'Assim que o pedido chegar, avisamos por aqui.',
      interrompida: '',
    },
    pago: {
      concluida: 'Pagamento confirmado.',
      atual: 'Pagamento confirmado. Seu pedido entrou na fila de produção.',
      futura: 'Assim que o pagamento for confirmado, começamos.',
      interrompida: '',
    },
    arte: {
      concluida: pedido.arteAprovadaEm
        ? 'Você aprovou a arte. Foi exatamente assim que produzimos.'
        : 'Arte definida.',
      atual:
        'Preparamos a prova do seu rótulo e ela está aqui embaixo esperando você conferir. Nada é produzido antes da sua aprovação.',
      futura: 'Vamos preparar a prova do rótulo e enviar para você aprovar.',
      interrompida: '',
    },
    producao: {
      concluida: 'Suas peças ficaram prontas.',
      atual: pedido.temFotoDaProducao
        ? 'Suas peças estão sendo feitas à mão, uma a uma. Tem foto delas aqui embaixo.'
        : 'Suas peças estão sendo feitas à mão, uma a uma.',
      futura: 'Cada peça é feita à mão, no aroma que você escolheu.',
      interrompida: '',
    },
    enviado: {
      concluida: 'Enviado.',
      atual: pedido.codigoRastreio
        ? 'Seu pedido saiu daqui. Dá para acompanhar pelo código de rastreio abaixo.'
        : 'Seu pedido saiu daqui. Em breve o código de rastreio aparece aqui.',
      futura: 'Quando despacharmos, o código de rastreio aparece aqui.',
      interrompida: '',
    },
    entregue: {
      concluida: 'Entregue. Esperamos que o seu evento seja lindo.',
      atual: 'Chegou! Esperamos que o seu evento seja tudo o que você imaginou.',
      futura: 'Entregamos no endereço que você informou.',
      interrompida: '',
    },
  }

  return textos[chave]?.[estado] ?? ''
}

function dataDaEtapa(chave: string, pedido: TimelineInput): string | null {
  const datas: Record<string, string | null | undefined> = {
    recebido: pedido.criadoEm,
    pago: pedido.pagoEm,
    arte: pedido.arteAprovadaEm,
    enviado: pedido.enviadoEm,
    entregue: pedido.concluidoEm,
  }
  return datas[chave] ?? null
}

function textoDeInterrupcao(status: OrderStatus): string {
  const textos: Partial<Record<OrderStatus, string>> = {
    cancelled: 'Este pedido foi cancelado. Se foi engano, fale com a gente que resolvemos.',
    refunded: 'O valor deste pedido foi devolvido.',
    failed:
      'O pagamento não foi concluído. Seu pedido continua guardado: é só tentar de novo ou escolher outra forma de pagamento.',
    disputed: 'Este pedido está em análise. Entramos em contato com você.',
  }
  return textos[status] ?? ''
}

/**
 * Contagem até o evento.
 *
 * É o número que a cliente realmente quer ver, e nenhuma loja mostra:
 * não "seu pedido está em produção", mas "faltam 32 dias para o seu
 * casamento e as peças ficam prontas com folga".
 */
export type ContagemDoEvento = {
  diasCorridos: number
  /** Já passou. */
  passou: boolean
  /** Dias úteis entre hoje e o evento, que é o que importa para a produção. */
  diasUteis: number
  texto: string
}

export function contarAteOEvento(
  dataDoEvento: IsoDate,
  hoje: IsoDate = formatIsoDate(new Date()),
): ContagemDoEvento {
  const evento = new Date(`${dataDoEvento}T00:00:00Z`).getTime()
  const agora = new Date(`${hoje}T00:00:00Z`).getTime()
  const diasCorridos = Math.round((evento - agora) / 86_400_000)

  if (diasCorridos < 0) {
    return {
      diasCorridos,
      passou: true,
      diasUteis: 0,
      texto: 'Seu evento já aconteceu. Esperamos que tenha sido lindo.',
    }
  }

  const diasUteis = countBusinessDays(hoje, dataDoEvento)

  if (diasCorridos === 0) {
    return { diasCorridos, passou: false, diasUteis, texto: 'É hoje! Um evento lindo para você.' }
  }

  if (diasCorridos === 1) {
    return { diasCorridos, passou: false, diasUteis, texto: 'Falta 1 dia para o seu evento.' }
  }

  return {
    diasCorridos,
    passou: false,
    diasUteis,
    texto: `Faltam ${diasCorridos} dias para o seu evento.`,
  }
}

/**
 * Título do pedido para a cliente.
 *
 * "Pedido #5000" não significa nada para ela. "Suas lembrancinhas para o
 * casamento de 12 de outubro" significa.
 */
export function tituloDoPedido(pedido: {
  eventType?: string | null
  eventDate?: string | null
  number: string
}): string {
  if (!pedido.eventType && !pedido.eventDate) {
    return `Seu pedido ${pedido.number}`
  }

  const tipo = pedido.eventType ? pedido.eventType.toLowerCase() : 'evento'

  if (!pedido.eventDate) return `Suas lembrancinhas de ${tipo}`

  const data = new Date(pedido.eventDate)
  const dia = data.getUTCDate()
  const mes = [
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
  ][data.getUTCMonth()]

  return `Suas lembrancinhas de ${tipo}, ${dia} de ${mes}`
}
