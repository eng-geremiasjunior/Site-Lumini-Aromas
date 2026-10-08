# As tarefas agendadas, e por que elas saíram do `vercel.json`

As duas tarefas que faziam a loja funcionar sozinha estavam declaradas assim:

```json
"crons": [
  { "path": "/tarefas/caixa-de-saida",        "schedule": "*/5 * * * *" },
  { "path": "/tarefas/carrinhos-abandonados", "schedule": "0 * * * *" }
]
```

**O plano Hobby da Vercel aceita no máximo uma execução por dia.** Com um
agendamento de cinco em cinco minutos, o deploy inteiro é recusado — não é
um aviso, é erro de publicação.

Como hoje nenhuma das duas tem o que fazer (os e-mails dependem do Resend,
que ainda não tem credencial), elas saíram para o primeiro deploy poder
acontecer. As rotas continuam existindo em `src/app/tarefas/` e respondem
normalmente se forem chamadas.

## Como devolver, no dia do plano Pro

Basta repor o bloco acima no `vercel.json`. Os caminhos e os horários são
estes:

| Caminho | Quando | Para quê |
|---|---|---|
| `/tarefas/caixa-de-saida` | a cada 5 minutos | entrega e-mails, eventos da Meta e do Google, emissão de cartão-presente |
| `/tarefas/carrinhos-abandonados` | a cada hora | marca o carrinho como abandonado e agenda os lembretes |

Cinco minutos não é capricho: é o intervalo que faz a confirmação de pedido
chegar enquanto a cliente ainda está na página de obrigado. Uma vez por dia
transformaria "pagamento aprovado" em notícia do dia seguinte.

Enquanto o Pro não vem, as duas podem ser disparadas à mão abrindo os
endereços no navegador, já autenticado no painel.
