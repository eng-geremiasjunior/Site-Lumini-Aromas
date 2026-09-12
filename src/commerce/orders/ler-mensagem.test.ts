import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  cnpjValido,
  cpfValido,
  extrairAroma,
  extrairCep,
  extrairData,
  extrairDocumento,
  extrairQuantidade,
  extrairTelefone,
  extrairTipoDeEvento,
  lerMensagem,
  lerSemIA,
} from './ler-mensagem.ts'

const HOJE = new Date('2026-09-12T12:00:00.000Z')

// CPF e CNPJ válidos de teste (dígitos conferem, titular não existe).
const CPF_OK = '529.982.247-25'
const CNPJ_OK = '11.222.333/0001-81'

describe('cpfValido', () => {
  it('aceita CPF com dígitos corretos', () => {
    assert.equal(cpfValido('52998224725'), true)
  })

  it('recusa CPF com dígito trocado', () => {
    assert.equal(cpfValido('52998224726'), false)
  })

  it('recusa a sequência de números iguais, que passa na conta mas não existe', () => {
    assert.equal(cpfValido('11111111111'), false)
  })
})

describe('cnpjValido', () => {
  it('aceita CNPJ com dígitos corretos', () => {
    assert.equal(cnpjValido('11222333000181'), true)
  })

  it('recusa CNPJ com dígito trocado', () => {
    assert.equal(cnpjValido('11222333000182'), false)
  })
})

describe('extrairDocumento', () => {
  it('lê CPF pontuado e diz que é pessoa física', () => {
    const documento = extrairDocumento(`meu cpf é ${CPF_OK}`)
    assert.equal(documento?.tipo, 'PF')
    assert.equal(documento?.formatado, CPF_OK)
    assert.equal(documento?.valido, true)
  })

  it('lê CPF sem pontuação e devolve formatado', () => {
    const documento = extrairDocumento('cpf 52998224725')
    assert.equal(documento?.formatado, CPF_OK)
  })

  it('marca como inválido sem descartar, para a tela poder perguntar', () => {
    const documento = extrairDocumento('cpf 529.982.247-26')
    assert.equal(documento?.valido, false)
    assert.equal(documento?.formatado, '529.982.247-26')
  })

  it('reconhece CNPJ como pessoa jurídica', () => {
    const documento = extrairDocumento(`CNPJ ${CNPJ_OK}`)
    assert.equal(documento?.tipo, 'PJ')
    assert.equal(documento?.valido, true)
  })
})

describe('extrairCep', () => {
  it('lê CEP com hífen', () => {
    assert.equal(extrairCep('CEP 35010-000'), '35010-000')
  })

  it('lê CEP sem hífen quando a palavra CEP está junto', () => {
    assert.equal(extrairCep('cep: 35010000'), '35010-000')
  })

  it('não confunde CPF sem pontuação com CEP', () => {
    // Sem esta regra, os oito primeiros dígitos do CPF virariam endereço.
    assert.equal(extrairCep('52998224725'), null)
  })
})

describe('extrairTelefone', () => {
  it('lê celular com DDD e parênteses', () => {
    assert.equal(extrairTelefone('(33) 99947-8774'), '(33) 99947-8774')
  })

  it('lê celular escrito sem nada', () => {
    assert.equal(extrairTelefone('meu zap 33999478774'), '(33) 99947-8774')
  })

  it('lê com o 55 na frente', () => {
    assert.equal(extrairTelefone('+55 33 99947-8774'), '(33) 99947-8774')
  })

  it('lê fixo de oito dígitos', () => {
    assert.equal(extrairTelefone('(33) 3271-1234'), '(33) 3271-1234')
  })

  it('não confunde o CPF com telefone', () => {
    // Os dois têm onze dígitos: sem passar o documento de lado, o CPF
    // viraria o telefone da cliente.
    const texto = `CPF 52998224725 e o zap é (33) 99947-8774`
    assert.equal(extrairTelefone(texto, CPF_OK), '(33) 99947-8774')
  })
})

describe('extrairData', () => {
  it('lê data numérica completa', () => {
    assert.equal(extrairData('12/10/2026', HOJE)?.iso, '2026-10-12')
  })

  it('lê data por extenso', () => {
    assert.equal(extrairData('dia 12 de outubro de 2026', HOJE)?.iso, '2026-10-12')
  })

  it('lê por extenso sem o ano, assumindo a próxima vez que a data acontece', () => {
    const lida = extrairData('é dia 12 de outubro', HOJE)
    assert.equal(lida?.iso, '2026-10-12')
    assert.ok(lida?.aviso?.includes('2026'))
  })

  it('data que já passou neste ano vira a do ano que vem', () => {
    const lida = extrairData('5 de março', HOJE)
    assert.equal(lida?.iso, '2027-03-05')
  })

  it('avisa quando teve de adivinhar o ano', () => {
    assert.ok(extrairData('12/10', HOJE)?.aviso)
  })

  it('não avisa quando o ano veio escrito', () => {
    assert.equal(extrairData('12/10/2026', HOJE)?.aviso, undefined)
  })

  it('recusa data que não existe', () => {
    assert.equal(extrairData('31/02/2026', HOJE), null)
  })
})

describe('extrairQuantidade', () => {
  it('lê "60 peças"', () => {
    assert.equal(extrairQuantidade('quero 60 peças'), 60)
  })

  it('lê "100 lembrancinhas"', () => {
    assert.equal(extrairQuantidade('vão ser 100 lembrancinhas'), 100)
  })

  it('lê o campo rotulado', () => {
    assert.equal(extrairQuantidade('Quantidade: 150'), 150)
  })

  it('não inventa quantidade a partir de qualquer número solto', () => {
    assert.equal(extrairQuantidade('moro no número 100'), null)
  })
})

describe('extrairAroma', () => {
  it('reconhece o aroma escrito igual ao catálogo', () => {
    assert.equal(extrairAroma('quero de Lavanda'), 'Lavanda')
  })

  it('reconhece sem acento, que é como se digita no celular', () => {
    assert.equal(extrairAroma('capim limao por favor'), 'Capim Limão')
  })

  it('entende o apelido que a cliente usa', () => {
    // Ela escreve "baunilha"; o catálogo chama de Vanilla.
    assert.equal(extrairAroma('pode ser baunilha'), 'Vanilla')
  })

  it('só oferece aroma que existe na loja', () => {
    assert.equal(extrairAroma('quero de Coffee', ['Lavanda', 'Vanilla']), null)
  })
})

describe('extrairTipoDeEvento', () => {
  it('entende pelo contexto, sem campo rotulado', () => {
    assert.equal(extrairTipoDeEvento('é para o meu casamento'), 'Casamento')
    assert.equal(extrairTipoDeEvento('festa de 15 anos da minha filha'), '15 anos')
    assert.equal(extrairTipoDeEvento('brinde para a empresa'), 'Corporativo')
  })
})

// ------------------------------------------------------------ mensagem real

const MENSAGEM = `Oi! Seguem meus dados

Nome: Ana Clara Ribeiro
CPF: ${CPF_OK}
Telefone: (33) 99947-8774
E-mail: anaclara@gmail.com

Endereço: Rua Sete de Setembro, 100, apto 202 - Centro
Cidade: Governador Valadares/MG
CEP: 35010-000

É para o meu casamento, dia 12 de outubro de 2026.
Quero 60 peças de Lavanda.
Frase: "Ana & Pedro"`

describe('lerSemIA, numa mensagem como as que chegam', () => {
  const { dados, avisos } = lerSemIA(MENSAGEM, { hoje: HOJE })

  it('pega o nome', () => assert.equal(dados.nome, 'Ana Clara Ribeiro'))
  it('pega o CPF e o tipo de pessoa', () => {
    assert.equal(dados.documento, CPF_OK)
    assert.equal(dados.tipoPessoa, 'PF')
  })
  it('pega o telefone', () => assert.equal(dados.telefone, '(33) 99947-8774'))
  it('pega o e-mail', () => assert.equal(dados.email, 'anaclara@gmail.com'))
  it('pega o CEP', () => assert.equal(dados.cep, '35010-000'))
  it('separa rua, número, complemento e bairro', () => {
    assert.equal(dados.rua, 'Rua Sete de Setembro')
    assert.equal(dados.numero, '100')
    assert.equal(dados.complemento, 'apto 202')
    assert.equal(dados.bairro, 'Centro')
  })
  it('separa cidade e estado', () => {
    assert.equal(dados.cidade, 'Governador Valadares')
    assert.equal(dados.estado, 'MG')
  })
  it('pega a data do evento', () => assert.equal(dados.dataDoEvento, '2026-10-12'))
  it('pega o tipo do evento', () => assert.equal(dados.tipoDoEvento, 'Casamento'))
  it('pega a quantidade', () => assert.equal(dados.quantidade, 60))
  it('pega o aroma', () => assert.equal(dados.aroma, 'Lavanda'))
  it('pega a frase do rótulo sem as aspas', () => assert.equal(dados.frase, 'Ana & Pedro'))
  it('não reclama de nada quando a mensagem está completa', () => {
    assert.deepEqual(avisos, [])
  })
})

describe('lerSemIA, quando a mensagem vem torta', () => {
  it('acha o nome mesmo sem rótulo', () => {
    const { dados } = lerSemIA('Ana Clara Ribeiro\n(33) 99947-8774', { hoje: HOJE })
    assert.equal(dados.nome, 'Ana Clara Ribeiro')
  })

  it('avisa o que faltou em vez de fingir que leu', () => {
    const { avisos } = lerSemIA('quero 60 peças de lavanda', { hoje: HOJE })
    assert.ok(avisos.some((aviso) => aviso.includes('nome')))
    assert.ok(avisos.some((aviso) => aviso.includes('endereço')))
  })

  it('avisa sobre CPF que não confere, sem jogar fora', () => {
    const { dados, avisos } = lerSemIA('CPF: 529.982.247-26', { hoje: HOJE })
    assert.equal(dados.documento, '529.982.247-26')
    assert.ok(avisos.some((aviso) => aviso.includes('conferência')))
  })

  it('devolve o que não soube aproveitar, para nada se perder calado', () => {
    const { naoLido } = lerSemIA(
      `Nome: Ana Clara Ribeiro\nAh, e ela queria saber se dá para embrulhar em papel de seda`,
      { hoje: HOJE },
    )
    assert.ok(naoLido.some((linha) => linha.includes('papel de seda')))
  })

  it('mensagem vazia não quebra', () => {
    const { dados } = lerSemIA('', { hoje: HOJE })
    assert.equal(dados.nome, null)
  })
})

// ------------------------------------------------------------------ com IA

describe('lerMensagem com interpretador', () => {
  it('deixa a IA preencher só o que ficou vazio', async () => {
    const { dados } = await lerMensagem('Nome: Ana Clara Ribeiro', {
      hoje: HOJE,
      interpretador: async () => ({ nome: 'Outra Pessoa', tipoDoEvento: 'Casamento' }),
    })

    assert.equal(dados.nome, 'Ana Clara Ribeiro', 'a IA não pode sobrescrever o que já foi lido')
    assert.equal(dados.tipoDoEvento, 'Casamento', 'mas preenche o que faltava')
  })

  it('a IA nunca troca um documento cujos dígitos já foram conferidos', async () => {
    // É a garantia que separa "assistente" de "fonte de erro": o modelo
    // pode entender intenção, mas não inventa número que já foi validado.
    const { dados } = await lerMensagem(`CPF ${CPF_OK}`, {
      hoje: HOJE,
      interpretador: async () => ({ documento: '111.111.111-11', cep: '99999-999' }),
    })

    assert.equal(dados.documento, CPF_OK)
  })

  it('modelo fora do ar não impede o lançamento da venda', async () => {
    const { dados, avisos } = await lerMensagem('Nome: Ana Clara Ribeiro', {
      hoje: HOJE,
      interpretador: async () => {
        throw new Error('sem rede')
      },
    })

    assert.equal(dados.nome, 'Ana Clara Ribeiro')
    assert.ok(avisos.some((aviso) => aviso.includes('leitura assistida')))
  })
})
