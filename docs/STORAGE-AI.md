# Ativar Storage AI

A página Storage AI fica no menu lateral. Ela usa a sessão Supabase da pessoa e chama o Worker `storage-lab-files`. As fotos e o texto fornecidos para geração são enviados ao modelo pelo Worker. As aulas geradas abrem no editor e ficam na biblioteca com elementos editáveis. O editor envia o contexto do slide, a seleção indicada e as mensagens recentes do painel.

## Cloudflare

1. Confirme que o plano da conta para Workers é **Workers Free**. Em `cloudflare/wrangler.toml`, adicione `STORAGE_AI_FREE_CONFIRMED = "true"` dentro da seção `[vars]`. Enquanto a variável estiver ausente, o endpoint recusa a geração.
2. Na raiz do projeto, rode `npx wrangler login` e depois `npx wrangler deploy --config cloudflare/wrangler.toml`. A configuração liga `AI` ao Workers AI, `AI_LIMIT` ao limite de chamadas e mantém `FILES` no bucket `storagelab`.
3. Abra a [verificação do Worker](https://storage-lab-files.lagujf.workers.dev/health). Procure `version: 20`, `storageAI: true` e `imageSearch: true`. Esse status confirma os bindings e a variável. Para conferir a inferência, entre na conta pelo site e peça uma aula de um slide.
4. Envie as alterações ao GitHub. Em **Settings → Pages**, use **GitHub Actions** como fonte e acompanhe a publicação na aba **Actions**. O workflow aponta para o endereço do Worker. Para rodar localmente, confira `VITE_R2_API_URL` no arquivo `.env.local`.

## Confirmação de cadastro

No Supabase, em **Authentication → URL Configuration**, defina o **Site URL** como `https://jonataslferreira-hash.github.io/senaidendezas/`. Inclua essa URL e `http://localhost:5173/` em **Redirect URLs**. Se usar convites com parâmetros, permita também as variantes com parâmetros conforme a documentação de URLs de retorno. Em **Email Templates**, o link de confirmação precisa usar `{{ .ConfirmationURL }}` ou um modelo que respeite `{{ .RedirectTo }}`. Envie um novo e-mail para conferir o resultado. [URLs de retorno do Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

O Worker limita o uso por conta e por localização do Cloudflare. O frontend não recebe credenciais do modelo.

## IA hospedada e gratuita (OpenRouter)

O modelo roda fora do seu computador, no serviço do OpenRouter, e não precisa de cartão de crédito nem de saldo.

1. Crie uma conta em [openrouter.ai](https://openrouter.ai) e gere uma chave em **Settings → API Keys**. A conta free já permite usar os modelos `:free` sem comprar créditos.
2. Guarde a chave como segredo do Worker:

   ```bash
   npx wrangler secret put OPENROUTER_API_KEY --config cloudflare/wrangler.toml
   ```

3. Publique o Worker: `npx wrangler deploy --config cloudflare/wrangler.toml`.

### Modelo escolhido

O padrão é **`openrouter/free`**, o roteador que escolhe, entre os modelos gratuitos disponíveis, um que aceite JSON e imagens. As reservas, na ordem, são `google/gemma-4-31b-it:free` e `nvidia/nemotron-3.5-lightning:free`. Para trocar, use a variável `OPENROUTER_MODEL` com os modelos separados por vírgula:

```toml
[vars]
OPENROUTER_MODEL = "openrouter/free,google/gemma-4-31b-it:free"
```

### Cota diária e avisos

As variantes `:free` têm cota padrão de **50 chamadas por dia e 20 por minuto** enquanto a conta não tiver créditos comprados (a cota sobe para 1000 por dia a partir de 10 créditos). [Limites do OpenRouter](https://openrouter.ai/docs/api-reference/limits)

O Worker cuida disso para você:

- **Antes de chamar**, ele consulta a cota em `GET /api/v1/key` e recusa o pedido quando o dia já acabou. Nenhuma chamada é gasta à toa.
- **O saldo aparece no chat**, embaixo do campo de mensagem: "X de 50 chamadas gratuitas hoje".
- **O limite por minuto** vira o aviso "A IA está ocupada no momento", sem desligar o recurso.
- **O pedido é preservado**: quando a cota acaba, o texto volta para o campo e a conversa ganha o botão **Tentar de novo**.
- **Pedidos repetidos não gastam cota**: a resposta fica no cache do Worker por dez minutos, então clicar em gerar de novo com o mesmo texto devolve o mesmo resultado.

A cota é da conta do OpenRouter, não da pessoa: com a chave compartilhada, o saldo é dividido entre todos os usuários do site.

### Usar a franquia gratuita do Workers AI

Mantenha o plano **Workers Free** na conta Cloudflare. O Workers AI fornece 10.000 Neurons por dia e continua como reserva quando o OpenRouter não responde. Confira os limites em **Workers AI → Analytics** no painel.

O Worker verifica a sessão Supabase, limita o volume de pedidos e encaminha o texto e até três fotos redimensionadas. Fotos continuam contando no consumo de inferência.

[Preços do Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## Busca de imagens livres

A busca dentro do editor usa o endpoint `GET /storage-ai/images` do Worker, que reúne três catálogos gratuitos e sem chave:

- **Wikimedia Commons**, com a licença e a autoria de cada arquivo.
- **Wikipédia** (pt e en), que traz a imagem principal do artigo do assunto. É o que faz "Microsoft Copilot AI" devolver o artigo do Copilot e a foto do Copilot em uso.
- **Openverse**, que agrega imagens Creative Commons de vários sites.

Cada resultado mostra a **origem** (o link da página do arquivo) e a **licença** quando a informação existe. As imagens sem licença conhecida são aceitas e exibidas sem ela.

PDFs, DJVUs, TIFFs escaneados e outros documentos são descartados antes do ranqueamento, tanto no Worker quanto na busca direta. Pedidos de logo/ícone preferem SVG e PNG, e imagens em formato de slide (paisagem) ganham prioridade.

A Custom Search JSON API do Google foi fechada para novos clientes e encerra em 1º de janeiro de 2027, por isso ela não é usada. [Documentação do Google](https://developers.google.com/custom-search/v1/overview)

O Worker guarda as respostas em cache por trinta minutos e serve o arquivo original por um proxy próprio, o que evita o bloqueio de CORS de sites como o Flickr e permite usar logotipos em SVG, convertidos para PNG pelo navegador.

## Interface do Storage AI

- **O que editar** fica em uma barra compacta colada no topo da caixa de texto, mostrando o que está selecionado agora ("Imagem · Camada 8"). Clicar abre os botões de escopo (slide inteiro ou seleção) e a ficha do elemento; ao começar a escrever, o painel recolhe sozinho para o chat ganhar espaço.
- **Paleta de cores**: na prévia, antes de confirmar, há uma fileira de paletas. Escolher uma aplica o novo visual em todos os slides da aula.
- **Cota à vista**: embaixo do campo de mensagem aparece "X de 50 chamadas gratuitas hoje". Quando o dia acaba, o texto volta para o campo e a conversa ganha o botão **Tentar de novo**.
- O envio mostra apenas o botão girando; não há mais texto "Editando…" embaixo do chat.

## Qualidade dos slides

- Toda aula gerada começa com uma **capa**: o nome da aula, a descrição e, quando existe, uma imagem do tema.
- **Cores pedidas no texto são respeitadas**: "azul, verde pastel e rosa pastel" vira a paleta `pastel`, que mostra as três cores nas formas de apoio. "rosa" usa `rose`, "verde" usa `sage`, "azul" usa `ocean`, "roxo" usa `iris`, "preto/escuro" usa `midnight` e assim por diante. Pedir "um padrão de cor para todos" mantém a mesma paleta em todas as páginas.
- **Fonte pedida**: "fonte do Windows 11", "Segoe UI" ou "fonte do Windows" aplica `Segoe UI` em títulos e corpo.
- **Contraste**: a cor de cada texto é conferida contra o fundo. Se o título ficaria com contraste baixo, ele é trocado por uma cor legível. As formas decorativas são posicionadas só em áreas livres e nunca atrás de título, corpo ou foto, então o texto não fica da cor do símbolo.
- O símbolo ✦, os círculos pastel, os anéis, as linhas e os losangos são formas normais do editor: dá para mover, recolorir ou apagar.
- A **miniatura da biblioteca** é gerada a partir da capa assim que a aula é criada, inclusive para aulas da IA, e enviada junto com o arquivo para a nuvem.
- No editor, **Adicionar forma → Ícones de objetos** traz 24 ícones de traço (monitor, notebook, teclado, mouse, nuvem, ideia, robô, engrenagem, pasta, mundo, cadeado, Wi-Fi, bateria, foguete, processador, banco de dados, servidor, câmera, celular, impressora, energia, rede neural, gráfico e local). Eles mudam de cor pelo campo "Cor da forma" e a espessura pelo campo de borda.
- Antes de aceitar uma foto, o app confere se o título/arquivo combina com o assunto. Palavras ambíguas (windows, office, apple, conclusion) nunca bastam sozinhas — no Commons "windows" devolve janelas de prédios. Se nada combinar, o slide fica sem foto em vez de ganhar uma imagem sem relação.
- Pedidos em português são traduzidos antes da busca ("área de trabalho do windows" → "desktop windows"; "sistemas operacionais" → "operating systems").

O prompt pede título de até 7 palavras, corpo de 2 a 4 linhas curtas, sem markdown e com uma ideia por slide. O aplicativo ainda limpa marcação que a IA devolve, corta o texto que não cabe no quadro e informa a origem das imagens no último slide, em **Referências**.
