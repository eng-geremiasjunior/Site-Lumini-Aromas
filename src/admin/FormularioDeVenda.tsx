'use client'

import { useMemo, useState, useTransition } from 'react'

import { avisosDaNegociacao, type LotPricingConfig } from '../commerce/pricing/lot-pricing.ts'
import {
  centavosDe,
  formatarReais,
  mascararCep,
  mascararCpfCnpj,
  mascararDinheiro,
  mascararTelefone,
  mascararUf,
} from '../commerce/format/mascaras.ts'
import { guardarComprovante, lancarVenda, lerMensagemColada, type ItemDaVenda } from './acoes.ts'

export type ProdutoParaVenda = {
  slug: string
  nome: string
  /** A tabela de preço do produto, para conferir a venda combinada. */
  config: LotPricingConfig
  aromas: Array<{ chave: string; rotulo: string }>
  faixas: Array<{ qty: number; lotPrice: number; unitPrice: number }>
  camposDePersonalizacao: Array<{ rotulo: string; obrigatorio: boolean; limite: number | null }>
}

type LinhaDoPedido = {
  slug: string
  aroma: string
  qty: number
  personalizacao: Record<string, string>
  /**
   * 'faixa' usa a tabela do site — 20, 30, 40. 'livre' é a venda combinada
   * no WhatsApp, onde 21 e 28 são números normais. Um ou outro, por linha.
   */
  modo: 'faixa' | 'livre'
  /** Preço por peça combinado, em texto com máscara. Só no modo livre. */
  precoPorPeca: string
}

const brl = formatarReais

/** Linha nova já no modo de faixa, que é o caso mais comum. */
function linhaNova(produto?: ProdutoParaVenda): LinhaDoPedido {
  return {
    slug: produto?.slug ?? '',
    aroma: '',
    qty: produto?.faixas[0]?.qty ?? 20,
    personalizacao: {},
    modo: 'faixa',
    precoPorPeca: produto ? mascararDinheiro(String(produto.config.unitPrice)) : '',
  }
}

/** Total de uma linha, no modo em que ela está. */
function totalDaLinha(linha: LinhaDoPedido, produto?: ProdutoParaVenda): number {
  if (linha.modo === 'livre') return centavosDe(linha.precoPorPeca) * linha.qty
  return produto?.faixas.find((faixa) => faixa.qty === linha.qty)?.lotPrice ?? 0
}

export function FormularioDeVenda({ produtos }: { produtos: ProdutoParaVenda[] }) {
  const [mensagem, setMensagem] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [naoLido, setNaoLido] = useState<string[]>([])

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

  const [linhas, setLinhas] = useState<LinhaDoPedido[]>([
    linhaNova(produtos[0]),
  ])

  const [frete, setFrete] = useState('')
  const [transportadora, setTransportadora] = useState('')
  const [canal, setCanal] = useState<'whatsapp' | 'instagram_dm' | 'admin'>('whatsapp')
  const [formaDePagamento, setFormaDePagamento] = useState<
    'pix' | 'credit_card' | 'debit_card' | 'mp_link' | 'external'
  >('pix')
  const [jaPago, setJaPago] = useState(true)
  const [dataDaVenda, setDataDaVenda] = useState('')
  const [comprovante, setComprovante] = useState<File | null>(null)

  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState<{ numero: string; total: number; url: string } | null>(null)

  const [lendo, ler] = useTransition()
  const [salvando, salvar] = useTransition()

  const aromasConhecidos = useMemo(
    () => [...new Set(produtos.flatMap((produto) => produto.aromas.map((a) => a.rotulo)))],
    [produtos],
  )

  const subtotal = linhas.reduce(
    (soma, linha) => soma + totalDaLinha(linha, produtos.find((p) => p.slug === linha.slug)),
    0,
  )

  const total = subtotal + centavosDe(frete)

  // ------------------------------------------------------------- ler mensagem
  function lerColado() {
    setErro(null)
    ler(async () => {
      const { dados, avisos: encontrados, naoLido: sobrou } = await lerMensagemColada(
        mensagem,
        aromasConhecidos,
      )

      if (dados.nome) setNome(dados.nome)
      if (dados.email) setEmail(dados.email)
      if (dados.telefone) setTelefone(dados.telefone)
      if (dados.tipoPessoa) setTipoPessoa(dados.tipoPessoa)
      if (dados.documento) setDocumento(dados.documento)
      if (dados.cep) setCep(dados.cep)
      if (dados.rua) setRua(dados.rua)
      if (dados.numero) setNumero(dados.numero)
      if (dados.complemento) setComplemento(dados.complemento)
      if (dados.bairro) setBairro(dados.bairro)
      if (dados.cidade) setCidade(dados.cidade)
      if (dados.estado) setEstado(dados.estado)
      if (dados.tipoDoEvento) setTipoEvento(dados.tipoDoEvento)
      if (dados.dataDoEvento) setDataEvento(dados.dataDoEvento)
      if (dados.observacao) setObservacao(dados.observacao)

      setLinhas((atuais) => {
        const primeira = { ...atuais[0] }
        const produto = produtos.find((p) => p.slug === primeira.slug)

        if (dados.aroma && produto) {
          const encontrado = produto.aromas.find((a) => a.rotulo === dados.aroma)
          if (encontrado) primeira.aroma = encontrado.chave
        }

        if (dados.quantidade && produto) {
          primeira.qty = dados.quantidade

          // A cliente pediu 28 peças. Isso não existe na tabela do site, e
          // não é erro dela — é o número de convidados. A linha muda sozinha
          // para o modo combinado, já com o preço da tabela como ponto de
          // partida, e você ajusta se combinou outro.
          const ehFaixa = produto.faixas.some((faixa) => faixa.qty === dados.quantidade)
          primeira.modo = ehFaixa ? 'faixa' : 'livre'

          if (!ehFaixa) {
            const referencia =
              produto.faixas.find((faixa) => faixa.qty >= dados.quantidade!)?.unitPrice ??
              produto.config.unitPrice
            primeira.precoPorPeca = mascararDinheiro(String(referencia))
          }
        }

        if (dados.frase && produto?.camposDePersonalizacao[0]) {
          primeira.personalizacao = {
            ...primeira.personalizacao,
            [produto.camposDePersonalizacao[0].rotulo]: dados.frase,
          }
        }

        return [primeira, ...atuais.slice(1)]
      })

      setAvisos(encontrados)
      setNaoLido(sobrou)
    })
  }

  // ------------------------------------------------------------------- salvar
  function enviar() {
    setErro(null)
    salvar(async () => {
      let comprovanteId: number | null = null

      if (comprovante) {
        const dados = new FormData()
        dados.set('arquivo', comprovante)
        const guardado = await guardarComprovante(dados)
        comprovanteId = guardado?.id ?? null
      }

      const itens: ItemDaVenda[] = linhas.map((linha) => ({
        productSlug: linha.slug,
        variantKey: linha.aroma || null,
        qty: linha.qty,
        personalization: linha.personalizacao,
        precoPorPecaCentavos: linha.modo === 'livre' ? centavosDe(linha.precoPorPeca) : null,
      }))

      const resposta = await lancarVenda({
        cliente: { nome, email, telefone, tipoPessoa, documento },
        endereco: { cep, rua, numero, complemento, bairro, cidade, estado },
        itens,
        freteCentavos: centavosDe(frete),
        transportadora,
        tipoEvento,
        dataEvento,
        observacao,
        canal,
        formaDePagamento,
        jaPago,
        dataDaVenda: dataDaVenda ? new Date(`${dataDaVenda}T12:00:00`).toISOString() : null,
        comprovanteId,
        mensagemOriginal: mensagem.trim() || null,
      })

      if (resposta.ok) {
        setPronto({ numero: resposta.numero, total: resposta.total, url: resposta.urlDoPedido })
      } else {
        setErro(resposta.mensagem)
      }
    })
  }

  if (pronto) {
    return (
      <div style={{ maxWidth: '38rem', padding: '2rem 0' }}>
        <h1 style={{ marginTop: 0 }}>Pedido {pronto.numero} lançado</h1>
        <p style={sutil}>
          {brl(pronto.total)} · {jaPago ? 'marcado como pago' : 'aguardando pagamento'}.
        </p>
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <a href={pronto.url} style={botaoPrimario}>
            Abrir o pedido
          </a>
          <button type="button" onClick={() => window.location.reload()} style={botaoSecundario}>
            Lançar outro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '52rem', padding: '1.5rem 0 5rem' }}>
      <h1 style={{ marginTop: 0, marginBottom: '0.3rem' }}>Novo pedido</h1>
      <p style={{ ...sutil, marginTop: 0 }}>
        Para lançar a venda que fechou no WhatsApp. Cole a mensagem da cliente e confira.
      </p>

      {/* ----------------------------------------------------------- mensagem */}
      <section style={cartao}>
        <label htmlFor="mensagem" style={rotulo}>
          Mensagem da cliente
        </label>
        <textarea
          id="mensagem"
          rows={7}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder={'Cole aqui o bloco de dados que ela mandou.\n\nNome, CPF, endereço, data do evento, quantidade, aroma, a frase do rótulo — o que vier.'}
          style={{ ...campo, fontFamily: 'inherit', resize: 'vertical' }}
        />

        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginTop: '0.7rem' }}>
          <button type="button" onClick={lerColado} disabled={lendo || !mensagem.trim()} style={botaoPrimario}>
            {lendo ? 'Lendo...' : 'Ler mensagem e preencher'}
          </button>
          <span style={sutil}>Você confere tudo antes de salvar.</span>
        </div>

        {avisos.length > 0 && (
          <ul style={{ ...alerta, background: '#fff8e6', borderColor: '#e3c97a' }}>
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        )}

        {naoLido.length > 0 && (
          <div style={{ ...alerta, background: '#f4f2ee', borderColor: 'var(--theme-elevation-150)' }}>
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>
              Isto eu não soube onde colocar:
            </strong>
            {naoLido.map((linha) => (
              <div key={linha} style={sutil}>
                {linha}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ cliente */}
      <Secao titulo="Cliente">
        <Grade>
          <Campo rotuloTexto="Nome" largura="2fr">
            <input style={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="WhatsApp">
            <input style={campo} value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} />
          </Campo>
        </Grade>

        <Grade>
          <Campo rotuloTexto="E-mail" largura="2fr">
            <input style={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="Tipo">
            <select
              style={campo}
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value as 'PF' | 'PJ')}
            >
              <option value="PF">Pessoa física</option>
              <option value="PJ">Pessoa jurídica</option>
            </select>
          </Campo>
          <Campo rotuloTexto={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}>
            <input style={campo} value={documento} onChange={(e) => setDocumento(mascararCpfCnpj(e.target.value))} />
          </Campo>
        </Grade>
      </Secao>

      {/* ------------------------------------------------------------ entrega */}
      <Secao titulo="Entrega">
        <Grade>
          <Campo rotuloTexto="CEP">
            <input style={campo} value={cep} onChange={(e) => setCep(mascararCep(e.target.value))} />
          </Campo>
          <Campo rotuloTexto="Rua" largura="3fr">
            <input style={campo} value={rua} onChange={(e) => setRua(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="Número">
            <input style={campo} value={numero} onChange={(e) => setNumero(e.target.value)} />
          </Campo>
        </Grade>

        <Grade>
          <Campo rotuloTexto="Complemento">
            <input style={campo} value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="Bairro">
            <input style={campo} value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="Cidade">
            <input style={campo} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Campo>
          <Campo rotuloTexto="UF" largura="0.5fr">
            <input style={campo} maxLength={2} value={estado} onChange={(e) => setEstado(mascararUf(e.target.value))} />
          </Campo>
        </Grade>
      </Secao>

      {/* ------------------------------------------------------------- evento */}
      <Secao titulo="Evento">
        <Grade>
          <Campo rotuloTexto="Tipo de evento">
            <select style={campo} value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)}>
              <option value="">Não informado</option>
              {['Casamento', 'Bodas', '15 anos', 'Batizado', 'Maternidade', 'Aniversário', 'Corporativo', 'Outro'].map(
                (opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ),
              )}
            </select>
          </Campo>
          <Campo rotuloTexto="Data do evento">
            <input type="date" style={campo} value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          </Campo>
        </Grade>
      </Secao>

      {/* ------------------------------------------------------------- pedido */}
      <Secao titulo="O que ela comprou">
        {linhas.map((linha, indice) => {
          const produto = produtos.find((p) => p.slug === linha.slug)

          return (
            <div key={indice} style={{ ...cartao, marginTop: indice === 0 ? 0 : '0.8rem' }}>
              <Grade>
                <Campo rotuloTexto="Produto" largura="2fr">
                  <select
                    style={campo}
                    value={linha.slug}
                    onChange={(e) => trocarLinha(setLinhas, indice, { slug: e.target.value, aroma: '' })}
                  >
                    {produtos.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </Campo>

                {produto && produto.aromas.length > 0 && (
                  <Campo rotuloTexto="Aroma">
                    <select
                      style={campo}
                      value={linha.aroma}
                      onChange={(e) => trocarLinha(setLinhas, indice, { aroma: e.target.value })}
                    >
                      <option value="">Escolher</option>
                      {produto.aromas.map((aroma) => (
                        <option key={aroma.chave} value={aroma.chave}>
                          {aroma.rotulo}
                        </option>
                      ))}
                    </select>
                  </Campo>
                )}

                {linha.modo === 'faixa' ? (
                  <Campo rotuloTexto="Quantidade">
                    <select
                      style={campo}
                      value={linha.qty}
                      onChange={(e) => trocarLinha(setLinhas, indice, { qty: Number(e.target.value) })}
                    >
                      {produto?.faixas.map((f) => (
                        <option key={f.qty} value={f.qty}>
                          {f.qty} peças
                        </option>
                      ))}
                    </select>
                  </Campo>
                ) : (
                  <>
                    <Campo rotuloTexto="Preço por peça">
                      <input
                        style={campo}
                        value={linha.precoPorPeca}
                        onChange={(e) =>
                          trocarLinha(setLinhas, indice, {
                            precoPorPeca: mascararDinheiro(e.target.value),
                          })
                        }
                      />
                    </Campo>
                    <Campo rotuloTexto="Quantidade">
                      <input
                        style={campo}
                        inputMode="numeric"
                        value={linha.qty || ''}
                        onChange={(e) =>
                          trocarLinha(setLinhas, indice, {
                            qty: Number(e.target.value.replace(/\D/g, '')) || 0,
                          })
                        }
                      />
                    </Campo>
                  </>
                )}
              </Grade>

              <AlternadorDeModo
                modo={linha.modo}
                aoTrocar={(modo) => {
                  const faixaMaisProxima =
                    produto?.faixas.find((f) => f.qty >= linha.qty)?.qty ??
                    produto?.faixas[0]?.qty ??
                    20
                  trocarLinha(setLinhas, indice, {
                    modo,
                    qty: modo === 'faixa' ? faixaMaisProxima : linha.qty,
                  })
                }}
              />

              {produto?.camposDePersonalizacao.map((personalizacao) => (
                <Campo key={personalizacao.rotulo} rotuloTexto={personalizacao.rotulo}>
                  <input
                    style={campo}
                    maxLength={personalizacao.limite ?? undefined}
                    value={linha.personalizacao[personalizacao.rotulo] ?? ''}
                    onChange={(e) =>
                      trocarLinha(setLinhas, indice, {
                        personalizacao: {
                          ...linha.personalizacao,
                          [personalizacao.rotulo]: e.target.value,
                        },
                      })
                    }
                  />
                </Campo>
              ))}

              {linha.modo === 'livre' && produto && linha.qty > 0 && (
                <Conferencia
                  avisos={avisosDaNegociacao(produto.config, linha.qty, centavosDe(linha.precoPorPeca))}
                />
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '0.7rem',
                }}
              >
                <div>
                  <strong>{brl(totalDaLinha(linha, produto))}</strong>
                  {linha.modo === 'livre' && linha.qty > 0 && (
                    <span style={{ ...sutil, marginLeft: '0.5rem', fontSize: '0.9rem' }}>
                      {linha.qty} × {linha.precoPorPeca || 'R$ 0,00'}
                    </span>
                  )}
                </div>
                {linhas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLinhas((atuais) => atuais.filter((_, i) => i !== indice))}
                    style={{ ...botaoSecundario, padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() =>
            setLinhas((atuais) => [
              ...atuais,
              linhaNova(produtos[0]),
            ])
          }
          style={{ ...botaoSecundario, marginTop: '0.8rem' }}
        >
          Adicionar outro produto
        </button>
      </Secao>

      {/* ---------------------------------------------------- frete/pagamento */}
      <Secao titulo="Frete e pagamento">
        <Grade>
          <Campo rotuloTexto="Frete (R$)">
            <input style={campo} value={frete} onChange={(e) => setFrete(mascararDinheiro(e.target.value))} placeholder="R$ 0,00" />
          </Campo>
          <Campo rotuloTexto="Transportadora" largura="2fr">
            <input
              style={campo}
              value={transportadora}
              onChange={(e) => setTransportadora(e.target.value)}
              placeholder="Jadlog, Correios, entrega em mãos..."
            />
          </Campo>
        </Grade>

        <Grade>
          <Campo rotuloTexto="Onde fechou">
            <select style={campo} value={canal} onChange={(e) => setCanal(e.target.value as typeof canal)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram_dm">Instagram</option>
              <option value="admin">Outro</option>
            </select>
          </Campo>
          <Campo rotuloTexto="Forma de pagamento">
            <select
              style={campo}
              value={formaDePagamento}
              onChange={(e) => setFormaDePagamento(e.target.value as typeof formaDePagamento)}
            >
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="mp_link">Link do Mercado Pago</option>
              <option value="external">Pago fora do site</option>
            </select>
          </Campo>
          <Campo rotuloTexto="Data da venda">
            <input
              type="date"
              style={campo}
              value={dataDaVenda}
              onChange={(e) => setDataDaVenda(e.target.value)}
            />
          </Campo>
        </Grade>

        <Campo rotuloTexto="Comprovante que ela mandou">
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{ ...campo, padding: '0.45rem' }}
            onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
          />
        </Campo>

        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.8rem' }}>
          <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
          <span>
            Já está pago
            <span style={{ ...sutil, display: 'block', fontSize: '0.85rem' }}>
              Marcado, o pedido entra no faturamento do mês e a conversão volta para a Meta.
            </span>
          </span>
        </label>
      </Secao>

      <Secao titulo="Observação">
        <textarea
          rows={3}
          style={{ ...campo, fontFamily: 'inherit', resize: 'vertical' }}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </Secao>

      {/* ------------------------------------------------------------- fechar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--theme-bg)',
          borderTop: '1px solid var(--theme-elevation-150)',
          padding: '1rem 0',
          marginTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={sutil}>Total do pedido</div>
          <strong style={{ fontSize: '1.4rem' }}>{brl(total)}</strong>
        </div>

        <button type="button" onClick={enviar} disabled={salvando} style={botaoPrimario}>
          {salvando ? 'Lançando...' : 'Lançar pedido'}
        </button>
      </div>

      {erro && (
        <p role="alert" style={{ ...alerta, background: '#fdeeee', borderColor: '#d9a2a2' }}>
          {erro}
        </p>
      )}
    </div>
  )
}

function trocarLinha(
  setLinhas: React.Dispatch<React.SetStateAction<LinhaDoPedido[]>>,
  indice: number,
  mudanca: Partial<LinhaDoPedido>,
) {
  setLinhas((atuais) => atuais.map((linha, i) => (i === indice ? { ...linha, ...mudanca } : linha)))
}

/**
 * Faixa do site ou quantidade combinada.
 *
 * Fica discreto, embaixo da linha: o caso comum é a faixa, e a troca é um
 * clique quando a conversa pediu 21 peças.
 */
function AlternadorDeModo({
  modo,
  aoTrocar,
}: {
  modo: 'faixa' | 'livre'
  aoTrocar: (modo: 'faixa' | 'livre') => void
}) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '-0.3rem', marginBottom: '0.3rem' }}>
      {(
        [
          ['faixa', 'Faixa do site'],
          ['livre', 'Quantidade combinada'],
        ] as const
      ).map(([valor, rotuloTexto]) => (
        <button
          key={valor}
          type="button"
          onClick={() => aoTrocar(valor)}
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: 999,
            border: '1px solid var(--theme-elevation-150)',
            background: modo === valor ? 'var(--theme-elevation-100)' : 'transparent',
            color: modo === valor ? 'var(--theme-elevation-800)' : 'var(--theme-elevation-500)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {rotuloTexto}
        </button>
      ))}
    </div>
  )
}

/** Avisos da venda combinada. Chamam atenção, não impedem. */
function Conferencia({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null

  return (
    <ul
      style={{
        margin: '0.6rem 0 0',
        padding: '0.6rem 1rem 0.6rem 1.6rem',
        border: '1px solid #e3c97a',
        background: '#fff8e6',
        borderRadius: 6,
        fontSize: '0.88rem',
      }}
    >
      {avisos.map((aviso) => (
        <li key={aviso}>{aviso}</li>
      ))}
    </ul>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.7rem' }}>{titulo}</h2>
      {children}
    </section>
  )
}

function Grade({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
      {children}
    </div>
  )
}

function Campo({
  rotuloTexto,
  largura = '1fr',
  children,
}: {
  rotuloTexto: string
  largura?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ flex: largura.replace('fr', ''), minWidth: '8rem' }}>
      <label style={rotulo}>{rotuloTexto}</label>
      {children}
    </div>
  )
}

const campo: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.7rem',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 4,
  background: 'var(--theme-input-bg)',
  color: 'var(--theme-elevation-800)',
  fontSize: '1rem',
}

const rotulo: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  marginBottom: '0.25rem',
  color: 'var(--theme-elevation-600)',
}

const sutil: React.CSSProperties = { color: 'var(--theme-elevation-600)' }

const cartao: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 6,
  padding: '1rem',
  marginTop: '1rem',
}

const alerta: React.CSSProperties = {
  margin: '0.9rem 0 0',
  padding: '0.8rem 1rem 0.8rem 1.6rem',
  border: '1px solid',
  borderRadius: 6,
  listStylePosition: 'inside',
}

const botaoPrimario: React.CSSProperties = {
  padding: '0.7rem 1.2rem',
  border: 'none',
  borderRadius: 4,
  background: 'var(--theme-elevation-800)',
  color: 'var(--theme-elevation-0)',
  fontSize: '0.95rem',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const botaoSecundario: React.CSSProperties = {
  padding: '0.7rem 1.2rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'transparent',
  color: 'var(--theme-elevation-800)',
  fontSize: '0.95rem',
  cursor: 'pointer',
}
