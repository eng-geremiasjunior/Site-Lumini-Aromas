'use client'

import { useState, useTransition } from 'react'

import { formatarReais } from '../../commerce/format/mascaras.ts'
import {
  metricas,
  type LeituraDoRelatorio,
  type LinhaDeCampanha,
} from '../../commerce/marketing/relatorio-de-anuncios.ts'
import { importarAnuncios, lerColagem } from './acoes.ts'

/**
 * Colar, conferir, confirmar.
 *
 * Três passos, e nenhum deles é digitar. Os números já existem no
 * Gerenciador de Anúncios: o trabalho aqui é só trazê-los para o mesmo lugar
 * onde está a receita, para o custo do tráfego parar de ser uma lembrança.
 *
 * A conferência entre colar e gravar não é cerimônia: é onde se vê que uma
 * campanha veio zerada, que uma coluna ficou de fora da cópia, ou que o mês
 * escolhido não é o mês do relatório.
 */
export function FormularioDeImportacao({
  categorias,
  mesPadrao,
}: {
  categorias: Array<{ id: string; nome: string; plataforma: string | null }>
  mesPadrao: string
}) {
  const [texto, setTexto] = useState('')
  const [leitura, setLeitura] = useState<LeituraDoRelatorio | null>(null)
  const [mes, setMes] = useState(mesPadrao)
  const [categoria, setCategoria] = useState('')
  const [resultado, setResultado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [lendo, lerAgora] = useTransition()
  const [gravando, gravarAgora] = useTransition()

  function conferir() {
    setResultado(null)
    setErro(null)

    lerAgora(async () => {
      const lida = await lerColagem(texto)
      setLeitura(lida)

      // A categoria certa costuma ser a da plataforma reconhecida. Sugerir
      // poupa um clique; trocar continua possível.
      if (!categoria) {
        const sugestao = categorias.find((cada) => cada.plataforma === lida.plataforma)
        if (sugestao) setCategoria(sugestao.id)
      }
    })
  }

  function confirmar() {
    if (!leitura) return
    setErro(null)

    gravarAgora(async () => {
      const resposta = await importarAnuncios({
        mes,
        plataforma: leitura.plataforma,
        categoriaId: categoria,
        linhas: leitura.linhas,
      })

      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      setResultado(
        `${resposta.criados} lançamento(s) criado(s) e ${resposta.atualizados} atualizado(s). Total de ${formatarReais(resposta.total)} em tráfego.`,
      )
      setLeitura(null)
      setTexto('')
    })
  }

  const total = (leitura?.linhas ?? []).reduce((soma, linha) => soma + linha.investimento, 0)

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section>
        <label htmlFor="colagem" style={rotulo}>
          Cole aqui o relatório
        </label>
        <p style={ajuda}>
          No Gerenciador de Anúncios, escolha o período, selecione as linhas com a primeira
          linha de títulos junto e copie. No Google Ads é o mesmo. Serve também um arquivo
          exportado, aberto e copiado da planilha.
        </p>
        <textarea
          id="colagem"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          rows={8}
          placeholder={'Nome da campanha\tValor usado (BRL)\tAlcance\tImpressões\tCliques...'}
          style={{
            width: '100%',
            padding: '0.7rem',
            borderRadius: 4,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-input-bg, var(--theme-elevation-0))',
            color: 'var(--theme-elevation-800)',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
          }}
        />

        <button
          type="button"
          onClick={conferir}
          disabled={lendo || texto.trim() === ''}
          style={{ ...botao, marginTop: '0.6rem' }}
        >
          {lendo ? 'Lendo...' : 'Conferir'}
        </button>
      </section>

      {leitura && (
        <section>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>
            {leitura.linhas.length} campanha(s) · {formatarReais(total)} ·{' '}
            {leitura.plataforma === 'Outros' ? 'plataforma não reconhecida' : leitura.plataforma}
          </h2>

          {leitura.avisos.length > 0 && (
            <ul style={{ ...aviso, marginBottom: '1rem' }}>
              {leitura.avisos.map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          )}

          {leitura.colunasIgnoradas.length > 0 && (
            <p style={ajuda}>
              Colunas coladas e não usadas: {leitura.colunasIgnoradas.join(', ')}.
            </p>
          )}

          {leitura.linhas.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ color: 'var(--theme-elevation-600)' }}>
                    <th style={{ ...celula, textAlign: 'left' }}>Campanha</th>
                    <th style={celula}>Investido</th>
                    <th style={celula}>Alcance</th>
                    <th style={celula}>Cliques</th>
                    <th style={celula}>CPC</th>
                    <th style={celula}>Resultados</th>
                    <th style={celula}>Custo por resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {leitura.linhas.map((linha) => (
                    <Linha key={linha.campanha} linha={linha} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
              marginTop: '1.25rem',
            }}
          >
            <div>
              <label htmlFor="mes" style={rotulo}>
                Mês de referência
              </label>
              <input
                id="mes"
                type="month"
                value={mes}
                onChange={(evento) => setMes(evento.target.value)}
                style={campo}
              />
            </div>

            <div style={{ minWidth: '16rem' }}>
              <label htmlFor="categoria" style={rotulo}>
                Lançar como
              </label>
              <select
                id="categoria"
                value={categoria}
                onChange={(evento) => setCategoria(evento.target.value)}
                style={campo}
              >
                <option value="">Escolha a categoria</option>
                {categorias.map((cada) => (
                  <option key={cada.id} value={cada.id}>
                    {cada.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={confirmar}
              disabled={gravando || categoria === '' || leitura.linhas.length === 0}
              style={{ ...botao, background: 'var(--theme-elevation-800)', color: 'var(--theme-elevation-0)', borderColor: 'transparent' }}
            >
              {gravando ? 'Gravando...' : 'Confirmar e lançar'}
            </button>
          </div>

          <p style={{ ...ajuda, marginTop: '0.6rem' }}>
            Importar o mesmo mês de novo substitui o que já foi importado, em vez de somar.
          </p>
        </section>
      )}

      {erro && <p style={{ ...aviso, margin: 0 }}>{erro}</p>}

      {resultado && (
        <p
          style={{
            margin: 0,
            padding: '0.9rem 1.1rem',
            borderRadius: 6,
            border: '1px solid var(--theme-success-250, var(--theme-elevation-150))',
            background: 'var(--theme-success-50, var(--theme-elevation-50))',
          }}
        >
          {resultado} Já aparece em <a href="/admin/dre">Resultado do mês</a>.
        </p>
      )}
    </div>
  )
}

function Linha({ linha }: { linha: LinhaDeCampanha }) {
  const calculado = metricas(linha)

  return (
    <tr style={{ borderTop: '1px solid var(--theme-elevation-100)' }}>
      <td style={{ ...celula, textAlign: 'left' }}>{linha.campanha}</td>
      <td style={celula}>{formatarReais(linha.investimento)}</td>
      <td style={celula}>{linha.alcance?.toLocaleString('pt-BR') ?? '—'}</td>
      <td style={celula}>{linha.cliques?.toLocaleString('pt-BR') ?? '—'}</td>
      <td style={celula}>{calculado.cpc === null ? '—' : formatarReais(calculado.cpc)}</td>
      <td style={celula}>{linha.resultados?.toLocaleString('pt-BR') ?? '—'}</td>
      <td style={celula}>
        {calculado.custoPorResultado === null ? '—' : formatarReais(calculado.custoPorResultado)}
      </td>
    </tr>
  )
}

const rotulo: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.3rem',
}

const ajuda: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--theme-elevation-600)',
  margin: '0 0 0.6rem',
}

const aviso: React.CSSProperties = {
  padding: '0.8rem 1.1rem',
  borderRadius: 6,
  border: '1px solid var(--theme-warning-250, var(--theme-elevation-150))',
  background: 'var(--theme-warning-50, var(--theme-elevation-50))',
  fontSize: '0.88rem',
  listStyle: 'none',
}

const campo: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-elevation-800)',
  fontSize: '0.9rem',
  minWidth: '10rem',
}

const botao: React.CSSProperties = {
  padding: '0.55rem 1.1rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'transparent',
  color: 'var(--theme-elevation-800)',
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const celula: React.CSSProperties = {
  padding: '0.45rem 0.6rem',
  textAlign: 'right',
  fontWeight: 400,
  fontVariantNumeric: 'tabular-nums',
}
