import { emHtml, type Email } from '../commerce/notifications/emails.ts'

/**
 * Entrega de e-mail.
 *
 * Usa a Resend quando a chave existe. Sem chave — que é o estado até o dono
 * criar a conta — a mensagem vai para o terminal por inteiro, e o resto da
 * loja continua funcionando. É o mesmo princípio do "frete a combinar": uma
 * credencial que falta não pode travar a construção nem o checkout.
 */
export type ResultadoDoEnvio = { ok: true; id?: string } | { ok: false; erro: string }

export async function enviarEmail(para: string, email: Email): Promise<ResultadoDoEnvio> {
  const chave = process.env.RESEND_API_KEY
  const remetente = process.env.EMAIL_FROM ?? 'Lumini Aromas <pedidos@luminiaromas.com.br>'
  const urlDaLoja = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://luminiaromas.com.br'

  if (!chave) {
    console.info(
      [
        '',
        '── e-mail que sairia agora ' + '─'.repeat(40),
        `Para: ${para}`,
        `Assunto: ${email.assunto}`,
        '',
        email.texto,
        '─'.repeat(66),
        '',
      ].join('\n'),
    )
    return { ok: true }
  }

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: [para],
        subject: email.assunto,
        text: email.texto,
        html: emHtml(email, urlDaLoja),
      }),
    })

    if (!resposta.ok) {
      return { ok: false, erro: `${resposta.status}: ${(await resposta.text()).slice(0, 500)}` }
    }

    const corpo = (await resposta.json()) as { id?: string }
    return { ok: true, id: corpo.id }
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) }
  }
}
