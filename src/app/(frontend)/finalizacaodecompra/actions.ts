'use server'

import { saveCartContact } from '../../../commerce/cart/cart-service.ts'
import { criarPedido, type DadosDoPedido, type ResultadoPedido } from '../../../commerce/orders/create-order.ts'
import { cotarFreteDoCarrinho, type FreteResultado } from '../../../commerce/shipping/quote-cart.ts'

export type EnderecoPorCep =
  | { ok: true; rua: string; bairro: string; cidade: string; estado: string }
  | { ok: false; mensagem: string }

/**
 * Busca o endereço pelo CEP.
 *
 * Usa o ViaCEP, que é gratuito e não exige cadastro. Poupa o cliente de
 * digitar rua, bairro e cidade, o que reduz erro de entrega e abandono.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep> {
  const digitos = cep.replace(/\D/g, '')
  if (digitos.length !== 8) return { ok: false, mensagem: 'CEP precisa ter 8 números.' }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resposta.ok) return { ok: false, mensagem: 'Não conseguimos consultar o CEP agora.' }

    const dados = (await resposta.json()) as {
      erro?: boolean | string
      logradouro?: string
      bairro?: string
      localidade?: string
      uf?: string
    }

    if (dados.erro) return { ok: false, mensagem: 'CEP não encontrado.' }

    return {
      ok: true,
      rua: dados.logradouro ?? '',
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      estado: dados.uf ?? '',
    }
  } catch {
    return { ok: false, mensagem: 'Não conseguimos consultar o CEP agora. Preencha à mão.' }
  }
}

/** Cota o frete para o endereço informado no checkout. */
export async function calcularFreteCheckout(cep: string): Promise<FreteResultado> {
  return cotarFreteDoCarrinho(cep)
}

/**
 * Guarda o contato assim que o cliente digita.
 *
 * É o que permite recuperar o carrinho depois: sem o e-mail, um checkout
 * abandonado vira um visitante anônimo e a venda se perde sem rastro.
 */
export async function salvarContato(email: string, telefone?: string): Promise<void> {
  if (!email.includes('@')) return
  await saveCartContact(email, telefone)
}

export async function finalizarPedido(dados: DadosDoPedido): Promise<ResultadoPedido> {
  return criarPedido(dados)
}
