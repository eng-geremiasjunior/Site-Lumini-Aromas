/**
 * Os e-mails que a cliente recebe.
 *
 * O WooCommerce manda 14 mensagens transacionais, quase todas com cara de
 * sistema: "Seu pedido #4954 mudou de status para Processando". Aqui são
 * sete, escritas como quem avisa uma pessoa que está esperando as
 * lembrancinhas do próprio casamento.
 *
 * Três regras valem para todas:
 *
 * 1. Toda mensagem leva o número do pedido e o e-mail usados na compra,
 *    porque é com esse par que ela entra na área dela — e leva também o
 *    link direto, para ela não precisar digitar nada.
 * 2. Toda mensagem termina dizendo o que acontece depois. Silêncio sobre o
 *    próximo passo é o que gera a mensagem no WhatsApp perguntando.
 * 3. Nenhuma promete prazo que não foi calculado. Prazo anunciado vincula
 *    (CDC art. 35): o que vai no texto é a data que o pedido já carrega.
 *
 * São funções puras: recebem os dados do pedido, devolvem assunto e corpo.
 * Quem entrega é outro módulo, e é ele que lida com falha e reenvio.
 */

export type DadosDoEmail = {
  numero: string
  /** Primeiro nome, que é como a gente fala com ela. */
  nome: string
  email: string
  /** Código de acesso do pedido, que monta o link direto. */
  token: string
  /** Ex.: https://luminiaromas.com.br */
  urlDaLoja: string
  /** Só dígitos, com DDI. */
  whatsapp: string
  totalCentavos: number
  itens: Array<{ descricao: string; quantidade: number }>
  eventType?: string | null
  /** ISO. */
  eventDate?: string | null
  /** Data prometida de entrega, já calculada no checkout. ISO. */
  prazoPrometido?: string | null
  codigoRastreio?: string | null
  transportadora?: string | null
  /** Usado no e-mail de cancelamento/reembolso. */
  motivo?: string | null
}

export type Email = {
  assunto: string
  /** Versão em texto puro. É a fonte: o HTML é gerado a partir dela. */
  texto: string
}

export type TipoDeEmail =
  | 'pedido_recebido'
  | 'pagamento_aprovado'
  | 'arte_para_aprovar'
  | 'em_producao'
  | 'pedido_enviado'
  | 'pedido_entregue'
  | 'pedido_cancelado'

export function montarEmail(tipo: TipoDeEmail, dados: DadosDoEmail): Email {
  switch (tipo) {
    case 'pedido_recebido':
      return pedidoRecebido(dados)
    case 'pagamento_aprovado':
      return pagamentoAprovado(dados)
    case 'arte_para_aprovar':
      return arteParaAprovar(dados)
    case 'em_producao':
      return emProducao(dados)
    case 'pedido_enviado':
      return pedidoEnviado(dados)
    case 'pedido_entregue':
      return pedidoEntregue(dados)
    case 'pedido_cancelado':
      return pedidoCancelado(dados)
  }
}

// ------------------------------------------------------------------ mensagens

function pedidoRecebido(d: DadosDoEmail): Email {
  return {
    assunto: `Recebemos o seu pedido ${d.numero}`,
    texto: [
      `${d.nome}, recebemos o seu pedido.`,
      '',
      referenciaAoEvento(d),
      resumo(d),
      '',
      'Estamos aguardando a confirmação do pagamento. Assim que ela chegar, avisamos você por aqui e o pedido entra na fila de produção.',
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

function pagamentoAprovado(d: DadosDoEmail): Email {
  return {
    assunto: `Pagamento confirmado — pedido ${d.numero}`,
    texto: [
      `${d.nome}, o pagamento foi confirmado. Suas peças estão na fila.`,
      '',
      resumo(d),
      prazo(d),
      '',
      'O próximo passo é a arte do rótulo: preparamos a prova e mandamos para você conferir antes de qualquer coisa ser produzida. Nada é feito sem a sua aprovação.',
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

function arteParaAprovar(d: DadosDoEmail): Email {
  return {
    assunto: `A arte do seu rótulo está pronta para você conferir — pedido ${d.numero}`,
    texto: [
      `${d.nome}, a prova do seu rótulo ficou pronta.`,
      '',
      'Abra o link abaixo e leia com calma: o rótulo é impresso exatamente como está na prova, letra por letra, acento por acento.',
      '',
      `Conferir a arte: ${linkDoPedido(d)}`,
      '',
      'Se estiver tudo certo, é um clique e a produção começa. Se quiser mudar alguma coisa, o botão de pedir ajuste está do lado — refazer uma prova é rápido, e é muito melhor do que descobrir depois.',
      '',
      'Enquanto você não aprova, nada é produzido.',
      '',
      rodape(d),
    ].join('\n'),
  }
}

function emProducao(d: DadosDoEmail): Email {
  return {
    assunto: `Suas peças começaram a ser feitas — pedido ${d.numero}`,
    texto: [
      `${d.nome}, a produção das suas peças começou.`,
      '',
      'Cada uma é feita à mão, uma a uma, no aroma que você escolheu. Vamos colocando fotos da produção na sua área — dá para acompanhar por lá.',
      prazo(d),
      '',
      `Acompanhar: ${linkDoPedido(d)}`,
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

function pedidoEnviado(d: DadosDoEmail): Email {
  const transporte = d.transportadora ? ` pela ${d.transportadora}` : ''

  return {
    assunto: `Seu pedido ${d.numero} saiu para entrega`,
    texto: [
      `${d.nome}, suas lembrancinhas saíram daqui${transporte}.`,
      '',
      d.codigoRastreio
        ? `Código de rastreio: ${d.codigoRastreio}\nAcompanhar: https://www.melhorrastreio.com.br/rastreio/${d.codigoRastreio}`
        : 'O código de rastreio aparece na sua área assim que a transportadora liberar.',
      '',
      referenciaAoEvento(d),
      `Tudo sobre o pedido: ${linkDoPedido(d)}`,
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

function pedidoEntregue(d: DadosDoEmail): Email {
  return {
    assunto: `Seu pedido ${d.numero} foi entregue`,
    texto: [
      `${d.nome}, o seu pedido chegou.`,
      '',
      d.eventType
        ? `Esperamos que o seu ${d.eventType.toLowerCase()} seja tudo o que você imaginou.`
        : 'Esperamos que o seu evento seja tudo o que você imaginou.',
      '',
      'Se puder, depois nos conte como ficou — e se tirar foto das peças na mesa, a gente adoraria ver. É com foto de cliente que a gente mostra o trabalho para quem ainda não conhece (só publicamos com a sua autorização).',
      '',
      rodape(d),
    ].join('\n'),
  }
}

function pedidoCancelado(d: DadosDoEmail): Email {
  return {
    assunto: `Pedido ${d.numero} cancelado`,
    texto: [
      `${d.nome}, o seu pedido ${d.numero} foi cancelado.`,
      '',
      d.motivo ? `Motivo: ${d.motivo}` : null,
      d.motivo ? '' : null,
      'Se tiver sido engano, ou se você quiser retomar, fale com a gente que a gente resolve — o que foi montado no pedido está guardado aqui.',
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

// -------------------------------------------------------------------- pedaços

function resumo(d: DadosDoEmail): string {
  const linhas = d.itens.map((item) => `- ${item.quantidade} × ${item.descricao}`)
  return [`Pedido ${d.numero}`, ...linhas, `Total: ${reais(d.totalCentavos)}`].join('\n')
}

/**
 * O prazo só entra no texto quando já foi calculado. Prazo anunciado
 * vincula o fornecedor (CDC art. 35), então nada de "em breve" ou de data
 * chutada para deixar a mensagem mais simpática.
 */
function prazo(d: DadosDoEmail): string | null {
  if (!d.prazoPrometido) return null
  return `\nPrevisão de entrega: ${porExtenso(d.prazoPrometido)}.`
}

function referenciaAoEvento(d: DadosDoEmail): string | null {
  if (!d.eventType && !d.eventDate) return null
  if (d.eventType && d.eventDate) {
    return `Para o seu ${d.eventType.toLowerCase()} de ${porExtenso(d.eventDate)}.\n`
  }
  if (d.eventType) return `Para o seu ${d.eventType.toLowerCase()}.\n`
  return `Para o seu evento de ${porExtenso(d.eventDate!)}.\n`
}

function rodape(d: DadosDoEmail): string {
  return [
    '—',
    `Acompanhe o seu pedido: ${linkDoPedido(d)}`,
    `Se precisar entrar pela área da loja, é o número ${d.numero} e o e-mail ${d.email}. Não pedimos senha.`,
    '',
    `Qualquer dúvida, chame no WhatsApp: https://wa.me/${d.whatsapp}`,
    '',
    'Lumini Aromas — velas artesanais para eventos',
    'Governador Valadares, MG · CNPJ 34.499.353/0001-08',
  ].join('\n')
}

export function linkDoPedido(d: Pick<DadosDoEmail, 'urlDaLoja' | 'token'>): string {
  return `${d.urlDaLoja.replace(/\/$/, '')}/minhaconta/pedido/${d.token}/`
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

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

function porExtenso(iso: string): string {
  const data = new Date(iso)
  return `${data.getUTCDate()} de ${MESES[data.getUTCMonth()]}`
}

/**
 * Versão HTML.
 *
 * Sai do mesmo texto, para nunca haver duas mensagens diferentes dizendo
 * coisas diferentes. Cliente de e-mail é lugar hostil: nada de CSS externo,
 * nada de grid, nada que dependa de imagem carregar.
 */
export function emHtml(email: Email, urlDaLoja: string): string {
  const paragrafos = email.texto
    .split('\n\n')
    .map((bloco) => {
      const comLinks = escapar(bloco).replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" style="color:#8a6d3b">$1</a>',
      )
      return `<p style="margin:0 0 1rem;line-height:1.6">${comLinks.replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  return [
    '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2">',
    '<div style="max-width:34rem;margin:0 auto;padding:2rem 1.5rem;font-family:Georgia,\'Times New Roman\',serif;color:#2e2a26;font-size:16px">',
    `<p style="margin:0 0 1.75rem"><a href="${escapar(urlDaLoja)}" style="color:#8a6d3b;text-decoration:none;letter-spacing:0.2em;font-size:14px">LUMINI AROMAS</a></p>`,
    paragrafos,
    '</div></body></html>',
  ].join('')
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
