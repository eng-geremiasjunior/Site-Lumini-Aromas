/**
 * Os lembretes de carrinho.
 *
 * Três mensagens, e nenhuma oferece desconto. A tentação de mandar "10% se
 * você voltar hoje" resolve uma venda e estraga dez: ensina a cliente a
 * abandonar o carrinho de propósito, e numa marca de luxo sugere que o
 * preço da etiqueta era negociável o tempo todo.
 *
 * O que elas fazem é lembrar que o carrinho está guardado, mostrar o
 * trabalho, e falar de prazo — que é o argumento verdadeiro quando existe
 * uma data de casamento marcada.
 *
 * Toda mensagem sai com o caminho de não receber mais. É legítimo interesse
 * com opt-out, como manda a LGPD, e é também o mínimo de educação.
 */

import type { Email } from './emails.ts'

export type DadosDoLembrete = {
  /** Primeiro nome, quando a gente sabe. */
  nome?: string | null
  urlDaLoja: string
  /** Código que devolve o carrinho montado. */
  tokenDeRecuperacao: string
  whatsapp: string
  itens: Array<{ descricao: string; quantidade: number }>
  subtotalCentavos: number
  /** Link do Instagram, para o lembrete que mostra trabalho pronto. */
  instagram?: string | null
}

export function montarLembrete(passo: number, d: DadosDoLembrete): Email {
  if (passo === 1) return primeiro(d)
  if (passo === 2) return segundo(d)
  return terceiro(d)
}

function primeiro(d: DadosDoLembrete): Email {
  return {
    assunto: 'Guardamos as suas lembrancinhas',
    texto: [
      `${saudacao(d)}, o que você montou continua aqui, do jeitinho que ficou.`,
      '',
      resumo(d),
      '',
      `Voltar para o carrinho: ${linkDeRetorno(d)}`,
      '',
      'Se surgiu alguma dúvida — aroma, quantidade, personalização —, é só responder este e-mail ou chamar no WhatsApp. A gente ajuda a escolher, sem compromisso.',
      '',
      rodape(d),
    ].join('\n'),
  }
}

function segundo(d: DadosDoLembrete): Email {
  return {
    assunto: 'Como ficam as nossas peças na mesa do evento',
    texto: [
      `${saudacao(d)}, seu carrinho continua guardado.`,
      '',
      'Enquanto você decide, deixamos aqui o que já saiu do nosso ateliê: casamentos, bodas, 15 anos, batizados. Cada peça é feita à mão, uma a uma, com o nome e a data que a cliente escolheu.',
      '',
      d.instagram ? `Ver o nosso trabalho: ${d.instagram}` : null,
      d.instagram ? '' : null,
      resumo(d),
      '',
      `Voltar para o carrinho: ${linkDeRetorno(d)}`,
      '',
      rodape(d),
    ]
      .filter((linha) => linha !== null)
      .join('\n'),
  }
}

function terceiro(d: DadosDoLembrete): Email {
  return {
    assunto: 'Sobre a data do seu evento',
    texto: [
      `${saudacao(d)}, um lembrete prático, e depois a gente para de escrever.`,
      '',
      'Nossas peças são feitas sob encomenda, uma a uma. Isso significa que a produção tem prazo, e que datas próximas de setembro a dezembro costumam fechar cedo — é quando se concentram os casamentos e os brindes de fim de ano.',
      '',
      'Se o seu evento tem data marcada, vale garantir o lugar na agenda agora, mesmo que você ainda queira acertar detalhes do rótulo depois. A arte é definida com calma, e nada é produzido antes da sua aprovação.',
      '',
      resumo(d),
      '',
      `Voltar para o carrinho: ${linkDeRetorno(d)}`,
      `Prefere conversar? ${whatsappUrl(d, 'Olá! Queria falar sobre o pedido que montei no site.')}`,
      '',
      rodape(d),
    ].join('\n'),
  }
}

function saudacao(d: DadosDoLembrete): string {
  return d.nome?.trim() ? d.nome.trim() : 'Olá'
}

function resumo(d: DadosDoLembrete): string {
  const linhas = d.itens.map((item) => `- ${item.quantidade} × ${item.descricao}`)
  return ['No seu carrinho:', ...linhas, `Total: ${emReais(d.subtotalCentavos)}`].join('\n')
}

export function linkDeRetorno(d: Pick<DadosDoLembrete, 'urlDaLoja' | 'tokenDeRecuperacao'>): string {
  return `${d.urlDaLoja.replace(/\/$/, '')}/retomar/${d.tokenDeRecuperacao}/`
}

function linkDeDispensa(d: DadosDoLembrete): string {
  return `${d.urlDaLoja.replace(/\/$/, '')}/nao-quero-lembrete/${d.tokenDeRecuperacao}/`
}

function whatsappUrl(d: DadosDoLembrete, texto: string): string {
  return `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(texto)}`
}

function rodape(d: DadosDoLembrete): string {
  return [
    '—',
    `Qualquer dúvida, chame no WhatsApp: https://wa.me/${d.whatsapp}`,
    `Não quer mais receber estes lembretes? ${linkDeDispensa(d)}`,
    '',
    'Lumini Aromas — velas artesanais para eventos',
    'Governador Valadares, MG · CNPJ 34.499.353/0001-08',
  ].join('\n')
}

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
