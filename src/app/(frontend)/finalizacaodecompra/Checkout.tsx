'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { FreteResultado } from '../../../commerce/shipping/quote-cart.ts'
import { FRETE_A_COMBINAR_ID } from '../../../commerce/shipping/quote.ts'
import { LIMITE_DA_MENSAGEM } from '../../../commerce/orders/presente.ts'
import {
  buscarEnderecoPorCep,
  calcularFreteCheckout,
  finalizarPedido,
  salvarContato,
} from './actions.ts'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

type Props = {
  subtotal: number
  quantidadeDePecas: number
  /** Cupom já conferido no servidor; o navegador nunca calcula desconto. */
  cupom: { codigo: string; desconto: number; freteGratis: boolean } | null
}

export function Checkout({ subtotal, quantidadeDePecas, cupom }: Props) {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF')
  const [documento, setDocumento] = useState('')

  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const [tipoEvento, setTipoEvento] = useState('')
  const [dataEvento, setDataEvento] = useState('')
  const [observacao, setObservacao] = useState('')

  const [ehPresente, setEhPresente] = useState(false)
  const [presenteDe, setPresenteDe] = useState('')
  const [presentePara, setPresentePara] = useState('')
  const [presenteMensagem, setPresenteMensagem] = useState('')

  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [optInWhatsapp, setOptInWhatsapp] = useState(false)
  const [optInMarketing, setOptInMarketing] = useState(false)

  const [frete, setFrete] = useState<FreteResultado | null>(null)
  const [freteEscolhido, setFreteEscolhido] = useState<number | null>(null)
  const [erro, setErro] = useState<{ mensagem: string; campo?: string } | null>(null)

  const [buscandoCep, buscarCep] = useTransition()
  const [cotando, cotar] = useTransition()
  const [finalizando, finalizar] = useTransition()

  const opcaoFrete =
    frete?.ok && freteEscolhido !== null
      ? frete.opcoes.find((opcao) => opcao.serviceId === freteEscolhido)
      : null

  const freteCobrado = cupom?.freteGratis ? 0 : (opcaoFrete?.priceCents ?? 0)
  const desconto = cupom?.desconto ?? 0
  const total = Math.max(0, subtotal - desconto + freteCobrado)

  function aoSairDoCep() {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) return

    buscarCep(async () => {
      const endereco = await buscarEnderecoPorCep(digitos)
      if (endereco.ok) {
        if (endereco.rua) setRua(endereco.rua)
        if (endereco.bairro) setBairro(endereco.bairro)
        setCidade(endereco.cidade)
        setEstado(endereco.estado)
      }
    })

    cotar(async () => {
      const resposta = await calcularFreteCheckout(digitos)
      setFrete(resposta)
      if (resposta.ok && resposta.opcoes[0]) setFreteEscolhido(resposta.opcoes[0].serviceId)
    })
  }

  function enviar() {
    setErro(null)
    finalizar(async () => {
      const resposta = await finalizarPedido({
        cliente: { nome, email, telefone, tipoPessoa, documento },
        endereco: { cep, rua, numero, complemento, bairro, cidade, estado },
        servicoFreteId: freteEscolhido,
        tipoEvento: tipoEvento || undefined,
        dataEvento: dataEvento || undefined,
        observacao: observacao || undefined,
        aceitouTermos,
        optInWhatsapp,
        optInMarketing,
        presente: ehPresente
          ? { de: presenteDe || nome, para: presentePara, mensagem: presenteMensagem }
          : null,
      })

      if (resposta.ok) {
        router.push(`/pedido-recebido/?numero=${resposta.numero}`)
      } else {
        setErro({ mensagem: resposta.mensagem, campo: resposta.campo })
      }
    })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
        gap: '2.5rem',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* ------------------------------------------------------- contato */}
        <section>
          <h2 style={estiloSecao}>1. Seus dados</h2>

          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <Campo rotulo="Nome completo" obrigatorio>
              <input style={estiloCampo} value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>

            <Campo rotulo="E-mail" obrigatorio dica="Enviamos a confirmação e o rastreio para cá.">
              <input
                type="email"
                style={estiloCampo}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => void salvarContato(email, telefone, nome)}
              />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <Campo rotulo="WhatsApp" obrigatorio>
                <input
                  style={estiloCampo}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(33) 99999-9999"
                />
              </Campo>

              <Campo rotulo="Tipo de pessoa">
                <select
                  style={estiloCampo}
                  value={tipoPessoa}
                  onChange={(e) => setTipoPessoa(e.target.value as 'PF' | 'PJ')}
                >
                  <option value="PF">Pessoa física</option>
                  <option value="PJ">Pessoa jurídica</option>
                </select>
              </Campo>
            </div>

            <Campo
              rotulo={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
              obrigatorio
              dica="Necessário para emitir a nota fiscal."
            >
              <input
                style={estiloCampo}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </Campo>
          </div>
        </section>

        {/* ------------------------------------------------------- entrega */}
        <section>
          <h2 style={estiloSecao}>2. Entrega</h2>

          {/* O presente entra antes do endereço de propósito: marcado aqui,
              o endereço abaixo passa a ser o de quem recebe, e a pergunta
              muda de sentido antes de ela começar a digitar. */}
          <label
            style={{
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start',
              padding: '0.9rem 1rem',
              border: '1px solid var(--lumini-line)',
              borderRadius: 8,
              background: ehPresente ? '#fff' : 'transparent',
              marginBottom: '1rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={ehPresente}
              onChange={(e) => setEhPresente(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              É um presente para outra pessoa
              <span style={{ ...estiloDica, display: 'block' }}>
                Vai um cartão escrito por você dentro da caixa, e nenhum preço aparece no pacote.
              </span>
            </span>
          </label>

          {ehPresente && (
            <div
              style={{
                display: 'grid',
                gap: '0.8rem',
                padding: '1rem',
                border: '1px solid var(--lumini-line)',
                borderRadius: 8,
                background: '#fff',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <Campo rotulo="De parte de" dica="Deixe vazio para um presente anônimo.">
                  <input
                    style={estiloCampo}
                    value={presenteDe}
                    onChange={(e) => setPresenteDe(e.target.value)}
                    placeholder={nome}
                  />
                </Campo>
                <Campo rotulo="Para" obrigatorio>
                  <input
                    style={estiloCampo}
                    value={presentePara}
                    onChange={(e) => setPresentePara(e.target.value)}
                  />
                </Campo>
              </div>

              <Campo
                rotulo="Escreva algo especial"
                dica={`Sai impresso exatamente como você escrever. ${presenteMensagem.length}/${LIMITE_DA_MENSAGEM}`}
              >
                <textarea
                  rows={3}
                  maxLength={LIMITE_DA_MENSAGEM}
                  style={{ ...estiloCampo, fontFamily: 'inherit', resize: 'vertical' }}
                  value={presenteMensagem}
                  onChange={(e) => setPresenteMensagem(e.target.value)}
                />
              </Campo>

              <p style={{ ...estiloDica, margin: 0 }}>
                O endereço abaixo é o de quem vai receber o presente.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <Campo rotulo="CEP" obrigatorio dica="Preenchemos o endereço e calculamos o frete.">
              <input
                style={{ ...estiloCampo, maxWidth: '12rem' }}
                value={cep}
                maxLength={9}
                inputMode="numeric"
                onChange={(e) => setCep(e.target.value)}
                onBlur={aoSairDoCep}
              />
              {buscandoCep && <span style={estiloDica}> buscando...</span>}
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.8rem' }}>
              <Campo rotulo="Rua" obrigatorio>
                <input style={estiloCampo} value={rua} onChange={(e) => setRua(e.target.value)} />
              </Campo>
              <Campo rotulo="Número" obrigatorio>
                <input style={estiloCampo} value={numero} onChange={(e) => setNumero(e.target.value)} />
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <Campo rotulo="Complemento">
                <input
                  style={estiloCampo}
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </Campo>
              <Campo rotulo="Bairro" obrigatorio>
                <input style={estiloCampo} value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.8rem' }}>
              <Campo rotulo="Cidade" obrigatorio>
                <input style={estiloCampo} value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </Campo>
              <Campo rotulo="UF" obrigatorio>
                <input
                  style={estiloCampo}
                  value={estado}
                  maxLength={2}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                />
              </Campo>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- frete */}
        <section>
          <h2 style={estiloSecao}>3. Forma de envio</h2>

          {cotando && <p style={estiloDica}>Calculando as opções de entrega...</p>}

          {!cotando && !frete && (
            <p style={estiloDica}>Informe o CEP acima para ver as opções de entrega.</p>
          )}

          {frete && !frete.ok && (
            <div>
              <p style={{ color: '#8a2a2a', fontSize: '0.92rem', margin: 0 }}>{frete.mensagem}</p>
              {frete.alternativa && (
                <a
                  href={frete.alternativa.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.92rem', color: 'var(--lumini-gold)' }}
                >
                  {frete.alternativa.label}
                </a>
              )}
            </div>
          )}

          {frete?.ok && frete.aviso && (
            <p style={{ ...estiloDica, marginBottom: '0.7rem' }}>{frete.aviso}</p>
          )}

          {frete?.ok && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {frete.opcoes.map((opcao) => (
                <label
                  key={opcao.serviceId}
                  style={{
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'flex-start',
                    padding: '0.7rem 0.8rem',
                    border: `1px solid ${
                      freteEscolhido === opcao.serviceId ? 'var(--lumini-gold)' : 'var(--lumini-line)'
                    }`,
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="frete"
                    checked={freteEscolhido === opcao.serviceId}
                    onChange={() => setFreteEscolhido(opcao.serviceId)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>
                      {opcao.carrier} {opcao.serviceName}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.88rem', color: 'var(--lumini-ink-soft)' }}>
                      {opcao.totalMinDays} a {opcao.totalMaxDays} dias úteis, chega até{' '}
                      {formatarData(opcao.deliveryBy)}
                    </span>
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {opcao.serviceId === FRETE_A_COMBINAR_ID
                  ? 'A combinar'
                  : opcao.priceCents === 0
                    ? 'Grátis'
                    : brl(opcao.priceCents)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* -------------------------------------------------------- evento */}
        <section>
          <h2 style={estiloSecao}>4. Sobre o evento</h2>
          <p style={estiloDica}>
            Nos ajuda a organizar a produção para as peças chegarem a tempo.
          </p>

          <div style={{ display: 'grid', gap: '0.8rem', marginTop: '0.8rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <Campo rotulo="Tipo de evento">
                <select
                  style={estiloCampo}
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option>Casamento</option>
                  <option>Bodas</option>
                  <option>15 anos</option>
                  <option>Batizado</option>
                  <option>Maternidade</option>
                  <option>Aniversário</option>
                  <option>Corporativo</option>
                  <option>Outro</option>
                </select>
              </Campo>

              <Campo rotulo="Data do evento">
                <input
                  type="date"
                  style={estiloCampo}
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                />
              </Campo>
            </div>

            <Campo rotulo="Observações">
              <textarea
                rows={3}
                style={estiloCampo}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Algo que precisamos saber sobre o seu pedido"
              />
            </Campo>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------- resumo */}
      <aside
        style={{
          background: '#fff',
          border: '1px solid var(--lumini-line)',
          borderRadius: 10,
          padding: '1.4rem',
          position: 'sticky',
          top: '1.5rem',
        }}
      >
        <h2 style={{ ...estiloSecao, marginTop: 0 }}>Resumo</h2>

        <dl style={{ display: 'grid', gap: '0.45rem', margin: 0 }}>
          <Linha rotulo={`Produtos (${quantidadeDePecas} peças)`} valor={brl(subtotal)} />
          {cupom && desconto > 0 && (
            <Linha rotulo={`Cupom ${cupom.codigo}`} valor={`− ${brl(desconto)}`} />
          )}
          <Linha
            rotulo="Frete"
            valor={
              !opcaoFrete
                ? '—'
                : cupom?.freteGratis
                  ? 'Grátis com o cupom'
                  : opcaoFrete.serviceId === FRETE_A_COMBINAR_ID
                    ? 'A combinar'
                    : opcaoFrete.priceCents === 0
                      ? 'Grátis'
                      : brl(opcaoFrete.priceCents)
            }
          />
        </dl>

        <div
          style={{
            marginTop: '0.9rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid var(--lumini-line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span>Total</span>
          <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--lumini-font-display)' }}>
            {brl(total)}
          </strong>
        </div>

        {opcaoFrete && (
          <p style={{ ...estiloDica, marginTop: '0.5rem' }}>
            Previsão de chegada em {formatarData(opcaoFrete.deliveryBy)}, já contando a produção
            artesanal.
          </p>
        )}

        <div style={{ marginTop: '1.2rem', display: 'grid', gap: '0.6rem', fontSize: '0.9rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              Li e aceito os <a href="/termos/">Termos de uso</a>, a{' '}
              <a href="/politica-de-privacidade/">Política de privacidade</a> e a{' '}
              <a href="/trocas-e-devolucoes/">Política de trocas</a>.
            </span>
          </label>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={optInWhatsapp}
              onChange={(e) => setOptInWhatsapp(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>Quero receber as atualizações do meu pedido pelo WhatsApp.</span>
          </label>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={optInMarketing}
              onChange={(e) => setOptInMarketing(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>Quero receber novidades e lançamentos da Lumini Aromas.</span>
          </label>
        </div>

        {erro && (
          <p
            role="alert"
            style={{
              marginTop: '1rem',
              padding: '0.7rem 0.9rem',
              borderRadius: 8,
              background: '#fdeeee',
              color: '#8a2a2a',
              fontSize: '0.92rem',
            }}
          >
            {erro.mensagem}
          </p>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={finalizando || !opcaoFrete}
          style={{
            marginTop: '1.2rem',
            width: '100%',
            padding: '0.95rem 1.2rem',
            border: 'none',
            borderRadius: 8,
            background: opcaoFrete ? 'var(--lumini-ink)' : 'var(--lumini-line)',
            color: '#fff',
            fontSize: '1rem',
            cursor: opcaoFrete ? 'pointer' : 'not-allowed',
          }}
        >
          {finalizando ? 'Finalizando...' : 'Finalizar pedido'}
        </button>

        <p style={{ ...estiloDica, marginTop: '0.7rem', textAlign: 'center' }}>
          O pagamento entra na próxima etapa.
        </p>
      </aside>
    </div>
  )
}

function Campo({
  rotulo,
  obrigatorio,
  dica,
  children,
}: {
  rotulo: string
  obrigatorio?: boolean
  dica?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        {rotulo}
        {obrigatorio && <span style={{ color: '#a33' }}> *</span>}
      </label>
      {children}
      {dica && <p style={{ ...estiloDica, marginTop: '0.2rem' }}>{dica}</p>}
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <dt style={{ color: 'var(--lumini-ink-soft)' }}>{rotulo}</dt>
      <dd style={{ margin: 0 }}>{valor}</dd>
    </div>
  )
}

const estiloSecao: React.CSSProperties = {
  fontSize: '1.05rem',
  fontFamily: 'var(--lumini-font-body)',
  marginBottom: '0.8rem',
}

const estiloCampo: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid var(--lumini-line)',
  borderRadius: 8,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
}

const estiloDica: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--lumini-ink-soft)',
  margin: 0,
}
