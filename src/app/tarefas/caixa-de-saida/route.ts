import { getPayloadClient } from '../../../lib/payload.ts'
import { processarFila } from '../../../lib/outbox.ts'

/**
 * O relógio da caixa de saída.
 *
 * Chamada pelo cron da Vercel de poucos em poucos minutos. É ela que faz
 * o e-mail sair, e depois vai fazer a conversão chegar na Meta.
 *
 * Não dá para usar o `autoRun` do Payload aqui: em serverless não existe
 * processo vivo entre uma requisição e outra, então a fila só anda quando
 * alguém bate nesta rota.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  const segredo = process.env.CRON_SECRET

  // Em produção a rota é fechada. Sem segredo configurado (desenvolvimento),
  // fica aberta para dar para testar a fila com o navegador.
  if (segredo) {
    const autorizacao = request.headers.get('authorization')
    if (autorizacao !== `Bearer ${segredo}`) {
      return Response.json({ erro: 'não autorizado' }, { status: 401 })
    }
  }

  const payload = await getPayloadClient()
  const resultado = await processarFila(payload)

  return Response.json(resultado)
}
