import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { mesAtual } from '../../commerce/finance/coletar.ts'
import { categoriasDeMarketing } from './acoes.ts'
import { FormularioDeImportacao } from './Formulario.tsx'

/**
 * Importar anúncios.
 *
 * A resposta para "tem mês que nem sei quanto gastei": os números já existem
 * no Gerenciador de Anúncios, e o trabalho de trazê-los para cá é uma
 * colagem por mês — não um formulário por campanha.
 *
 * Cada campanha vira um lançamento no financeiro, com o que ela entregou
 * junto. O custo do tráfego entra no resultado do mês pelo mesmo caminho de
 * qualquer despesa, e o custo por clique e por resultado passam a existir
 * lado a lado com a receita.
 */
export async function ImportarAnuncios(props: AdminViewServerProps) {
  const categorias = await categoriasDeMarketing()

  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={props.params}
      payload={props.initPageResult.req.payload}
      permissions={props.initPageResult.permissions}
      searchParams={props.searchParams}
      user={props.initPageResult.req.user ?? undefined}
      visibleEntities={props.initPageResult.visibleEntities}
    >
      <Gutter>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Importar anúncios</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--theme-elevation-600)' }}>
            Uma colagem por mês, por plataforma. Sem digitar campanha por campanha.
          </p>
        </header>

        {categorias.length === 0 ? (
          <p>
            Antes é preciso ter ao menos uma categoria financeira de tráfego. Crie em{' '}
            <a href="/admin/collections/finance-categories">Categorias financeiras</a>, com o
            grupo “Tráfego e divulgação”.
          </p>
        ) : (
          <FormularioDeImportacao categorias={categorias} mesPadrao={mesAtual()} />
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
