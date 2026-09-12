/**
 * A alíquota efetiva do Simples Nacional.
 *
 * O imposto do Simples não é a alíquota da tabela: é a **alíquota efetiva**,
 * que desconta uma parcela fixa e depende de quanto a empresa faturou nos
 * doze meses anteriores. Quem usa a alíquota da tabela direto erra o DRE
 * para mais em praticamente todas as faixas — na faixa de faturamento da
 * Lumini, a diferença passa de três pontos percentuais sobre a receita.
 *
 *     alíquota efetiva = (RBT12 × alíquota da tabela − parcela a deduzir) ÷ RBT12
 *
 * Duas observações que mudam o número no fim do mês:
 *
 * **A vela fabricada e o produto revendido pagam tabelas diferentes.** Vela
 * feita no ateliê é indústria (Anexo II); difusor comprado pronto para
 * revenda é comércio (Anexo I). Por isso a receita é segregada por item, e
 * não jogada num total só.
 *
 * **As tabelas vêm da lei, mas a conferência é do contador.** Elas estão
 * aqui como valor padrão porque o DRE precisa de um número para funcionar
 * desde o primeiro mês, e ficam editáveis nas Configurações. Se a lei mudar
 * — e em 2027 muda, com IBS e CBS —, muda num lugar só.
 */

export type Anexo = 'I' | 'II'

export type FaixaDoSimples = {
  /** Teto da faixa em centavos. O último é o teto do Simples. */
  ateEmCentavos: number
  /** Alíquota nominal, em pontos percentuais. Ex.: 7.3 para 7,30%. */
  aliquota: number
  /** Parcela a deduzir, em centavos. */
  deduzirEmCentavos: number
}

const REAL = 100

/** Anexo I — comércio (revenda). */
export const ANEXO_I: FaixaDoSimples[] = [
  { ateEmCentavos: 180_000 * REAL, aliquota: 4.0, deduzirEmCentavos: 0 },
  { ateEmCentavos: 360_000 * REAL, aliquota: 7.3, deduzirEmCentavos: 5_940 * REAL },
  { ateEmCentavos: 720_000 * REAL, aliquota: 9.5, deduzirEmCentavos: 13_860 * REAL },
  { ateEmCentavos: 1_800_000 * REAL, aliquota: 10.7, deduzirEmCentavos: 22_500 * REAL },
  { ateEmCentavos: 3_600_000 * REAL, aliquota: 14.3, deduzirEmCentavos: 87_300 * REAL },
  { ateEmCentavos: 4_800_000 * REAL, aliquota: 19.0, deduzirEmCentavos: 378_000 * REAL },
]

/** Anexo II — indústria. É onde entra a vela feita no ateliê. */
export const ANEXO_II: FaixaDoSimples[] = [
  { ateEmCentavos: 180_000 * REAL, aliquota: 4.5, deduzirEmCentavos: 0 },
  { ateEmCentavos: 360_000 * REAL, aliquota: 7.8, deduzirEmCentavos: 5_940 * REAL },
  { ateEmCentavos: 720_000 * REAL, aliquota: 10.0, deduzirEmCentavos: 13_860 * REAL },
  { ateEmCentavos: 1_800_000 * REAL, aliquota: 11.2, deduzirEmCentavos: 22_500 * REAL },
  { ateEmCentavos: 3_600_000 * REAL, aliquota: 14.7, deduzirEmCentavos: 85_500 * REAL },
  { ateEmCentavos: 4_800_000 * REAL, aliquota: 30.0, deduzirEmCentavos: 720_000 * REAL },
]

export function tabelaDoAnexo(anexo: Anexo): FaixaDoSimples[] {
  return anexo === 'I' ? ANEXO_I : ANEXO_II
}

export function faixaDoFaturamento(rbt12EmCentavos: number, anexo: Anexo): FaixaDoSimples {
  const tabela = tabelaDoAnexo(anexo)
  return tabela.find((faixa) => rbt12EmCentavos <= faixa.ateEmCentavos) ?? (tabela[tabela.length - 1] as FaixaDoSimples)
}

/**
 * A alíquota efetiva, em pontos percentuais.
 *
 * Empresa nova, sem doze meses de histórico, cai na primeira faixa: a lei
 * manda proporcionalizar os meses existentes, e o resultado dessa conta é
 * sempre a primeira faixa enquanto o negócio não cresce muito rápido.
 */
export function aliquotaEfetiva(rbt12EmCentavos: number, anexo: Anexo): number {
  const tabela = tabelaDoAnexo(anexo)
  const primeira = tabela[0] as FaixaDoSimples

  if (rbt12EmCentavos <= 0) return primeira.aliquota

  const faixa = faixaDoFaturamento(rbt12EmCentavos, anexo)
  const efetiva = (rbt12EmCentavos * (faixa.aliquota / 100) - faixa.deduzirEmCentavos) / rbt12EmCentavos

  // Só acontece se alguém editar a tabela e inverter alíquota e dedução.
  // Melhor devolver zero do que um imposto negativo somando no lucro.
  if (!Number.isFinite(efetiva) || efetiva < 0) return 0

  return efetiva * 100
}

/** O imposto do mês sobre uma receita, em centavos. */
export function impostoSobre(
  receitaEmCentavos: number,
  rbt12EmCentavos: number,
  anexo: Anexo,
): number {
  if (receitaEmCentavos <= 0) return 0
  return Math.round(receitaEmCentavos * (aliquotaEfetiva(rbt12EmCentavos, anexo) / 100))
}
