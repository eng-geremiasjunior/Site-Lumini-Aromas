import { getPayloadClient } from '../../../lib/payload.ts'
import { varrerCarrinhos } from '../../../lib/carrinhos-abandonados.ts'

/**
 * A varredura dos carrinhos parados.
 *
 * Roda de hora em hora pelo cron da Vercel. Ela não manda e-mail: decide
 * quem merece lembrete e coloca na caixa de saída, que entrega.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  const segredo = process.env.CRON_SECRET

  if (segredo) {
    const autorizacao = request.headers.get('authorization')
    if (autorizacao !== `Bearer ${segredo}`) {
      return Response.json({ erro: 'não autorizado' }, { status: 401 })
    }
  }

  const payload = await getPayloadClient()
  const resultado = await varrerCarrinhos(payload)

  return Response.json(resultado)
}
