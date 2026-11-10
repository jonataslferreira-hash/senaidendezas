# Ativar Storage AI

A página Storage AI fica no menu lateral. Ela usa a sessão Supabase da pessoa e chama o Worker `storage-lab-files`. As fotos e o texto fornecidos para geração são enviados ao modelo pelo Worker. As aulas geradas abrem no editor e ficam na biblioteca com elementos editáveis. O editor envia o contexto do slide, a seleção indicada e as mensagens recentes do painel.

## Cloudflare

1. Confirme que o plano da conta para Workers é **Workers Free**. Em `cloudflare/wrangler.toml`, adicione `STORAGE_AI_FREE_CONFIRMED = "true"` dentro da seção `[vars]`. Enquanto a variável estiver ausente, o endpoint recusa a geração.
2. Na raiz do projeto, rode `npx wrangler login` e depois `npx wrangler deploy --config cloudflare/wrangler.toml`. A configuração liga `AI` ao Workers AI, `AI_LIMIT` ao limite de chamadas e mantém `FILES` no bucket `storagelab`.
3. Abra a [verificação do Worker](https://storage-lab-files.lagujf.workers.dev/health). Procure `version: 7` e `storageAI: true`. Esse status confirma os bindings e a variável. Para conferir a inferência, entre na conta pelo site e peça uma aula de um slide.
4. Envie as alterações ao GitHub. Em **Settings → Pages**, use **GitHub Actions** como fonte e acompanhe a publicação na aba **Actions**. O workflow aponta para o endereço do Worker. Para rodar localmente, confira `VITE_R2_API_URL` no arquivo `.env.local`.

## Confirmação de cadastro

No Supabase, em **Authentication → URL Configuration**, defina o **Site URL** como `https://jonataslferreira-hash.github.io/senaidendezas/`. Inclua essa URL e `http://localhost:5173/` em **Redirect URLs**. Se usar convites com parâmetros, permita também as variantes com parâmetros conforme a documentação de URLs de retorno. Em **Email Templates**, o link de confirmação precisa usar `{{ .ConfirmationURL }}` ou um modelo que respeite `{{ .RedirectTo }}`. Envie um novo e-mail para conferir o resultado. [URLs de retorno do Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

O Worker limita o uso por conta e por localização do Cloudflare. O frontend não recebe credenciais do modelo.

## Usar a franquia gratuita

Mantenha o plano **Workers Free** na conta Cloudflare. O Workers AI fornece 10.000 Neurons por dia, compartilhados pelos usuários do site. Ao esgotar a franquia, as novas gerações falham até o próximo ciclo. No plano Workers Paid, o excedente é cobrado. Confira os limites em **Workers AI → Analytics** no painel.

O modelo roda no serviço Workers AI. O Worker verifica a sessão Supabase, limita o volume de pedidos e encaminha o texto e até três fotos redimensionadas. Fotos continuam contando no consumo de inferência.

[Preços do Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)
