# Storage Lab · Aulas interativas

Plataforma estática para criar aulas, apresentar no computador e convidar
alunos pelo celular. A aula de HDD e SSD é um exemplo editável da biblioteca.

## Editor visual

**Nova aula** abre o editor visual. Use **Editor visual** nas aulas existentes
para transformar o slide em um layout livre; **Campos** mantém a edição por
formulário disponível.

- Toque/clique em um elemento para selecioná-lo.
- Arraste para mover e use a alça para redimensionar.
- Toque duas vezes no texto para escrever diretamente no slide, ou use
  o campo **Texto do elemento** nas propriedades.
- Adicione texto, imagens, formas e modelos 3D pela barra.
- Escolha tema, cor de fundo, cor/tamanho/alinhamento de texto e layout.
- Use a lista de camadas para selecionar objetos pequenos no celular.
- Duplique, fixe, exclua e altere a ordem dos elementos pelas propriedades.
- **Desfazer/Refazer** e Ctrl+Z ajudam a revisar as alterações.

Os slides livres usam proporção 16:9. As posições são relativas à página,
preservando o layout no computador, celular e apresentação. O editor usa
eventos de ponteiro para aceitar mouse e toque. No celular, as propriedades
ficam abaixo do slide; **Dados da aula** abre título e descrição completos.
**Explorar o modelo** libera rotação/zoom do objeto 3D durante a edição;
**Voltar à edição** permite mover a caixa novamente.

Até 40 elementos e dois modelos 3D por slide. As páginas de PDF/PPTX podem
ser usadas como fundo de um slide livre para acrescentar elementos por cima.
O desenho original do PDF/PPTX continua como imagem, sem edição por objetos.

## Modelos 3D próprios

No editor visual, use **Modelo 3D**. No formulário de um slide de modelo,
use **Enviar modelo GLB / GLTF / OBJ**.

- **GLB:** escolha o arquivo; materiais e texturas podem vir incorporados.
- **GLTF:** selecione o GLTF junto com o BIN e as texturas referenciadas.
- **OBJ:** selecione o OBJ e, quando existirem, o MTL e as texturas.

Selecione um modelo principal por vez, com até 80 arquivos associados e
**15 MB no total**. Modelos com mais de 1,5 milhão de vértices são rejeitados
para evitar apresentações excessivamente pesadas. Se o download vier em ZIP,
extraia os arquivos antes de selecioná-los.

Os modelos podem ser girados e aproximados, e peças nomeadas podem ser
selecionadas. Descrições didáticas e abertura automática de camadas do
hardware de exemplo não são criadas automaticamente para arquivos enviados.
As animações do arquivo não são reproduzidas nesta versão.

Os arquivos são armazenados localmente no IndexedDB. O JSON exportado inclui
os arquivos do modelo para levar a aula a outro computador. Os alunos recebem
o modelo da aula pelo convite, sem precisar enviá-lo novamente.

## Criar e apresentar

1. Na biblioteca, clique em **Nova aula** ou edite a demonstração.
2. Dê um título e uma descrição. Adicione, duplique, reordene ou exclua slides.
3. Escolha o formato de cada slide: **texto**, **imagem** ou **modelo 3D**.
   Textos permitem introdução, tópicos e destaque. Imagens podem ser carregadas
   do computador ou referenciadas por um link HTTPS.
4. Adicione perguntas de discussão e explicações. As notas do apresentador
   ficam no computador do professor e não são enviadas aos alunos.
5. Na aba **Quiz**, crie perguntas com duas a quatro alternativas, resposta
   correta, dificuldade, tempo (5–300 segundos) e explicação. O número de
   alternativas também é configurável.
6. Clique em **Salvar aula** (ou Ctrl+S). **Prévia** testa a aula sem rede.
7. Clique em **Apresentar** para criar uma sala e compartilhar o QR Code,
   link ou código. O professor conduz os slides; os alunos exploram o conteúdo.
8. Inicie o quiz, revele as respostas e avance até o pódio. Aulas sem quiz
   podem ser encerradas diretamente.

## Apresentação, convite fixo e edição durante a aula

**Modo apresentação** ou **F** ativa a tela cheia para todos os formatos:
texto, imagens, 3D, PDF e PPTX. Nos slides de imagem feitos no editor, a
imagem ocupa o palco inteiro; **Mostrar texto** abre a explicação por cima.
Nos slides de texto e 3D, o conteúdo é ampliado para o tamanho da tela.

No PC, mova o mouse sobre o slide para mostrar os controles. Eles somem
quando o mouse fica parado fora da barra; também aparecem ao navegar pelo
teclado. As setas avançam e voltam. O botão da barra ou **F** sai da tela cheia.

Numa sala ao vivo, marque **QR Code** e escolha superior esquerdo, superior
direito, inferior esquerdo ou inferior direito. O convite pequeno fica no
canto durante a tela cheia, com o código da sala acima. Clicar nele abre o
convite grande. A preferência de exibição e canto fica salva no navegador.

**Editar slide** permite corrigir textos, imagem, modelo 3D, perguntas e notas
do slide atual durante a apresentação. **Salvar slide** atualiza a sala e a
biblioteca local. Cancelar mantém a versão anterior. Para páginas de PDF/PPTX,
o título, as perguntas e as notas podem ser editados; o desenho da página
continua sendo uma imagem estática do arquivo importado.

Os alunos ficam no modelo 3D escolhido para o slide atual. Podem girar,
aproximar, abrir camadas e selecionar peças, mas não trocar para outro modelo
ou navegar para outros slides.

## Importar apresentações PDF e PowerPoint

Na biblioteca, clique em **Importar slides** e escolha um **PDF** ou
**PPTX**, com até **25 MB e 80 páginas/slides**. Cada página é convertida
em um slide estático. O processamento acontece no navegador; o arquivo
original não é enviado a um serviço de conversão.

Depois de importar, você pode reorganizar, duplicar e excluir páginas,
intercalar slides criados no site, escrever notas e perguntas de discussão
e configurar o quiz da aula. O conteúdo visual da página importada não é
editável por objetos: altere o arquivo original e importe novamente.

Use **Tela cheia** ou a tecla **F** para projetar. As setas avançam e voltam;
o seletor de páginas permite saltar para um slide. Em tela cheia, os controles
ficam nas bordas superior e inferior e aparecem ao passar o mouse ou focar
os botões. Os celulares acompanham a mesma página da apresentação.

**PPTX é uma prévia estática:** animações, transições e vídeos não são
reproduzidos, e fontes, SmartArt, gráficos e outros elementos complexos
podem variar. Revise a prévia antes da aula. Para maior fidelidade visual,
exporte a apresentação no PowerPoint como PDF e importe esse PDF.
Arquivos PPT antigos, ODP, Keynote e Google Slides também podem ser
exportados como PDF pelo aplicativo original.

PDFs protegidos por senha devem ser exportados em uma cópia sem senha.
Os slides são renderizados com até 1920 pixels no maior lado. Documentos
muito grandes ou detalhados podem precisar ser divididos em partes.

Os três modelos 3D disponíveis nesta versão são HDD, SSD SATA e SSD M.2
PCIe/NVMe, com rotação, zoom, abertura de camadas e seleção das peças.
Outros assuntos podem usar slides de texto, imagens e perguntas de discussão.

## Biblioteca e arquivos

Cada aula abre em um endereço próprio (`?page=editor&lesson=...`). Os botões
Voltar/Avançar do navegador acompanham biblioteca, editor, quiz do editor e
prévia. Recarregar reabre a mesma aula. Ao voltar, alterações do rascunho são
salvas. O editor visual é o modo inicial de todas as aulas; **Campos**, no
topo, alterna a edição. Abrir o visual não converte nem altera um slide até
você realmente editar seus elementos.

### Música e lobby do quiz

No editor há **Áudio deste slide** e, na aba Quiz, **Música do lobby e quiz**.
Envie MP3, WAV, OGG, M4A, AAC ou WebM de até 8 MB. É possível ajustar volume,
repetição e remover a trilha. A decodificação depende do suporte do navegador;
o site valida o arquivo antes de salvar. As músicas ficam no IndexedDB e
entram no JSON portátil de exportação. A aula completa mantém o limite de 48 MB.

O botão para iniciar o quiz abre um lobby colorido com os avatares animados.
Os alunos podem entrar enquanto o lobby está aberto. Só **Começar quiz**
inicia a contagem de três segundos e a primeira pergunta. **Voltar aos slides**
cancela a preparação; o tempo das perguntas só começa após a contagem.

O áudio toca no computador do professor, evitando várias músicas ao mesmo
tempo nos celulares. Use o botão de som no cabeçalho para ativar/desativar.
No lobby há uma trilha sintetizada opcional quando nenhuma música própria
foi enviada. A música acompanha lobby/perguntas/revelação, para ao mostrar o
resultado e ao sair. O navegador pode exigir um clique no som para liberar a
reprodução. O arquivo de música mencionado pelo usuário ainda não foi recebido.

### Uma experiência animada, com controle de movimento

A biblioteca usa superfícies claras e uma demonstração interativa: **Crie →
Conecte → Interaja**. O passeio mostra o slide chegando aos celulares e uma
resposta ao desafio. É possível abrir o dispositivo ilustrado, escolher etapas,
responder e repetir. O passeio automático termina em 7,6 segundos e pausa ao
sair da área visível, ocultar a aba ou abrir a conta. Sem movimento automático,
os controles continuam funcionando.

Transições acompanham navegação, troca de slides, entrada das alternativas,
painéis do editor, novos participantes no lobby e chegada ao pódio. Atualizações
no mesmo slide não reiniciam a transição da página. A preferência de movimento
reduzido do sistema e do perfil é respeitada. Não há outro visualizador 3D
rodando para animar a biblioteca: a demonstração usa HTML, CSS e SVG.

A revisão completa dos pedidos e as limitações atuais estão em
[docs/REVISAO-DOS-PEDIDOS.md](docs/REVISAO-DOS-PEDIDOS.md).

### Perfil e arquivos da conta

No cabeçalho, abra **Minha conta → Editar perfil** para escolher nome, foto,
instituição, bio, cores e movimento reduzido. A troca de senha confirma a senha
atual e a nova senha. Fotos são recortadas e otimizadas para WebP de 256×256.
Veja [docs/PERFIL-E-DESEMPENHO.md](docs/PERFIL-E-DESEMPENHO.md).

O login continua no Supabase. O armazenamento suporta o R2 privado através de
um Worker que valida esse login. O bucket é **storagelab**; o Worker foi publicado em
`https://storage-lab-files.lagujf.workers.dev` e a URL foi configurada no ambiente
local e no workflow. Falta publicar a atualização do frontend e conferir um
upload autenticado pelo site. O endereço S3
não deve ser usado diretamente como URL da API. Consulte
[docs/CLOUDFLARE-R2.md](docs/CLOUDFLARE-R2.md).

Sem URL de R2, o site usa Supabase Storage. Para essa opção, aplique
[supabase/storage.sql](supabase/storage.sql), que cria buckets privados para
aulas e avatares, índice e políticas por proprietário. O passo a passo está
em [docs/ARQUIVOS-NA-NUVEM.md](docs/ARQUIVOS-NA-NUVEM.md).

**Salvar na nuvem** envia a aula com suas mídias; gzip é aplicado quando
reduz o tamanho, em um Web Worker separado da interface. Imagens do editor
são otimizadas no upload, mantendo o original quando a conversão fica maior.
**Na minha conta → Atualizar arquivos** lista a biblioteca da conta; **Abrir
cópia no editor** recupera uma cópia local. Não há sincronização automática.

A biblioteca permite criar, editar, renomear, duplicar, excluir e restaurar
a demonstração. As alterações do editor são salvas explicitamente pelo botão
**Salvar aula**; também são salvas antes de sair do editor, apresentar ou abrir
a prévia. Uma indicação mostra quando há alterações pendentes.

Os metadados da biblioteca ficam no **localStorage deste navegador e endereço
do site**. As imagens das páginas importadas ficam no **IndexedDB**, que
oferece mais espaço para apresentações do que o armazenamento de texto.
O login por e-mail usa Supabase Auth. A biblioteca local não é enviada ao entrar
na conta. Depois de ativar o Storage, o envio e a abertura na nuvem são
explícitos; não há sincronização automática.
Limpar os dados do navegador remove as aulas. Uma aula salva em localhost
não aparece automaticamente no endereço do GitHub Pages.

Use **JSON** no editor ou **Mais opções → Exportar JSON** no cartão para
guardar uma cópia. **Importar aula** cria uma nova cópia com outro identificador;
não sobrescreve aulas existentes. Rascunhos incompletos podem ser transportados,
mas precisam ser preenchidos antes de apresentar.

Limites: 80 slides e 50 perguntas por aula; 48 MB de conteúdo por aula;
imagens PNG, JPEG, WebP ou GIF com até 1,4 MB após otimização (origem até 15 MB). O navegador possui
sua própria quota total de armazenamento. Se salvar falhar, a interface
informa o problema e permite exportar o rascunho em JSON.

## Aula ao vivo e quiz

O professor coordena a sala no próprio navegador usando **PeerJS/WebRTC**.
O GitHub Pages hospeda os arquivos; a sinalização pública PeerJS ajuda a
estabelecer as conexões entre os dispositivos. Os alunos recebem o conteúdo
da aula ao entrar, mesmo sem terem a aula salva na biblioteca deles.
Imagens incorporadas ao JSON acompanham a aula; imagens em links externos
dependem de o endereço continuar acessível.

Mantenha a aba do professor aberta e o computador acordado. A atualização da
página pode interromper temporariamente as conexões; a sessão local preserva
a aula, a identidade do aluno e os pontos para reconectar. A sala não é um
banco de dados persistente.

| Dificuldade | Pontuação máxima |
|---|---:|
| Fácil | 1.000 |
| Média | 1.500 |
| Difícil | 2.000 |

Acertos dentro do prazo valem de 50% a 100% da pontuação, conforme o tempo
restante quando o professor recebe a resposta. Erros e respostas atrasadas
valem zero. Só há uma resposta por pergunta. Os pontos e a alternativa correta
são revelados após o tempo ou por comando do professor. Empates: mais acertos,
depois nome. O resultado pode ser exportado em CSV e a música é opcional.

As respostas do quiz e as notas do professor não acompanham o conteúdo
inicial enviado aos alunos. Isso não transforma a plataforma em um sistema
antifraude para avaliações formais.

**Teste na rede real do Senai antes da aula.** Algumas redes bloqueiam
WebRTC. Os testes automatizados usam um sinalizador local: não confirmam a
disponibilidade do serviço público ou as permissões do Wi-Fi da escola.
O limite de 60 participantes não foi submetido a teste de carga.

## Executar no computador

Requer Node.js 22.18 ou superior:

```powershell
npm ci
npm run dev
```

Abra o endereço Local mostrado pelo Vite. **localhost abre apenas no próprio
computador**; use a URL HTTPS publicada para convidar os celulares.

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- --trace off
```

Os testes cobrem regras da sala, persistência, validação/importação de aulas,
privacidade das notas e respostas, edição pelo navegador, sincronização entre
computador e celular, quiz e build no subdiretório do GitHub Pages.
O Playwright inicia o Vite, o sinalizador local e o servidor do build.
As portas 5173, 9000 e 4173 devem estar disponíveis; processos já ativos
podem ser reaproveitados fora de CI. `CHROMIUM_PATH` permite usar um
Chromium compatível já instalado.

## Publicar pelo GitHub Desktop

1. Revise Changes, faça o commit e use **Push origin** para a branch main.
2. No GitHub, abra **Settings → Pages → Source → GitHub Actions**.
3. Aguarde o workflow **Publicar no GitHub Pages** e abra a URL que ele informar.

O workflow instala, testa, gera e publica `dist/`. O build usa caminhos
relativos e funciona no subdiretório do repositório. Não é necessário hospedar
um servidor Node.js, configurar chaves ou manter um backend próprio.

Os arquivos locais e o workflow não confirmam que o site foi publicado.
Nesta tarefa, commit e envio continuam sob controle do usuário.

## Organização

| Arquivo | Responsabilidade |
|---|---|
| `src/studio.js` | Biblioteca e editor |
| `src/studio.css` | Interface da plataforma |
| `src/lessons.js` | Formato JSON, validação e persistência |
| `src/import-slides.js` | Leitura e renderização local de PDF/PPTX |
| `src/assets.js` | Imagens no IndexedDB e JSON portátil |
| `src/documents.css` | Importação e apresentação de páginas em tela cheia |
| `src/content.js` | Conteúdo e perguntas da demonstração |
| `src/app.js` | Apresentação, prévia, entrada e resultados |
| `src/room.js` | Estado da sala, quiz e pontuação por aula |
| `src/network.js` | Sinalização e conexões WebRTC |
| `src/models.js` | Modelos 3D didáticos |
| `.github/workflows/pages.yml` | Testes, build e publicação |

O roteiro de 10–12 minutos e as explicações da aula demonstrativa estão em
[docs/AULA-HDD-SSD.md](docs/AULA-HDD-SSD.md). Esse documento registra a
demonstração original; use este README para o fluxo atual da plataforma.

Biblioteca compartilhada, controle remoto pelo celular,
reações e quizzes criados durante a apresentação estão registrados em
[docs/PROXIMAS-ETAPAS.md](docs/PROXIMAS-ETAPAS.md) como próximas evoluções.
Cadastro, entrada, recuperação de senha e saída da conta estão implementados.
A configuração das URLs no painel Supabase e o fluxo futuro de controle estão em
[docs/CONTAS-E-CONTROLE.md](docs/CONTAS-E-CONTROLE.md).
