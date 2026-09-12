'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { LIMITE_DA_MENSAGEM } from '../../../commerce/orders/presente.ts'
import { formatarReais, mascararCpfCnpj, mascararTelefone } from '../../../commerce/format/mascaras.ts'
import { comprarCartaoPresente } from './actions.ts'

/** Recados prontos, para quem trava na hora de escrever. */
const EXEMPLOS = [
  'Para fazer você sorrir.',
  'Escolha as suas do jeitinho que você gosta.',
  'Que o seu dia seja tão bonito quanto você imaginou.',
]

export function FormularioDoCartao({ valores }: { valores: number[] }) {
  const router = useRouter()

  const [valor, setValor] = useState(valores[0] ?? 0)
  const [de, setDe] = useState('')
  const [para, setPara] = useState('')
  const [emailDoDestinatario, setEmailDoDestinatario] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [agendar, setAgendar] = useState(false)
  const [enviarEm, setEnviarEm] = useState('')

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [documento, setDocumento] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)

  const [erro, setErro] = useState<{ mensagem: string; campo?: string } | null>(null)
  const [enviando, enviar] = useTransition()

  function finalizar() {
    setErro(null)
    enviar(async () => {
      const resposta = await comprarCartaoPresente({
        valorCentavos: valor,
        de,
        para,
        emailDoDestinatario,
        mensagem,
        enviarEm: agendar ? enviarEm : '',
        comprador: { nome, email, telefone, documento },
        aceitouTermos,
      })

      if (resposta.ok) router.push(`/pedido-recebido/?numero=${resposta.numero}`)
      else setErro({ mensagem: resposta.mensagem, campo: resposta.campo })
    })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))',
        gap: '2.5rem',
        alignItems: 'start',
      }}
    >
      {/* --------------------------------------------------------- o cartão */}
      <div>
        <div
          style={{
            aspectRatio: '3 / 4',
            borderRadius: 14,
            background: 'var(--lumini-cream)',
            border: '1px solid var(--lumini-line)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '2rem',
              fontFamily: 'var(--lumini-font-display)',
              color: 'var(--lumini-ink)',
            }}
          >
            {formatarReais(valor)}
          </p>

          {mensagem && (
            <p style={{ margin: 0, color: 'var(--lumini-ink-soft)', fontStyle: 'italic' }}>
              {mensagem}
            </p>
          )}

          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--lumini-ink-soft)' }}>
            {para ? `Para ${para}` : 'Para quem você escolher'}
            {de || nome ? ` · de ${de || nome}` : ''}
          </p>
        </div>

        <p
          style={{
            marginTop: '0.7rem',
            fontSize: '0.85rem',
            color: 'var(--lumini-ink-soft)',
          }}
        >
          É assim que vai aparecer para quem receber.
        </p>
      </div>

      {/* ---------------------------------------------------------- o forma */}
      <div style={{ display: 'grid', gap: '1.75rem' }}>
        <section>
          <h2 style={rotuloDeSecao}>Valor</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {valores.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setValor(opcao)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 8,
                  border: `1px solid ${valor === opcao ? 'var(--lumini-ink)' : 'var(--lumini-line)'}`,
                  background: valor === opcao ? 'var(--lumini-ink)' : '#fff',
                  color: valor === opcao ? '#fff' : 'var(--lumini-ink)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                }}
              >
                {formatarReais(opcao)}
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: '0.8rem' }}>
          <h2 style={rotuloDeSecao}>Para quem é</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Campo rotulo="De parte de" dica="Vazio usa o seu nome.">
              <input
                style={campo}
                value={de}
                onChange={(e) => setDe(e.target.value)}
                placeholder={nome}
              />
            </Campo>
            <Campo rotulo="Para" obrigatorio erro={erro?.campo === 'para'}>
              <input style={campo} value={para} onChange={(e) => setPara(e.target.value)} />
            </Campo>
          </div>

          <Campo
            rotulo="E-mail de quem recebe"
            obrigatorio
            dica="É para cá que o cartão vai."
            erro={erro?.campo === 'emailDoDestinatario'}
          >
            <input
              type="email"
              style={campo}
              value={emailDoDestinatario}
              onChange={(e) => setEmailDoDestinatario(e.target.value)}
            />
          </Campo>

          <Campo
            rotulo="Escreva algo especial"
            dica={`${mensagem.length}/${LIMITE_DA_MENSAGEM}`}
            erro={erro?.campo === 'mensagem'}
          >
            <textarea
              rows={3}
              maxLength={LIMITE_DA_MENSAGEM}
              style={{ ...campo, fontFamily: 'inherit', resize: 'vertical' }}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </Campo>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              fontSize: '0.85rem',
              color: 'var(--lumini-ink-soft)',
            }}
          >
            <span>Sem ideia?</span>
            {EXEMPLOS.map((exemplo, indice) => (
              <button
                key={exemplo}
                type="button"
                onClick={() => setMensagem(exemplo)}
                style={ligacao}
              >
                {indice + 1}
              </button>
            ))}
            <button type="button" onClick={() => setMensagem('')} style={ligacao}>
              sem recado
            </button>
          </div>
        </section>

        <section>
          <h2 style={rotuloDeSecao}>Quando enviar</h2>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="radio" checked={!agendar} onChange={() => setAgendar(false)} />
            <span>Assim que o pagamento for confirmado</span>
          </label>

          <label
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}
          >
            <input type="radio" checked={agendar} onChange={() => setAgendar(true)} />
            <span>Em uma data marcada</span>
          </label>

          {agendar && (
            <input
              type="date"
              style={{ ...campo, marginTop: '0.6rem', maxWidth: '14rem' }}
              value={enviarEm}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setEnviarEm(e.target.value)}
            />
          )}
        </section>

        <section style={{ display: 'grid', gap: '0.8rem' }}>
          <h2 style={rotuloDeSecao}>Seus dados</h2>

          <Campo rotulo="Seu nome" obrigatorio erro={erro?.campo === 'nome'}>
            <input style={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          <Campo
            rotulo="Seu e-mail"
            obrigatorio
            dica="Mandamos a confirmação e o código para cá também."
            erro={erro?.campo === 'email'}
          >
            <input
              type="email"
              style={campo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Campo rotulo="WhatsApp">
              <input
                style={campo}
                value={telefone}
                onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
              />
            </Campo>
            <Campo rotulo="CPF" dica="Para a nota fiscal.">
              <input
                style={campo}
                value={documento}
                onChange={(e) => setDocumento(mascararCpfCnpj(e.target.value))}
              />
            </Campo>
          </div>
        </section>

        <section>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              style={{ marginTop: '0.25rem' }}
            />
            <span style={{ fontSize: '0.92rem' }}>
              Li e aceito os <a href="/termos-de-uso/">Termos de uso</a> e a{' '}
              <a href="/politica-de-privacidade/">Política de privacidade</a>.
            </span>
          </label>

          {erro && (
            <p role="alert" style={{ marginTop: '0.8rem', color: '#8a2a2a', fontSize: '0.92rem' }}>
              {erro.mensagem}
            </p>
          )}

          <button
            type="button"
            onClick={finalizar}
            disabled={enviando}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.95rem 1.2rem',
              border: 'none',
              borderRadius: 8,
              background: 'var(--lumini-ink)',
              color: '#fff',
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {enviando ? 'Um instante...' : `Presentear com ${formatarReais(valor)}`}
          </button>

          <p
            style={{
              margin: '0.6rem 0 0',
              fontSize: '0.85rem',
              color: 'var(--lumini-ink-soft)',
              textAlign: 'center',
            }}
          >
            O cartão só é criado depois que o pagamento entra.
          </p>
        </section>
      </div>
    </div>
  )
}

function Campo({
  rotulo,
  dica,
  obrigatorio,
  erro,
  children,
}: {
  rotulo: string
  dica?: string
  obrigatorio?: boolean
  erro?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.88rem',
          marginBottom: '0.25rem',
          color: erro ? '#8a2a2a' : 'var(--lumini-ink)',
        }}
      >
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {dica && (
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--lumini-ink-soft)' }}>
          {dica}
        </p>
      )}
    </div>
  )
}

const rotuloDeSecao: React.CSSProperties = {
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'var(--lumini-ink-soft)',
  marginBottom: '0.7rem',
  fontFamily: 'var(--lumini-font-body)',
}

const campo: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--lumini-line)',
  borderRadius: 8,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: '1rem',
}

const ligacao: React.CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: 'var(--lumini-gold)',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
}
