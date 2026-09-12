import type { AdminViewServerProps } from 'payload'

import { dreDoMes, mesAtual, serieDeMeses } from '../../commerce/finance/coletar.ts'
import { nomeDoMes } from '../../commerce/finance/dre.ts'
import { getPayloadClient } from '../../lib/payload.ts'
import { BotaoImprimir } from './BotaoImprimir.tsx'
import { GraficoDoAno, reais } from './Graficos.tsx'
import { TabelaDoDre } from './TabelaDoDre.tsx'

/**
 * O relatório do mês, para imprimir ou mandar.
 *
 * Sai sem o painel em volta: é um documento, não uma tela. Uma página, os
 * números que decidem, e o critério escrito no rodapé — porque um relatório
 * sem critério declarado é um relatório que ninguém consegue conferir.
 *
 * O que ainda não está cadastrado aparece no próprio documento, em vez de
 * ser omitido. Um relatório que esconde a própria lacuna é pior do que um
 * relatório incompleto: ele passa confiança que não tem.
 */
export async function RelatorioDoMes(props: AdminViewServerProps) {
  const busca = props.searchParams ?? {}
  const escolhido = typeof busca.mes === 'string' ? busca.mes : mesAtual()
  const mes = /^\d{4}-\d{2}$/.test(escolhido) ? escolhido : mesAtual()

  const [dados, serie, loja] = await Promise.all([dreDoMes(mes), serieDeMeses(mes, 12), dadosDaLoja()])
  const { resumo, lacunas } = dados

  const custosOperacionais =
    resumo.cmv + resumo.custosVariaveis + resumo.despesasFixas + resumo.financeiras

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh', padding: '2.5rem 1.5rem' }}>
      <style>{`
        @media print {
          .lumini-sem-impressao { display: none !important; }
          @page { margin: 1.4cm; }
          body { background: #fff; }
        }
      `}</style>

      <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
        <div
          className="lumini-sem-impressao"
          style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem' }}
        >
          <BotaoImprimir />
          <a
            href={`/admin/dre?mes=${mes}`}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: 4,
              border: '1px solid #ddd',
              color: '#111',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Voltar ao painel
          </a>
        </div>

        <header style={{ borderBottom: '2px solid #111', paddingBottom: '1rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#777',
            }}
          >
            {loja.nome}
            {loja.cnpj ? ` · CNPJ ${loja.cnpj}` : ''}
          </p>
          <h1 style={{ margin: '0.4rem 0 0', fontSize: '1.8rem' }}>
            Resultado de {nomeDoMes(mes)}
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Emitido em {new Date().toLocaleDateString('pt-BR')} · valores por competência, pelo mês
            do pagamento
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
            background: '#eee',
            border: '1px solid #eee',
            margin: '1.75rem 0',
          }}
        >
          <Bloco titulo="Receita" valor={reais(resumo.receitaBruta)} apoio={`${resumo.pedidos} pedidos · ticket médio ${reais(resumo.ticketMedio)}`} />
          <Bloco
            titulo="Lucro do mês"
            valor={reais(resumo.resultado)}
            apoio={`margem líquida de ${resumo.margemLiquida.toLocaleString('pt-BR')}%`}
          />
          <Bloco
            titulo="Custos operacionais"
            valor={reais(custosOperacionais)}
            apoio="peças, taxas, frete, embalagem e despesas fixas"
          />
          <Bloco
            titulo="Investimento em tráfego"
            valor={reais(resumo.marketing)}
            apoio={
              resumo.marketing > 0
                ? `retorno de ${resumo.retornoSobreTrafego.toLocaleString('pt-BR')}x sobre a receita`
                : 'nenhum investimento lançado'
            }
          />
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Os últimos doze meses</h2>
          <GraficoDoAno
            pontos={serie.map((ponto) => ({
              mes: ponto.mes,
              receita: ponto.resumo.receitaBruta,
              resultado: ponto.resumo.resultado,
              marketing: ponto.resumo.marketing,
            }))}
          />
        </section>

        <section style={{ marginBottom: '2rem', breakInside: 'avoid' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Demonstração do resultado</h2>
          <TabelaDoDre resumo={resumo} />
        </section>

        {resumo.porCategoria.length > 0 && (
          <section style={{ marginBottom: '2rem', breakInside: 'avoid' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Por categoria</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd', color: '#666' }}>
                  <th style={{ textAlign: 'left', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Categoria
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Peças
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Receita
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Custo
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Lucro bruto
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.45rem 0.5rem', fontWeight: 400 }}>
                    Margem
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumo.porCategoria.map((linha) => (
                  <tr key={linha.categoria} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.45rem 0.5rem' }}>{linha.categoria}</td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>{linha.pecas}</td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                      {reais(linha.receita)}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                      {reais(linha.cmv)}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                      {reais(linha.lucroBruto)}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                      {linha.margem.toLocaleString('pt-BR')}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {resumo.marketingPorPlataforma.length > 0 && (
          <section style={{ marginBottom: '2rem', breakInside: 'avoid' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>Tráfego por canal</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                {resumo.marketingPorPlataforma.map((linha) => (
                  <tr key={linha.plataforma} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.45rem 0.5rem' }}>{linha.plataforma}</td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                      {reais(linha.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: '#666', fontSize: '0.82rem', marginTop: '0.6rem' }}>
              O retorno por canal mede o investimento contra a receita total do mês. A atribuição
              venda a venda depende do rastreamento de cada plataforma.
            </p>
          </section>
        )}

        <footer style={{ borderTop: '1px solid #ddd', paddingTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            <strong>Critério.</strong> Cada pedido entra no mês em que foi pago, e não no mês em
            que o dinheiro é liberado. O imposto é a alíquota efetiva do Simples Nacional sobre a
            receita, segregada por anexo. O custo das peças é o que estava gravado no pedido no dia
            da venda.
          </p>

          {lacunas.length > 0 && (
            <>
              <p style={{ margin: '0 0 0.3rem' }}>
                <strong>Ressalvas deste mês.</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {lacunas.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function Bloco({ titulo, valor, apoio }: { titulo: string; valor: string; apoio: string }) {
  return (
    <div style={{ background: '#fff', padding: '1.1rem 1.2rem' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
        }}
      >
        {titulo}
      </p>
      <p style={{ margin: '0.3rem 0 0.15rem', fontSize: '1.5rem', fontWeight: 600 }}>{valor}</p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{apoio}</p>
    </div>
  )
}

async function dadosDaLoja(): Promise<{ nome: string; cnpj: string | null }> {
  const payload = await getPayloadClient()

  const settings = (await payload
    .findGlobal({ slug: 'store-settings', depth: 0 })
    .catch(() => null)) as { legalName?: string | null; tradeName?: string | null; cnpj?: string | null } | null

  return {
    nome: settings?.tradeName ?? settings?.legalName ?? 'Lumini Aromas',
    cnpj: settings?.cnpj ?? null,
  }
}
