# Prévia de links e datas do chat

O chat direto e o chat da aula mostram as mensagens em ordem cronológica, agrupadas pelo dia no fuso do navegador. Texto em envio é mostrado imediatamente como pendente; caso falhe, o rascunho fica no campo para nova tentativa. Os últimos 100 itens são carregados, como antes.

As prévias de YouTube (incluindo links curtos, Shorts e incorporações), Vimeo e Spotify buscam dados públicos dos respectivos provedores por meio do Worker, apenas quando o cartão fica visível. Quando o provedor ou o Worker não responde, o link continua acessível com um cartão simples. Links de outros sites são apresentados com nome/endereço genérico: o Worker **não busca URLs arbitrárias**, evitando enviar links privados a terceiros e evitando requisições a endereços internos. Miniaturas e metadados de conteúdo removido, privado ou bloqueado podem não estar disponíveis.

## Publicação

Publique o site e a versão atualizada do Worker `storage-lab-files`. Para publicar pelo painel Cloudflare, substitua o código completo pelo arquivo `cloudflare/worker-ready.js` e clique em **Deploy**, preservando todos os bindings e secrets existentes, inclusive `CLASSROOM_IDENTITY_SECRET`. O endpoint de metadados exige usuário autenticado; não é necessário segredo novo ou migração SQL. Antes de atualizar o Worker, o chat continuará mostrando cartões simples, sem título/canal carregados pelo novo endpoint.

Spotify retorna capas em domínios oficiais `image-cdn-*.spotifycdn.com` (prefixo regional de duas letras); são permitidas apenas imagens HTTPS nesses domínios e em `i.scdn.co`. A capa fica quadrada. Quando os metadados não puderem ser obtidos, o cartão indica “Prévia indisponível”, sem inventar título ou artista. Algumas prévias locais podem falhar por CORS se a origem da prévia não estiver em `ALLOWED_ORIGINS` do Worker; não adicione origens que não sejam confiáveis.
