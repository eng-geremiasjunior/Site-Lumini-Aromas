/**
 * Cliente da API do Melhor Envio.
 *
 * Só o servidor fala com o Melhor Envio. Se a cotação saísse do navegador,
 * o token da conta ficaria exposto e qualquer pessoa poderia comprar
 * etiqueta com o saldo da carteira.
 *
 * Não existe biblioteca oficial em JavaScript mantida, então o cliente é
 * escrito aqui, com os campos que a documentação exige.
 */

import type { MelhorEnvioVolume } from './packaging.ts'
import type { MelhorEnvioService } from './quote.ts'

export type MelhorEnvioConfig = {
  token: string
  baseUrl: string
  /** Obrigatório pela API: nome do aplicativo e e-mail de contato. */
  userAgent: string
  /** CEP de onde as encomendas saem. */
  cepOrigem: string
}

export type CotacaoErro =
  | { motivo: 'nao_configurado'; mensagem: string }
  | { motivo: 'cep_invalido'; mensagem: string }
  | { motivo: 'sem_volumes'; mensagem: string }
  | { motivo: 'falha_na_api'; mensagem: string; detalhe?: string }

export type CotacaoResultado =
  | { ok: true; servicos: MelhorEnvioService[] }
  | ({ ok: false } & CotacaoErro)

/**
 * Lê a configuração do ambiente.
 *
 * Devolve nulo quando as chaves ainda não foram cadastradas, para a loja
 * seguir funcionando e apenas oferecer combinar o frete pelo WhatsApp.
 */
export function getMelhorEnvioConfig(): MelhorEnvioConfig | null {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim()
  const cepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM?.replace(/\D/g, '')

  if (!token || !cepOrigem) return null

  const ambiente = process.env.MELHOR_ENVIO_ENV === 'production' ? 'production' : 'sandbox'

  return {
    token,
    baseUrl:
      ambiente === 'production'
        ? 'https://melhorenvio.com.br'
        : 'https://sandbox.melhorenvio.com.br',
    userAgent:
      process.env.MELHOR_ENVIO_USER_AGENT ?? 'Lumini Aromas (atendimento@luminiaromas.com.br)',
    cepOrigem,
  }
}

/** Deixa só os números e confere se parece um CEP brasileiro. */
export function normalizarCep(cep: string): string | null {
  const digitos = cep.replace(/\D/g, '')
  return digitos.length === 8 ? digitos : null
}

/**
 * Pede as opções de frete.
 *
 * A cotação vai por `volumes[]`, com a caixa já montada, e não por peça.
 * Há relato na comunidade oficial de que a cotação falha quando um item
 * passa de 100 unidades, e os lotes daqui chegam a 200.
 */
export async function cotarFrete(input: {
  cepDestino: string
  volumes: MelhorEnvioVolume[]
  /** Valor declarado total, em centavos. */
  valorTotalCents: number
}): Promise<CotacaoResultado> {
  const config = getMelhorEnvioConfig()
  if (!config) {
    return {
      ok: false,
      motivo: 'nao_configurado',
      mensagem: 'O cálculo de frete ainda não foi ativado.',
    }
  }

  const cepDestino = normalizarCep(input.cepDestino)
  if (!cepDestino) {
    return { ok: false, motivo: 'cep_invalido', mensagem: 'Informe um CEP válido, com 8 números.' }
  }

  if (input.volumes.length === 0) {
    return {
      ok: false,
      motivo: 'sem_volumes',
      mensagem:
        'Este produto ainda não tem peso e medidas da embalagem cadastrados, então não dá para calcular o frete.',
    }
  }

  try {
    const resposta = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        // A API recusa a chamada sem este cabeçalho.
        'User-Agent': config.userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: config.cepOrigem },
        to: { postal_code: cepDestino },
        volumes: input.volumes,
        options: { receipt: false, own_hand: false, insurance_value: input.valorTotalCents / 100 },
      }),
      // Cotação lenta não pode travar a página do carrinho.
      signal: AbortSignal.timeout(12_000),
    })

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '')
      return {
        ok: false,
        motivo: 'falha_na_api',
        mensagem: 'Não conseguimos calcular o frete agora.',
        detalhe: `HTTP ${resposta.status} ${corpo.slice(0, 200)}`,
      }
    }

    const dados = (await resposta.json()) as MelhorEnvioService[]
    if (!Array.isArray(dados)) {
      return {
        ok: false,
        motivo: 'falha_na_api',
        mensagem: 'Não conseguimos calcular o frete agora.',
        detalhe: 'resposta fora do formato esperado',
      }
    }

    return { ok: true, servicos: dados }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    return {
      ok: false,
      motivo: 'falha_na_api',
      mensagem: 'Não conseguimos calcular o frete agora.',
      detalhe: mensagem,
    }
  }
}
