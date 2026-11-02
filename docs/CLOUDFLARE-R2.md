# R2 privado com login Supabase

Bucket informado: **storagelab**.
Worker publicado: **https://storage-lab-files.lagujf.workers.dev**.
A consulta sem sessão a `/lessons` retornou 401 e o preflight da origem do
GitHub Pages retornou 204. O upload autenticado ainda precisa ser testado pela
conta do proprietário no site. A configuração da conta e do bucket está
em `cloudflare/wrangler.toml`. O endereço S3 `r2.cloudflarestorage.com` não é
a URL que o navegador deve usar para carregar os arquivos da conta.

O `wrangler.toml` na raiz também aponta para essa API e o bucket, para que o
comando padrão `npx wrangler deploy` no Cloudflare Builds encontre a configuração
do Worker. Isso evita tentar publicar ou interpretar `vite.config.js` como se
fosse o backend. O frontend continua no GitHub Pages. O arquivo explícito em
`cloudflare/wrangler.toml` continua funcionando com `--config`.

O backend está preparado em [cloudflare/r2-worker.js](../cloudflare/r2-worker.js).
Ele verifica a sessão no Supabase e calcula a pasta a partir do ID verificado
do usuário. O navegador não escolhe outro proprietário e não recebe chaves S3.
Os arquivos e as fotos são privados. Alunos continuam entrando na sala sem conta.

## Publicar pelo painel

1. No Cloudflare, abra **Workers & Pages → Create application**.
2. Escolha um Worker JavaScript simples, como o modelo Hello World.
3. Dê o nome **storage-lab-files** e publique.
4. Em **Edit code**, substitua todo o código pelo conteúdo de
   `cloudflare/r2-worker.js` e publique a atualização.
5. Em **Bindings → Add binding → R2 bucket**, use o nome da variável **FILES**
   e selecione **storagelab**. Salve/publice a vinculação conforme o painel pedir.
6. Copie a URL HTTPS do Worker, terminada em `.workers.dev`.

Os valores públicos do projeto Supabase já estão no código; não é necessário
cadastrar uma senha ou chave privada. Se o projeto Supabase mudar, atualize as
variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no Worker. Nunca use
`service_role` ou chave secreta no código do navegador.

Como alternativa para quem já usa a CLI, o arquivo Wrangler está pronto:

```powershell
npx wrangler login
npx wrangler deploy --config cloudflare/wrangler.toml
```

## Conectar o site

O `.env.local` foi configurado com o Worker publicado. O Vite recarrega essa
configuração; se estiver usando outro processo antigo, reinicie-o.
O workflow do GitHub Pages já usa essa URL como padrão. Uma variável
`VITE_R2_API_URL` em **Settings → Secrets and variables → Actions → Variables**
pode sobrescrevê-la; mantenha-a atualizada ou remova um valor antigo. Envie as
alterações do workflow ao GitHub para gerar o novo build/publicação. Sem essa URL,
o site continua usando o Supabase Storage e requer seu SQL de configuração.

Não ative acesso público ao bucket ou `r2.dev`. Os pedidos usam o token do
login Supabase no cabeçalho Authorization. A lista de origens permitidas já
inclui localhost e o GitHub Pages deste projeto; outros domínios precisam ser
incluídos em `ALLOWED_ORIGINS` no Worker.

## Uso e limites

- **Salvar na nuvem** envia uma aula com músicas, imagens e modelos incorporados,
  comprimida quando houver economia. O arquivo enviado tem limite de 50 MB.
- **Na minha conta → Atualizar arquivos** lista apenas a pasta do professor.
- **Abrir cópia no editor** cria uma cópia local, sem substituir outras aulas.
- **Editar perfil** pode guardar a foto otimizada no mesmo bucket privado.
- O último envio da mesma aula substitui sua versão na nuvem. Não há mesclagem
  automática de edições feitas em computadores diferentes.

O R2 Standard inclui uma franquia mensal de 10 GB-mês e limites de operações.
É necessário ativar a assinatura no checkout; há cobrança de excedentes.
Esta tarefa não cadastrou cartão nem ativou faturamento. A publicação real do
Worker depende da sessão administrativa do proprietário no Cloudflare.

Os testes locais exercitam autenticação, isolamento de pastas e limites com um
bucket simulado. Eles não comprovam que o Worker foi publicado ou vinculado
ao bucket real. Para conferir, entre em uma conta, salve uma aula e abra a mesma
conta em outro dispositivo; outra conta não deve listar os mesmos arquivos.

Referências oficiais:
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/workers-api/
