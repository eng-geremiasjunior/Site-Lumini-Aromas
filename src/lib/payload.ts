import configPromise from '@payload-config'
import { getPayload as getPayloadInstance } from 'payload'

/**
 * Acesso ao banco a partir da vitrine.
 *
 * Usa a API local do Payload: a consulta acontece dentro do mesmo processo,
 * sem passar por HTTP. É mais rápido e não expõe endpoint público.
 */
export async function getPayloadClient() {
  return getPayloadInstance({ config: configPromise })
}
