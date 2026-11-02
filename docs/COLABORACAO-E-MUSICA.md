# Colaboração, apresentação e música

O código está implementado localmente. A colaboração entre contas exige ativar
o SQL e publicar o Worker atualizado. O envio de convites exige também um
provedor de e-mail. Os testes com serviços simulados não ativam esses serviços.

## Ativar colaboração e convites

1. No Supabase, execute todo o arquivo `supabase/collaboration.sql` no SQL Editor.
   Ele cria grupos, membros, convites, versões e políticas privadas do Realtime.
2. Em Authentication → URL Configuration → Redirect URLs, permita
   `https://jonataslferreira-hash.github.io/senaidendezas/**` e, para testes,
   `http://localhost:5173/**`.
3. Envie os arquivos novos ao GitHub, incluindo `cloudflare`, `src` e o lockfile.
   Publique o Worker com `npx wrangler deploy --config cloudflare/wrangler.toml`.
   A binding `FILES` continua apontando para `storagelab`. Atualize o Pages.
4. Entre na conta, abra a aula e clique em Colaborar. Informe o e-mail do colega.
   O convite expira em sete dias e só a conta correspondente pode aceitá-lo.
   Quem ainda não tem conta pode se cadastrar pelo link. Até 30 pessoas por grupo.

O documento usa Yjs para combinar alterações, canais privados do Supabase para
edição e presença e R2 para arquivos. O banco guarda permissões e referências.
O salvamento combina a versão mais recente antes de publicar. Revisões antigas
são removidas após confirmar a nova versão; uma falha de limpeza pode deixar
um objeto órfão. “Salvo no grupo” confirma a gravação. Enquanto houver falha ou
alterações pendentes, mantenha a aba aberta ou exporte JSON. Desfazer é reiniciado
ao receber edição remota para evitar restaurar conteúdo antigo sobre o colega.

No Cloudflare → Worker → Settings → Variables and Secrets, configure:

- `RESEND_API_KEY`: Secret do provedor, nunca no frontend ou GitHub.
- `INVITE_FROM`: remetente autorizado, como `Storage Lab <convites@seu-dominio.com>`.
- `SITE_URL`: `https://jonataslferreira-hash.github.io/senaidendezas/`.

Sem e-mail configurado, a interface oferece o link para copiar e informa que não
enviou mensagem. Um endereço Gmail arbitrário não substitui remetente verificado.
Referências: [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls),
[Resend](https://resend.com/docs/send-with-nodejs).

## Apresentar sem login

No editor, Compartilhar → Criar link de apresentação publica uma cópia com
acesso por link. O autor precisa estar conectado para publicar ou desativar.
Quem receber pode apresentar e conectar uma turma sem login, sem editar o
original. Notas do professor são retiradas. Mudanças posteriores exigem outra
publicação. Desativar link remove a publicação atual. Qualquer pessoa com o
link ativo pode ler o conteúdo; use esse modo para material compartilhável.

O link curto e revogável exige republicar o Worker, incluindo `presentation-worker.js`.
Usa a binding FILES existente, sem novo SQL. Confira o envio real após atualizar
o Worker e o Pages; os testes automatizados usam respostas simuladas.

Se o Worker ainda responder 404, aulas leves (até 18 KB comprimidos) geram
um link portátil, com o conteúdo no fragmento da URL. Ele não exige servidor,
mas exige o frontend atualizado no aparelho de destino. O diálogo informa que
cópias enviadas não podem ser revogadas. Arquivos maiores continuam exigindo
o Worker atualizado. Nenhum token de sessão ou nota é colocado no link.

## Música no editor

As cinco faixas fornecidas usam os links MP3 originais, sem copiar áudio para
o repositório ou R2. A disponibilidade depende dessas fontes. As capas de Wii
Play, Wii Party e Wii U fornecidas estão incluídas, exibidas em quadrado com
corte central. O CD usa a cor média da capa.

O volume inicial é 4%, velocidade 0,85× com alteração de tom para slowed.
O player tem play/pause, anterior/próxima, duração e playlist. Uploads pessoais
de até 25 MB ficam no IndexedDB deste navegador, separados da música dos
slides e quiz. Os alunos não escutam a música pessoal. Se o navegador bloquear
autoplay, clique em play.

Spotify consulta o oEmbed público diretamente, sem login, SQL ou Worker da
colaboração. Se os metadados falharem, mantém o link válido e o player oficial.
Spotify não fornece MP3 para download/slowed nem controle de volume na API do
embed; use os controles oficiais e do dispositivo. Artista e duração nem sempre
estão disponíveis fora do player. O Worker ainda oferece a integração opcional
com `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` (Secret), para uso futuro.
Referências: [oEmbed](https://developer.spotify.com/documentation/embeds/tutorials/using-the-oembed-api),
[player oficial](https://developer.spotify.com/documentation/embeds/references/iframe-api).

Capas fornecidas: [Wii Play](https://cdn2.steamgriddb.com/thumb/a2e143ada7aa2289bacd6df379582c34.jpg),
[Wii Party](https://lambda.vgmtreasurechest.com/soundtracks/wii-party/coverart.jpg),
[Wii U](https://lambda.vgmtreasurechest.com/soundtracks/wii-u-system-audio-background-music/wii-u.jpg).

## Interface, movimento e foto

O editor usa a largura da tela sem a navegação lateral. Voltar e o histórico do
navegador retornam à biblioteca. O menu de três pontos altera título e descrição.
Colaborar, Compartilhar, Prévia e Apresentar ficam juntos. Entrar volta ao topo.

A demonstração inicia quando a caixa aparece e alterna Crie/Conecte/Interaja a
cada 4,2 segundos, com transições. “Ganhar vida” digita, pausa, apaga e troca de fonte com cursor, mantendo a frase completa por 4,5 segundos antes de apagar. Fora da tela ou com a aba oculta, os temporizadores
param. Movimento reduzido conserva as trocas de conteúdo sem deslocamentos.

O recorte aceita zoom acima de 4×, arraste livre, pinça, roda e botões. A pinça
mantém o ponto sob os dedos. Centralizar reinicia o enquadramento. Arrastar além
da imagem pode deixar parte transparente. Câmera requer autorização e HTTPS ou
localhost. Salvar outra foto sobrescreve o caminho fixo da conta; uma migração
do caminho antigo remove a cópia anterior depois de salvar os metadados.

PC e celulares não precisam estar na mesma rede: salas usam PeerJS/WebRTC com
STUN e TURN públicos. Rede escolar ou operadora podem bloquear conexões. Teste
PC no Wi-Fi do Senai e celular no 4G/5G antes da aula. Use o site publicado;
localhost não abre em outro aparelho. O QR local usa a URL pública padrão,
exceto nos testes de sinalização local.
Referências: [PeerJS](https://peerjs.com/client/faq),
[TURN](https://webrtc.org/getting-started/turn-server).

## Verificação

`npm test` verifica combinação concorrente, validações, recorte e Worker.
`npm run test:light` usa um worker, sem WebGL, para perfil, player, colaboração
simulada, apresentação pública, animações e aluno no servidor local.
`npm run build` e `node test/production-smoke.mjs` verificam o build no
subdiretório do Pages. Isso não substitui testar os serviços reais publicados.

A preferência da conta tem prioridade sobre o sistema: desmarcar reduzir
animações habilita movimento completo; marcar reduz. Sem conta, o site segue
o sistema. Minha conta → Diagnóstico de desempenho mede quatro segundos da
aba real e informa preferências, animação efetiva, escala e intervalos de quadros.
O relatório exclui credenciais e conteúdo das aulas.

## Perfil, estilos e contas

Minha Conta concentra a aparência; Editar Perfil concentra nome, foto, oito
cores, estilos Clássico/Liquid Glass/Frutiger Aero/Minimalista e movimento. A preferência de cor e estilo
é salva nos metadados da conta e volta ao entrar. As cores do espaço não
alteram o conteúdo desenhado pelo autor nos slides.

Adicionar outra conta mantém até oito sessões neste navegador. Trocar usa o
SDK do Supabase e renova a sessão quando necessário. Nenhuma senha é salva.
Sair remove a sessão atual da lista; remover outra conta da lista não encerra
sessões em outros dispositivos. Uma sessão expirada pode pedir novo login.
Antes de trocar, o rascunho local é salvo ou a versão colaborativa é persistida;
se isso falhar, a troca é interrompida para preservar a edição.

## Enquadrar imagens do slide

No editor visual, selecione a imagem e clique em Enquadrar imagem. Arraste
para mover seu conteúdo dentro da moldura. Pinça, roda e botões controlam o
zoom. A moldura permanece parada; o enquadramento é preservado ao salvar,
exportar, apresentar e colaborar. Restaurar imagem reinicia pan e zoom.
O zoom aceita até 1000×; pan permite deixar áreas vazias. O arquivo original
é preservado para permitir restaurar ou editar o recorte depois.

## Chat da aula

Para instalar de uma vez, execute todo `supabase/setup-chat.sql` no SQL Editor.
Ele inclui colaboração e chat. Se a colaboração já está instalada, pode executar
somente `supabase/chat.sql`.
O chat usa banco e Realtime do Supabase; não depende de mudança no Worker R2.
Publique também o frontend. Os testes entre duas contas usam serviços simulados,
portanto ainda é necessário conferir a instalação real após executar o SQL.

Abra Chat na barra lateral ou nos botões do editor. Escolha uma aula
compartilhada. Somente colaboradores autorizados podem ler ou enviar mensagens.
A conversa recupera as últimas 100 mensagens; ao editar essa mesma aula é
possível citar o slide atual. A referência permite voltar ao slide citado.
O nome é atribuído no servidor com a conta autenticada, e os textos aparecem
como texto simples. Se um slide citado for excluído, o chat informa isso.
Mensagens e histórico ficam no banco; o SQL inclui RLS e publicação de Realtime.

## Contatos, identidade visual e avatares animados

O arquivo setup-chat.sql atualizado também inclui social-chat.sql: solicitações
por e-mail exato, aceite pelo destinatário, mensagens diretas e leitura. Sem
aceite, não há envio de mensagens diretas. A busca exige conta autenticada e
só retorna uma conta confirmada para o endereço informado. O badge soma
solicitações recebidas e mensagens não lidas. As permissões de contato não
concedem permissão para editar aulas: colaboração continua com convites próprios.
O chat do editor abre o contexto da aula atual; aulas locais precisam ganhar
colaboradores antes de trocar mensagens. O chat lateral oferece pessoas e aulas.

Clássico, Liquid Glass, Frutiger Aero e Minimalista usam o mesmo sistema de cores
na navegação, menus, editor, formulários, player e controles da apresentação.
Cores e estilos são metadados do perfil. Ao entrar e ao voltar à aba, uma
consulta limitada a cada 30 segundos recupera preferências atualizadas da conta.
As cores dos objetos desenhados nos slides são preservadas.

O player inicia com shuffle ativado (salvo preferência anterior) e faixa inicial
aleatória, com fila embaralhada sem repetir a faixa atual até
visitar as demais, e Voltar percorre o histórico no modo aleatório. A escolha
é lembrada neste navegador. A exportação JSON fica no menu de três pontos.

GIFs até 256 KB e 512 px são preservados. GIFs maiores são reduzidos e vídeos
até 30 MB viram GIFs de até três segundos, quadrados com corte central. A
conversão limita quadros/resolução e usa um Worker para codificar. O arquivo
final tem até 256 KB. O navegador precisa suportar o codec do vídeo; GIFs grandes
precisam de ImageDecoder. A lista de contas guarda uma miniatura estática
local de cada foto, sem guardar senhas. A foto principal pode ser animada.

Para salvar GIF no R2 e usar colaboração, publique o Worker atualizado:
`npx wrangler deploy --config cloudflare/wrangler.toml`. O endpoint /health
retorna version:3. O Worker antigo observado respondia 401 à rota pública de
apresentação, confirmando que a publicação ainda não tinha os módulos atuais.
Sem configuração do provedor de e-mail, convites oferecem um link e não
alegam entrega de mensagem. A ativação real de SQL/Worker não é substituída
pelos testes com respostas simuladas.

Para atualizar pelo painel, abra storage-lab-files → Edit code, substitua o
código por todo cloudflare/worker-ready.js e clique Deploy. Esse arquivo único
foi compilado com Wrangler em modo dry-run. Preserve a binding FILES e as
variáveis existentes. Depois, /health deve retornar version:3. Nenhum deploy
foi feito automaticamente por essa compilação.

O usuário publicou o Worker version:3 e informou Success ao executar o SQL.
A verificação pública confirmou /health=200, apresentação inexistente=404,
avatar sem sessão=401 e funções de contatos existentes com execução anônima
bloqueada (42501), conforme esperado. A entrega real de convites por e-mail
continua dependendo da configuração do provedor no Worker.
