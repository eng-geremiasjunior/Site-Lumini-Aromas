import { consentimentoInicial, destinosConfigurados, VERSAO_DO_AVISO } from '../../../commerce/marketing/google-tag.ts'

/**
 * A única tag do Google na loja.
 *
 * Sai do servidor já montada, em dois blocos e nesta ordem, que não é
 * negociável:
 *
 *   1. o estado de consentimento, definido **antes** de o gtag carregar;
 *   2. o gtag em si, apontando para a propriedade e para a conta de anúncios.
 *
 * Invertida, a ordem faz o Google gravar cookie de publicidade no primeiro
 * milissegundo da visita, antes de qualquer aceite — que é exatamente o que
 * a LGPD proíbe e o que uma auditoria encontra primeiro.
 *
 * A leitura da escolha já gravada acontece no navegador, e não aqui, para a
 * página continuar podendo ser servida do cache: se dependesse de ler o
 * cookie no servidor, toda página da loja viraria dinâmica por causa do
 * aviso de cookies.
 */
export function GoogleTag() {
  const destinos = destinosConfigurados({
    ga4: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
    ads: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
    conversaoDeCompra: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSAO_COMPRA,
  })

  // Sem identificador configurado, nada é carregado. É o estado normal em
  // desenvolvimento, e evita o erro clássico de sujar os dados de produção
  // com visitas de teste.
  if (!destinos.ga4 && !destinos.ads) return null

  const principal = destinos.ga4 ?? destinos.ads

  const configuracoes = [
    destinos.ga4 ? `gtag('config','${destinos.ga4}');` : '',
    // `allow_enhanced_conversions` deixa o gtag aceitar os dados do
    // comprador que a página de confirmação envia, já com hash.
    destinos.ads ? `gtag('config','${destinos.ads}',{allow_enhanced_conversions:true});` : '',
  ].join('')

  const inicio = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;
gtag('consent','default',${JSON.stringify(consentimentoInicial())});
try{
  var c=document.cookie.match(/(?:^|; )lumini_consentimento=([^;]*)/);
  if(c){
    var e=JSON.parse(decodeURIComponent(c[1]));
    if(e&&e.versao===${JSON.stringify(VERSAO_DO_AVISO)}){
      var p=e.publicidade?'granted':'denied';
      gtag('consent','update',{ad_storage:p,ad_user_data:p,ad_personalization:p,analytics_storage:e.analise?'granted':'denied'});
    }
  }
}catch(_){}
gtag('js',new Date());
${configuracoes}
`.trim()

  return (
    <>
      <script id="lumini-consent" dangerouslySetInnerHTML={{ __html: inicio }} />
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${principal}`} />
    </>
  )
}
