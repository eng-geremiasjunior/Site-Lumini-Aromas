'use client'

import { useMemo, useState, useTransition } from 'react'

import type { ProductView } from '../../../../commerce/catalog/get-product.ts'
import { useRouter } from 'next/navigation'

import { adicionarAoCarrinho, type ResultadoAdicao } from './actions.ts'

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  produto: ProductView
  whatsappNumber: string
  /** Aroma e quantidade vindos da URL, usados pelos anúncios do Google e da Meta. */
  aromaInicial?: string | null
  quantidadeInicial?: number | null
}

export function SeletorDeCompra({
  produto,
  whatsappNumber,
  aromaInicial,
  quantidadeInicial,
}: Props) {
  const [aroma, setAroma] = useState<string | null>(
    aromaInicial && produto.variants.some((v) => v.key === aromaInicial)
      ? aromaInicial
      : (produto.variants[0]?.key ?? null),
  )

  const [quantidade, setQuantidade] = useState<number>(() => {
    const faixas = produto.lotTable.map((linha) => linha.qty)
    if (quantidadeInicial && faixas.includes(quantidadeInicial)) return quantidadeInicial
    return faixas[0] ?? 20
  })

  const [personalizacao, setPersonalizacao] = useState<Record<string, string>>({})
  const [acabamentos, setAcabamentos] = useState<string[]>([])
  const [resultado, setResultado] = useState<ResultadoAdicao | null>(null)
  const [enviando, iniciarEnvio] = useTransition()
  const router = useRouter()

  const linhaAtual = useMemo(
    () => produto.lotTable.find((linha) => linha.qty === quantidade) ?? produto.lotTable[0],
    [produto.lotTable, quantidade],
  )

  const totalAcabamentos = useMemo(
    () =>
      produto.addons
        .filter((addon) => acabamentos.includes(addon.id))
        .reduce((soma, addon) => soma + addon.pricePerUnit * quantidade, 0),
    [produto.addons, acabamentos, quantidade],
  )

  const total = (linhaAtual?.lotPrice ?? 0) + totalAcabamentos

  // A calculadora converte número de convidados em quantidade de peças.
  // Regra do setor: uma lembrancinha por família, com 10% de folga.
  const [convidados, setConvidados] = useState<string>('')
  const sugestao = useMemo(() => {
    const numero = Number(convidados)
    if (!Number.isFinite(numero) || numero <= 0) return null
    const pecas = Math.ceil((numero / 2) * 1.1)
    const faixas = produto.lotTable.map((linha) => linha.qty)
    const faixa = faixas.find((q) => q >= pecas) ?? faixas[faixas.length - 1]
    return { pecas, faixa }
  }, [convidados, produto.lotTable])

  const mensagemWhatsApp = useMemo(() => {
    const variante = produto.variants.find((v) => v.key === aroma)
    const linhas = [
      `Olá! Tenho interesse em ${produto.name}${variante ? ` (${variante.label}, ${quantidade} peças)` : ''}.`,
      linhaAtual ? `Vi no site por ${brl(linhaAtual.lotPrice)}.` : '',
    ].filter(Boolean)
    return linhas.join('\n')
  }, [produto, aroma, quantidade, linhaAtual])

  function enviar() {
    setResultado(null)
    iniciarEnvio(async () => {
      const resposta = await adicionarAoCarrinho({
        slug: produto.slug,
        variantKey: aroma,
        qty: quantidade,
        personalization: personalizacao,
        addonIds: acabamentos,
      })
      setResultado(resposta)
      // Deu certo: leva para o carrinho, como qualquer loja faz.
      if (resposta.ok) router.push('/meucarrinho/')
    })
  }

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      {/* ------------------------------------------------------------ aroma */}
      {produto.variants.length > 0 && (
        <section>
          <h2 style={estiloRotulo}>Aroma</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {produto.variants.map((variante) => (
              <button
                key={variante.key}
                type="button"
                onClick={() => setAroma(variante.key)}
                style={estiloOpcao(aroma === variante.key)}
              >
                {variante.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- quantidade */}
      <section>
        <h2 style={estiloRotulo}>Quantidade</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {produto.lotTable.map((linha) => (
            <button
              key={linha.qty}
              type="button"
              onClick={() => setQuantidade(linha.qty)}
              style={estiloOpcao(quantidade === linha.qty)}
              title={`${linha.qty} peças por ${brl(linha.lotPrice)}`}
            >
              {linha.qty} peças
            </button>
          ))}
        </div>

        <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label htmlFor="convidados" style={{ fontSize: '0.9rem', color: 'var(--lumini-ink-soft)' }}>
            Não sabe a quantidade? Quantos convidados?
          </label>
          <input
            id="convidados"
            type="number"
            min={1}
            value={convidados}
            onChange={(evento) => setConvidados(evento.target.value)}
            style={{ width: '5.5rem', padding: '0.35rem 0.5rem' }}
          />
        </div>
        {sugestao && (
          <p style={{ fontSize: '0.9rem', color: 'var(--lumini-ink-soft)', marginTop: '0.4rem' }}>
            Contando uma lembrancinha por família, com folga, dá cerca de {sugestao.pecas} peças.{' '}
            <button type="button" onClick={() => setQuantidade(sugestao.faixa)} style={estiloLink}>
              Selecionar {sugestao.faixa} peças
            </button>
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------- preço */}
      <section
        style={{
          background: '#fff',
          border: '1px solid var(--lumini-line)',
          borderRadius: 10,
          padding: '1.1rem 1.25rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '2rem', fontFamily: 'var(--lumini-font-display)' }}>
          {brl(total)}
        </p>
        <p style={{ margin: '0.2rem 0 0', color: 'var(--lumini-ink-soft)', fontSize: '0.92rem' }}>
          {quantidade} peças, {brl(linhaAtual?.unitPrice ?? 0)} cada
          {totalAcabamentos > 0 ? ` + ${brl(totalAcabamentos)} de acabamentos` : ''}
        </p>
        {produto.deadlineHint && (
          <p style={{ margin: '0.55rem 0 0', color: 'var(--lumini-ink-soft)', fontSize: '0.9rem' }}>
            {produto.deadlineHint}. O prazo de entrega aparece no carrinho, depois do CEP.
          </p>
        )}
      </section>

      {/* --------------------------------------------------- personalização */}
      {produto.personalizationFields.length > 0 && (
        <section>
          <h2 style={estiloRotulo}>Personalização</h2>
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {produto.personalizationFields.map((campo) => (
              <div key={campo.label}>
                <label
                  htmlFor={`campo-${campo.label}`}
                  style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}
                >
                  {campo.label}
                  {campo.required && <span style={{ color: '#a33' }}> *</span>}
                </label>

                {campo.type === 'textarea' ? (
                  <textarea
                    id={`campo-${campo.label}`}
                    rows={3}
                    maxLength={campo.maxChars ?? undefined}
                    placeholder={campo.placeholder ?? ''}
                    value={personalizacao[campo.label] ?? ''}
                    onChange={(evento) =>
                      setPersonalizacao((atual) => ({ ...atual, [campo.label]: evento.target.value }))
                    }
                    style={estiloCampo}
                  />
                ) : campo.type === 'select' ? (
                  <select
                    id={`campo-${campo.label}`}
                    value={personalizacao[campo.label] ?? ''}
                    onChange={(evento) =>
                      setPersonalizacao((atual) => ({ ...atual, [campo.label]: evento.target.value }))
                    }
                    style={estiloCampo}
                  >
                    <option value="">Selecione</option>
                    {campo.options.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`campo-${campo.label}`}
                    type={campo.type === 'date' ? 'date' : 'text'}
                    maxLength={campo.maxChars ?? undefined}
                    placeholder={campo.placeholder ?? ''}
                    value={personalizacao[campo.label] ?? ''}
                    onChange={(evento) =>
                      setPersonalizacao((atual) => ({ ...atual, [campo.label]: evento.target.value }))
                    }
                    style={estiloCampo}
                  />
                )}

                {campo.maxChars && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--lumini-ink-soft)' }}>
                    {(personalizacao[campo.label] ?? '').length} de {campo.maxChars} caracteres.
                    Será impresso exatamente como você digitar.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- acabamentos */}
      {produto.addons.length > 0 && (
        <section>
          <h2 style={estiloRotulo}>Acabamentos</h2>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {produto.addons.map((addon) => (
              <label key={addon.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                <input
                  type="checkbox"
                  checked={acabamentos.includes(addon.id)}
                  onChange={(evento) =>
                    setAcabamentos((atual) =>
                      evento.target.checked
                        ? [...atual, addon.id]
                        : atual.filter((id) => id !== addon.id),
                    )
                  }
                />
                <span>
                  {addon.name}
                  {addon.pricePerUnit > 0 && (
                    <span style={{ color: 'var(--lumini-ink-soft)' }}>
                      {' '}
                      + {brl(addon.pricePerUnit)} por peça
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ ações */}
      <section style={{ display: 'grid', gap: '0.6rem' }}>
        <button type="button" onClick={enviar} disabled={enviando} style={estiloBotaoPrincipal}>
          {enviando ? 'Conferindo...' : 'Adicionar ao carrinho'}
        </button>

        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemWhatsApp)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={estiloBotaoSecundario}
        >
          Tirar dúvida pelo WhatsApp
        </a>

        {resultado && (
          <p
            role="status"
            style={{
              margin: 0,
              padding: '0.7rem 0.9rem',
              borderRadius: 8,
              background: resultado.ok ? '#eef6ee' : '#fdeeee',
              color: resultado.ok ? '#2a5d2a' : '#8a2a2a',
              fontSize: '0.92rem',
            }}
          >
            {resultado.ok
              ? 'Adicionado ao carrinho. Levando você para lá...'
              : resultado.mensagem}
          </p>
        )}
      </section>
    </div>
  )
}

const estiloRotulo: React.CSSProperties = {
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'var(--lumini-ink-soft)',
  fontFamily: 'var(--lumini-font-body)',
  marginBottom: '0.6rem',
}

function estiloOpcao(selecionado: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 0.9rem',
    borderRadius: 999,
    border: `1px solid ${selecionado ? 'var(--lumini-gold)' : 'var(--lumini-line)'}`,
    background: selecionado ? 'var(--lumini-gold)' : '#fff',
    color: selecionado ? '#fff' : 'var(--lumini-ink)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  }
}

const estiloCampo: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  border: '1px solid var(--lumini-line)',
  borderRadius: 8,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
}

const estiloBotaoPrincipal: React.CSSProperties = {
  padding: '0.9rem 1.2rem',
  border: 'none',
  borderRadius: 8,
  background: 'var(--lumini-ink)',
  color: '#fff',
  fontSize: '1rem',
  cursor: 'pointer',
}

const estiloBotaoSecundario: React.CSSProperties = {
  padding: '0.8rem 1.2rem',
  borderRadius: 8,
  border: '1px solid var(--lumini-line)',
  background: '#fff',
  color: 'var(--lumini-ink)',
  fontSize: '0.95rem',
  textAlign: 'center',
  textDecoration: 'none',
}

const estiloLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--lumini-gold)',
  cursor: 'pointer',
  textDecoration: 'underline',
  font: 'inherit',
}
