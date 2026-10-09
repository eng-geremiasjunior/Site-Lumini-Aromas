/**
 * Os textos legais que a loja já nasce tendo.
 *
 * O Decreto 7.962/2013 e o Google Merchant exigem política de devolução,
 * privacidade e identificação da empresa publicadas. Uma loja que abre com
 * essas páginas vazias é uma loja irregular, então o texto vem escrito.
 *
 * Mas ele vive aqui como **dado**, não como tela: a mesma estrutura é lida
 * pelas páginas (enquanto o painel está vazio) e convertida para o editor
 * do painel pelo script `scripts/textos-legais.mjs`. Assim o dono edita no
 * painel sem mexer em código, e o código não guarda duas versões do mesmo
 * texto para divergirem.
 *
 * Um advogado precisa revisar antes da virada. O que está aqui é
 * conservador de propósito — em especial o arrependimento de 7 dias, que o
 * TJSP manteve em 2025 mesmo para produto feito sob encomenda.
 */

export type Bloco =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: string[] }

export type TextoLegal = {
  campo: 'returnPolicy' | 'termsOfUse' | 'privacyPolicy'
  titulo: string
  resumo: string
  blocos: Bloco[]
}

export const TROCAS: TextoLegal = {
  campo: 'returnPolicy',
  titulo: 'Trocas, devoluções e arrependimento',
  resumo:
    'Você tem 7 dias corridos após receber para desistir da compra, mesmo que as peças tenham sido personalizadas com o seu nome ou com a sua arte.',
  blocos: [
    { tipo: 'titulo', texto: 'Desistir da compra em até 7 dias' },
    {
      tipo: 'paragrafo',
      texto:
        'O artigo 49 do Código de Defesa do Consumidor dá a quem compra fora da loja física o direito de desistir em até 7 dias corridos contados do recebimento, sem precisar justificar. A Lumini Aromas honra esse prazo também nas peças personalizadas.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Para exercer o direito, basta avisar pelo mesmo canal em que a compra foi feita: responder o e-mail do pedido, escrever para o endereço eletrônico desta página ou mandar mensagem no WhatsApp. Não é preciso dar explicação.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Devolvemos o valor integral, incluindo o frete que você pagou na compra, pelo mesmo meio de pagamento. O estorno é solicitado assim que recebemos o aviso; o prazo de aparecer no seu extrato depende da operadora do cartão ou do banco. O frete da devolução é por nossa conta e combinamos a postagem com você.',
    },

    { tipo: 'titulo', texto: 'Cancelar antes da produção começar' },
    {
      tipo: 'paragrafo',
      texto:
        'Tudo é feito à mão, sob encomenda. Antes de produzir, enviamos a arte do rótulo para você aprovar. Até essa aprovação, o cancelamento é livre e o estorno é integral, sem qualquer custo.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Depois da aprovação da arte a produção começa, e o cancelamento passa a valer como o arrependimento descrito acima: você continua podendo desistir em até 7 dias após receber as peças.',
    },

    { tipo: 'titulo', texto: 'Peça com defeito ou diferente da arte aprovada' },
    {
      tipo: 'paragrafo',
      texto:
        'Se alguma peça chegar quebrada, com defeito ou diferente da arte que você aprovou, nos avise em até 90 dias com fotos. Refazemos a peça ou devolvemos o valor correspondente, à sua escolha, sem custo de frete para você. É o que determinam os artigos 18 e 26 do Código de Defesa do Consumidor.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Vela é produto artesanal: pequenas variações de tom, de textura da cera e de intensidade do aroma entre peças do mesmo lote são próprias do processo e não são defeito.',
    },

    { tipo: 'titulo', texto: 'Como devolver' },
    {
      tipo: 'lista',
      itens: [
        'Avise pelo WhatsApp ou pelo e-mail desta página, informando o número do pedido.',
        'Mantenha as peças na embalagem em que chegaram, com os acessórios e o material de proteção.',
        'Enviamos o código de postagem e você leva o volume à agência indicada.',
        'Ao recebermos o volume, o estorno é solicitado no mesmo dia útil.',
      ],
    },
  ],
}

export const TERMOS: TextoLegal = {
  campo: 'termsOfUse',
  titulo: 'Termos de uso e condições de venda',
  resumo:
    'As regras da compra: pedido mínimo, como o preço do lote é formado, prazos de produção e entrega, pagamento e personalização.',
  blocos: [
    { tipo: 'titulo', texto: 'Quem vende' },
    {
      tipo: 'paragrafo',
      texto:
        'Esta loja é operada pela empresa identificada no fim desta página, responsável pela venda, pela produção e pela entrega. Os dados de contato valem para qualquer assunto, inclusive reclamação e exercício de direitos.',
    },

    { tipo: 'titulo', texto: 'Pedido mínimo e lote fechado' },
    {
      tipo: 'paragrafo',
      texto:
        'As peças são vendidas por lote, para eventos. Cada produto tem uma quantidade mínima informada na própria página, e o lote é de um único aroma — para dois aromas, são dois lotes.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'O preço mostrado é o do lote inteiro e vem sempre da multiplicação da quantidade escolhida pelo preço por peça daquele produto. O valor por peça também é exibido, para você comparar. O total é recalculado pelo sistema no momento do pagamento; se houver divergência com o que a tela mostrou, vale o menor valor.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Para quantidades acima da faixa máxima da página, o atendimento faz um orçamento pelo WhatsApp.',
    },

    { tipo: 'titulo', texto: 'Personalização e aprovação da arte' },
    {
      tipo: 'paragrafo',
      texto:
        'O texto e a imagem que você digita ou envia são impressos exatamente como foram recebidos. Confira acentuação, nomes e datas: enviamos a arte para sua aprovação antes de produzir, e é essa aprovação que autoriza a produção.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Ao enviar logotipo, foto ou qualquer arte, você declara ter o direito de usá-la. Não produzimos peças com marca, personagem ou imagem de terceiros sem autorização, nem com conteúdo ilegal ou ofensivo.',
    },

    { tipo: 'titulo', texto: 'Prazos' },
    {
      tipo: 'paragrafo',
      texto:
        'O prazo total tem duas partes: a produção artesanal, contada em dias úteis a partir da aprovação da arte e informada na página do produto, e o transporte, estimado pela transportadora escolhida no checkout. A data prevista de chegada aparece antes do pagamento.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Em meses de pico de eventos o prazo de produção aumenta, e o aviso fica visível na loja. Se você tem data de evento marcada, informe no pedido: conferimos a viabilidade antes de confirmar.',
    },

    { tipo: 'titulo', texto: 'Pagamento' },
    {
      tipo: 'paragrafo',
      texto:
        'Os pagamentos são processados pelo Mercado Pago, por Pix ou cartão de crédito. A loja não recebe nem guarda o número do seu cartão. O número de parcelas sem juros está indicado no checkout; acima dele, os juros são do cartão e aparecem antes da confirmação.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Pedido com Pix aguardando pagamento é cancelado quando o código expira, e nada é produzido antes da confirmação do pagamento.',
    },
    {
      tipo: 'paragrafo',
      texto: 'CPF ou CNPJ é pedido no checkout porque é exigido para emitir a nota fiscal do envio.',
    },

    { tipo: 'titulo', texto: 'Entrega' },
    {
      tipo: 'paragrafo',
      texto:
        'O lote segue em um ou mais volumes, com nota fiscal e código de rastreio enviado por e-mail. Confira o volume na entrega; se chegar amassado ou violado, registre com fotos e nos avise no mesmo dia.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Mantenha o endereço e o telefone corretos no pedido. Volume devolvido por endereço errado ou por ausência de alguém para receber é reenviado com novo frete.',
    },

    { tipo: 'titulo', texto: 'Desistência, troca e devolução' },
    {
      tipo: 'paragrafo',
      texto:
        'Valem as regras da página de trocas, devoluções e arrependimento, que faz parte destes termos.',
    },

    { tipo: 'titulo', texto: 'Fotos e textos da loja' },
    {
      tipo: 'paragrafo',
      texto:
        'As fotos, os textos e as artes desta loja são nossos e não podem ser copiados para uso comercial sem autorização por escrito.',
    },

    { tipo: 'titulo', texto: 'Lei aplicável' },
    {
      tipo: 'paragrafo',
      texto:
        'Aplicam-se o Código de Defesa do Consumidor, o Decreto 7.962/2013 e a Lei Geral de Proteção de Dados. Nenhuma cláusula destes termos reduz direito que a lei garante a você.',
    },
  ],
}

export const PRIVACIDADE: TextoLegal = {
  campo: 'privacyPolicy',
  titulo: 'Política de privacidade e cookies',
  resumo:
    'Quais dados a loja coleta, por que, com quem compartilha, por quanto tempo guarda e como você pede para apagar.',
  blocos: [
    { tipo: 'titulo', texto: 'O que coletamos' },
    {
      tipo: 'lista',
      itens: [
        'Para o pedido: nome, e-mail, telefone, CPF ou CNPJ, endereço de entrega e de cobrança.',
        'Para a personalização: o texto e os arquivos que você envia, como o logotipo do evento.',
        'Para o evento: tipo e data, quando você informa.',
        'Do pagamento: o resultado da transação e os quatro últimos dígitos do cartão, informados pelo Mercado Pago. O número completo e o código de segurança nunca passam pela loja.',
        'Da navegação: páginas visitadas, endereço IP, navegador e identificadores de anúncios, quando você aceita os cookies de marketing.',
      ],
    },

    { tipo: 'titulo', texto: 'Por que coletamos' },
    {
      tipo: 'lista',
      itens: [
        'Para executar o contrato: processar o pedido, produzir, cobrar, enviar e dar suporte. Sem esses dados não há como vender.',
        'Para cumprir obrigação legal: emitir nota fiscal, guardar registro fiscal e manter registro de acesso, como manda o Marco Civil da Internet.',
        'Com o seu consentimento: cookies de marketing, medição de anúncios e envio de ofertas. Você pode recusar sem perder nada da loja, e mudar de ideia depois.',
        'Por legítimo interesse: lembrar um carrinho deixado pela metade e prevenir fraude. Você pode pedir para parar.',
      ],
    },

    { tipo: 'titulo', texto: 'Com quem compartilhamos' },
    {
      tipo: 'paragrafo',
      texto: 'Só com quem é necessário para a compra acontecer, e apenas o dado necessário:',
    },
    {
      tipo: 'lista',
      itens: [
        'Mercado Pago, para processar o pagamento e prevenir fraude.',
        'Melhor Envio e as transportadoras escolhidas, para calcular o frete, emitir a etiqueta e entregar.',
        'Provedor de nota fiscal e nosso contador, para a obrigação fiscal.',
        'Serviço de envio de e-mail, para as mensagens do pedido.',
        'Meta e Google, para medir o resultado dos anúncios, quando você aceita os cookies de marketing. Esse compartilhamento envolve transferência internacional de dados.',
        'Hospedagem, banco de dados e armazenamento de arquivos, que guardam a loja. Os servidores com os dados do pedido ficam no Brasil.',
      ],
    },
    {
      tipo: 'paragrafo',
      texto: 'Não vendemos seus dados e não os cedemos para quem queira anunciar para você.',
    },

    { tipo: 'titulo', texto: 'Cookies' },
    {
      tipo: 'paragrafo',
      texto:
        'Os cookies essenciais fazem o carrinho e o login funcionarem, e por isso não dependem de aceite. Os de medição e de marketing só são ligados depois que você aceita no aviso que aparece na primeira visita. A escolha fica registrada com data e hora, e você pode trocá-la pelo mesmo aviso.',
    },

    { tipo: 'titulo', texto: 'Por quanto tempo guardamos' },
    {
      tipo: 'lista',
      itens: [
        'Dados do pedido e fiscais: 5 anos, por obrigação legal.',
        'Registros de acesso: 6 meses, como determina o Marco Civil.',
        'Arquivos de personalização: 2 anos após a entrega, para refazer uma peça ou repetir um pedido.',
        'Dados usados em marketing: até você revogar o consentimento.',
      ],
    },

    { tipo: 'titulo', texto: 'Seus direitos' },
    {
      tipo: 'paragrafo',
      texto:
        'A Lei Geral de Proteção de Dados garante que você pode pedir confirmação de que tratamos seus dados, acesso a eles, correção do que estiver errado, cópia em arquivo, anonimização ou exclusão do que não somos obrigados a guardar, informação sobre com quem compartilhamos e revogação do consentimento.',
    },
    {
      tipo: 'paragrafo',
      texto:
        'Para exercer qualquer um deles, escreva para o e-mail desta página. Respondemos em até 15 dias. Se a lei nos obrigar a manter algum dado, dizemos qual e por quê.',
    },

    { tipo: 'titulo', texto: 'Segurança e incidentes' },
    {
      tipo: 'paragrafo',
      texto:
        'A loja usa conexão criptografada, acesso ao painel restrito e com segundo fator, senhas guardadas de forma irreversível e cópias de segurança cifradas. Se acontecer um incidente com risco para você, avisamos você e a Autoridade Nacional de Proteção de Dados nos prazos da lei.',
    },

    { tipo: 'titulo', texto: 'Menores de idade' },
    {
      tipo: 'paragrafo',
      texto:
        'A loja é destinada a maiores de 18 anos. Não coletamos dados de crianças e adolescentes de propósito; se isso acontecer por engano, apagamos ao sermos avisados.',
    },

    { tipo: 'titulo', texto: 'Mudanças nesta política' },
    {
      tipo: 'paragrafo',
      texto:
        'Quando mudarmos esta política, a versão sobe e passa a aparecer no fim da página. A versão que valia no seu pedido fica guardada junto dele.',
    },
  ],
}

export const TEXTOS_LEGAIS: readonly TextoLegal[] = [TROCAS, TERMOS, PRIVACIDADE]

/**
 * Converte os blocos para o formato do editor do painel (Lexical).
 *
 * É verboso porque o Lexical guarda estado de formatação em cada nó. A
 * alternativa seria pedir ao dono que digitasse as três páginas no painel
 * antes de abrir a loja — e loja sem política de devolução publicada é
 * catálogo reprovado no Google Merchant.
 */
export function paraLexical(blocos: Bloco[]): Record<string, unknown> {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: blocos.map(no),
    },
  }
}

function texto(valor: string): Record<string, unknown> {
  return {
    type: 'text',
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: valor,
    version: 1,
  }
}

function no(bloco: Bloco): Record<string, unknown> {
  if (bloco.tipo === 'titulo') {
    return {
      type: 'heading',
      tag: 'h2',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [texto(bloco.texto)],
    }
  }

  if (bloco.tipo === 'lista') {
    return {
      type: 'list',
      listType: 'bullet',
      tag: 'ul',
      start: 1,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: bloco.itens.map((item, i) => ({
        type: 'listitem',
        value: i + 1,
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [texto(item)],
      })),
    }
  }

  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
    children: [texto(bloco.texto)],
  }
}
