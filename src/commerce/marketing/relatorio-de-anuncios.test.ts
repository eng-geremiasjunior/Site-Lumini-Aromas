import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { lerRelatorio, metricas, valorEmCentavos } from './relatorio-de-anuncios.ts'

/** Cópia do Gerenciador de Anúncios em português, com tabulação. */
const META = [
  'Nome da campanha\tVeiculação\tValor usado (BRL)\tAlcance\tImpressões\tCliques no link\tResultados',
  'Casamento - conversas\tAtiva\t1.240,50\t18.432\t42.109\t612\t38',
  'Corporativo - fim de ano\tAtiva\t680,00\t9.211\t20.004\t287\t14',
  'Remarketing - visitantes\tPausada\t212,30\t3.004\t9.870\t141\t9',
  'Resultados totais\t\t2.132,80\t30.647\t71.983\t1.040\t61',
].join('\n')

/** Cópia do Google Ads. Não entrega alcance. */
const GOOGLE = [
  'Campanha\tTipo\tCusto\tImpr.\tCliques\tConversões',
  'Remarketing - Display\tDisplay\t310,45\t54.221\t402\t7',
  'Total: campanhas\t\t310,45\t54.221\t402\t7',
].join('\n')

describe('leitura do relatório', () => {
  it('lê a cópia do Gerenciador de Anúncios', () => {
    const leitura = lerRelatorio(META)

    assert.equal(leitura.plataforma, 'Meta')
    assert.equal(leitura.linhas.length, 3)

    const primeira = leitura.linhas[0]
    assert.equal(primeira?.campanha, 'Casamento - conversas')
    assert.equal(primeira?.investimento, 124_050)
    assert.equal(primeira?.alcance, 18_432)
    assert.equal(primeira?.impressoes, 42_109)
    assert.equal(primeira?.cliques, 612)
    assert.equal(primeira?.resultados, 38)
  })

  it('descarta a linha de totais', () => {
    // Somá-la dobraria o investimento do mês.
    const leitura = lerRelatorio(META)

    assert.ok(!leitura.linhas.some((linha) => linha.campanha.includes('totais')))
    assert.equal(
      leitura.linhas.reduce((soma, linha) => soma + linha.investimento, 0),
      213_280,
    )
  })

  it('lê a cópia do Google Ads, que não tem alcance', () => {
    const leitura = lerRelatorio(GOOGLE)

    assert.equal(leitura.linhas.length, 1)
    assert.equal(leitura.linhas[0]?.campanha, 'Remarketing - Display')
    assert.equal(leitura.linhas[0]?.investimento, 31_045)
    assert.equal(leitura.linhas[0]?.alcance, null)
    assert.equal(leitura.linhas[0]?.impressoes, 54_221)
  })

  it('entende o cabeçalho em inglês', () => {
    const texto = [
      'Campaign name\tAmount spent (BRL)\tReach\tImpressions\tLink clicks\tResults',
      'Wedding - messages\t980.00\t12000\t30000\t410\t22',
    ].join('\n')

    const leitura = lerRelatorio(texto)

    assert.equal(leitura.linhas[0]?.campanha, 'Wedding - messages')
    assert.equal(leitura.linhas[0]?.investimento, 98_000)
  })

  it('lista a coluna que não reconheceu, em vez de engolir', () => {
    const leitura = lerRelatorio(META)

    assert.deepEqual(leitura.colunasIgnoradas, ['Veiculação'])
  })

  it('avisa quando não veio cabeçalho', () => {
    const leitura = lerRelatorio('Casamento\t1.240,50\t18.432')

    assert.equal(leitura.linhas.length, 0)
    assert.match(leitura.avisos.join(' '), /cabeçalho/)
  })

  it('avisa quando falta a coluna de valor', () => {
    const leitura = lerRelatorio('Nome da campanha\tAlcance\nCasamento\t1.000')

    assert.match(leitura.avisos.join(' '), /valor gasto/)
  })

  it('avisa quando uma campanha veio zerada', () => {
    const texto = [
      'Nome da campanha\tValor usado (BRL)\tAlcance',
      'Casamento\t1.240,50\t18.432',
      'Teste novo\t\t0',
    ].join('\n')

    assert.match(lerRelatorio(texto).avisos.join(' '), /valor zero/)
  })

  it('aceita ponto e vírgula, e nome de campanha com vírgula', () => {
    const texto = [
      'Nome da campanha;Valor usado (BRL);Cliques',
      '"Casamento - MG, ES e RJ";1.240,50;612',
    ].join('\n')

    const leitura = lerRelatorio(texto)

    assert.equal(leitura.linhas[0]?.campanha, 'Casamento - MG, ES e RJ')
    assert.equal(leitura.linhas[0]?.investimento, 124_050)
  })

  it('não quebra com texto vazio', () => {
    const leitura = lerRelatorio('')

    assert.deepEqual(leitura.linhas, [])
    assert.equal(leitura.avisos.length, 1)
  })
})

describe('valor em centavos', () => {
  it('trata a vírgula como decimal', () => {
    assert.equal(valorEmCentavos('1.240,50'), 124_050)
    assert.equal(valorEmCentavos('R$ 1.240,50'), 124_050)
    assert.equal(valorEmCentavos('0,99'), 99)
  })

  it('trata ponto separando milhar como milhar', () => {
    // "1.240" são mil duzentos e quarenta reais, não um real e vinte e
    // quatro. Errar isso é errar por mil vezes.
    assert.equal(valorEmCentavos('1.240'), 124_000)
  })

  it('aceita o ponto decimal do relatório em inglês', () => {
    assert.equal(valorEmCentavos('980.00'), 98_000)
    assert.equal(valorEmCentavos('12.5'), 1_250)
  })

  it('devolve zero para célula vazia', () => {
    assert.equal(valorEmCentavos(''), 0)
    assert.equal(valorEmCentavos(undefined), 0)
    assert.equal(valorEmCentavos('—'), 0)
  })
})

describe('métricas', () => {
  const linha = {
    campanha: 'Casamento',
    investimento: 124_050,
    alcance: 18_432,
    impressoes: 42_109,
    cliques: 612,
    resultados: 38,
  }

  it('calcula custo por mil, por clique e por resultado', () => {
    const calculado = metricas(linha)

    assert.equal(calculado.cpm, 2946) // R$ 29,46
    assert.equal(calculado.cpc, 203) // R$ 2,03
    assert.equal(calculado.custoPorResultado, 3264) // R$ 32,64
    assert.equal(calculado.ctr, 1.5)
    assert.equal(calculado.frequencia, 2.3)
  })

  it('devolve nada em vez de dividir por zero', () => {
    const calculado = metricas({
      campanha: 'Nova',
      investimento: 5_000,
      alcance: 0,
      impressoes: 0,
      cliques: 0,
      resultados: 0,
    })

    assert.equal(calculado.cpm, null)
    assert.equal(calculado.cpc, null)
    assert.equal(calculado.custoPorResultado, null)
    assert.equal(calculado.frequencia, null)
  })
})
