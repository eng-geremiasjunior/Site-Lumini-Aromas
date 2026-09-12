import { getPayload as getPayloadInstance } from 'payload'

import configPromise from '../payload.config.ts'

/**
 * Acesso ao banco a partir da vitrine.
 *
 * Usa a API local do Payload: a consulta acontece dentro do mesmo processo,
 * sem passar por HTTP. É mais rápido e não expõe endpoint público.
 *
 * O caminho do config é relativo, e não o atalho `@payload-config`, porque
 * esse atalho só existe para o Next e para o TypeScript. Os scripts da pasta
 * `scripts/` rodam no Node puro — é por lá que passam a importação dos 237
 * pedidos do WooCommerce e as tarefas de manutenção —, e lá o atalho não
 * resolve.
 */
export async function getPayloadClient() {
  return getPayloadInstance({ config: configPromise })
}
