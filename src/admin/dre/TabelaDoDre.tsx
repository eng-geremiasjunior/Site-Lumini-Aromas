import type { ResumoDoDre } from '../../commerce/finance/dre.ts'
import { percentual } from '../../commerce/finance/dre.ts'
import { reais } from './Graficos.tsx'

/**
 * O DRE em forma de tabela.
 *
 * A coluna de porcentagem é análise vertical: cada linha sobre a receita
 * bruta. É ela que permite comparar setembro com março sem se perder no
 * tamanho do mês — 40% de custo é 40% tendo vendido R$ 10 mil ou R$ 50 mil.
 *
 * As linhas de subtotal aparecem destacadas porque são onde a leitura
 * realmente para: lucro bruto, margem de contribuição e resultado.
 */
export function TabelaDoDre({ resumo }: { resumo: ResumoDoDre }) {
  const base = resumo.receitaBruta

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
      <thead>
        <tr>
          <th style={{ ...celula, textAlign: 'left', color: 'var(--theme-elevation-600)' }}>
            Demonstração do resultado
          </th>
          <th style={{ ...celula, textAlign: 'right', color: 'var(--theme-elevation-600)' }}>
            Valor
          </th>
          <th
            style={{
              ...celula,
              textAlign: 'right',
              width: '5.5rem',
              color: 'var(--theme-elevation-600)',
            }}
          >
            % da receita
          </th>
        </tr>
      </thead>

      <tbody>
        <Linha rotulo="Venda de produtos" valor={resumo.receitaDeProdutos} base={base} />
        <Linha rotulo="Frete cobrado" valor={resumo.receitaDeFrete} base={base} />
        {resumo.outrasReceitas > 0 && (
          <Linha rotulo="Outras entradas" valor={resumo.outrasReceitas} base={base} />
        )}
        <Linha rotulo="Receita bruta" valor={resumo.receitaBruta} base={base} total />

        <Linha rotulo="Descontos e devoluções" valor={-resumo.deducoes} base={base} />
        <Linha rotulo="Simples Nacional" valor={-resumo.imposto} base={base} />
        <Linha rotulo="Receita líquida" valor={resumo.receitaLiquida} base={base} total />

        <Linha rotulo="Custo das peças produzidas" valor={-resumo.cmv} base={base} />
        <Linha rotulo="Lucro bruto" valor={resumo.lucroBruto} base={base} total destaque />

        <Linha rotulo="Taxa do meio de pagamento" valor={-resumo.taxaDePagamento} base={base} />
        <Linha rotulo="Frete pago" valor={-resumo.fretePago} base={base} />
        <Linha rotulo="Embalagem de envio" valor={-resumo.embalagem} base={base} />
        {resumo.outrosVariaveis > 0 && (
          <Linha rotulo="Outros custos de venda" valor={-resumo.outrosVariaveis} base={base} />
        )}
        <Linha
          rotulo="Margem de contribuição"
          valor={resumo.margemDeContribuicao}
          base={base}
          total
        />

        {resumo.marketingPorPlataforma.map((linha) => (
          <Linha
            key={linha.plataforma}
            rotulo={`Tráfego — ${linha.plataforma}`}
            valor={-linha.valor}
            base={base}
          />
        ))}
        {resumo.marketingPorPlataforma.length === 0 && (
          <Linha rotulo="Tráfego" valor={-resumo.marketing} base={base} />
        )}

        <Linha rotulo="Despesas fixas" valor={-resumo.despesasFixas} base={base} />
        {resumo.financeiras > 0 && (
          <Linha rotulo="Juros e tarifas" valor={-resumo.financeiras} base={base} />
        )}

        <Linha rotulo="Resultado do mês" valor={resumo.resultado} base={base} total destaque />
      </tbody>
    </table>
  )
}

const celula: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  borderBottom: '1px solid var(--theme-elevation-100)',
  textAlign: 'left',
  fontWeight: 400,
}

function Linha({
  rotulo,
  valor,
  base,
  total,
  destaque,
}: {
  rotulo: string
  valor: number
  base: number
  total?: boolean
  destaque?: boolean
}) {
  // Valor zerado em linha de custo ainda aparece: saber que a embalagem
  // não está sendo contada vale mais do que uma tabela enxuta.
  const negativo = valor < 0

  return (
    <tr
      style={{
        background: total ? 'var(--theme-elevation-50)' : undefined,
        fontWeight: total ? 600 : 400,
      }}
    >
      <td style={{ ...celula, fontSize: destaque ? '1rem' : undefined }}>{rotulo}</td>
      <td
        style={{
          ...celula,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: negativo ? 'var(--theme-elevation-600)' : undefined,
        }}
      >
        {negativo ? `(${reais(Math.abs(valor))})` : reais(valor)}
      </td>
      <td
        style={{
          ...celula,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--theme-elevation-600)',
        }}
      >
        {percentual(Math.abs(valor), base).toLocaleString('pt-BR')}%
      </td>
    </tr>
  )
}
