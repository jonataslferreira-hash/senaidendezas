# Storage Lab · Aulas interativas

Plataforma estática para criar aulas, apresentar no computador e convidar
alunos pelo celular. A aula de HDD e SSD é um exemplo editável da biblioteca.

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

A biblioteca permite criar, editar, renomear, duplicar, excluir e restaurar
a demonstração. As alterações do editor são salvas explicitamente pelo botão
**Salvar aula**; também são salvas antes de sair do editor, apresentar ou abrir
a prévia. Uma indicação mostra quando há alterações pendentes.

Os metadados da biblioteca ficam no **localStorage deste navegador e endereço
do site**. As imagens das páginas importadas ficam no **IndexedDB**, que
oferece mais espaço para apresentações do que o armazenamento de texto.
Não existem contas nem sincronização da biblioteca entre computadores.
Limpar os dados do navegador remove as aulas. Uma aula salva em localhost
não aparece automaticamente no endereço do GitHub Pages.

Use **JSON** no editor ou **Mais opções → Exportar JSON** no cartão para
guardar uma cópia. **Importar aula** cria uma nova cópia com outro identificador;
não sobrescreve aulas existentes. Rascunhos incompletos podem ser transportados,
mas precisam ser preenchidos antes de apresentar.

Limites: 80 slides e 50 perguntas por aula; 48 MB de conteúdo por aula;
imagens PNG, JPEG, WebP ou GIF de até 1,4 MB por upload. O navegador possui
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

Login de professores, biblioteca compartilhada, controle remoto pelo celular,
reações e quizzes criados durante a apresentação estão registrados em
[docs/PROXIMAS-ETAPAS.md](docs/PROXIMAS-ETAPAS.md) como próximas evoluções.
