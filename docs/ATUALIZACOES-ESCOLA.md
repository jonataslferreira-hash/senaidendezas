# Atualização depois dos testes na escola

## Editor e apresentação

- Selecione um texto e use **Fonte**. A galeria tem cinco colunas no PC, busca, amostra com acentos e recomendações conforme o conteúdo do slide e a função do texto. Todas as opções estão na rolagem, sem paginação; os arquivos de prévia são baixados conforme entram na área visível. A janela bloqueia a rolagem da página ao fundo.
- **Adicionar sua fonte** aceita TTF, OTF, WOFF e WOFF2 de até 4 MB, com até 12 fontes por aula. Os arquivos ficam no IndexedDB e acompanham o JSON e o salvamento em nuvem. O PDF incorpora a fonte na renderização; o PPTX continua dependendo das fontes disponíveis no computador que abrir o arquivo.
- Clique fora dos objetos para limpar a seleção. A orientação de arrastar foi removida e o espaço do slide foi ampliado.
- **Simulação** adiciona lançamento de projétil, pêndulo, circuito de Ohm ou neutralização ácido/base. Os controles também funcionam na visualização de participantes. A neutralização é um modelo didático de ácido/base fortes a 0,01 mol/L e o pêndulo usa a aproximação de pequenas oscilações.
- Arraste as abas de etapas para escolher a ordem. No celular, mantenha a aba pressionada e arraste. O **+ das abas** cria uma nova etapa independente de Slides, Enquete ou Quiz; é possível ter vários quizzes e enquetes na mesma aula. O **+ da sequência lateral** adiciona conteúdo à etapa selecionada. As simulações continuam disponíveis na barra de ferramentas do slide.
- **Apresentar** solicita tela cheia no clique. Links abertos sem interação continuam sujeitos ao bloqueio de tela cheia do navegador. Em tela cheia, a barra aparece na região superior ou quando recebe foco pelo teclado.
- Salvar, renomear e abrir novamente uma aula da nuvem conservam a identidade do projeto. **Duplicar** e **Importar JSON** continuam criando cópias de propósito.

## Exportação

No menu **···** da aula ou do editor, use **Exportar PDF** ou **Exportar PPTX**.

- PDF: uma página por slide, com o visual renderizado.
- PPTX: caixas de texto editáveis; os demais elementos são imagens incorporadas. Fontes precisam estar disponíveis no computador que abrir o arquivo. Modelos 3D e simulações ficam estáticos. Áudio não é incorporado. Efeitos de entrada compatíveis são exportados quando disponíveis na biblioteca; não há garantia de equivalência com todos os recursos do PowerPoint.
- Para conservar todos os recursos interativos e arquivos do projeto, use o JSON ou a nuvem.

## Sala e quiz

- O professor pode abrir **Participantes** e remover alguém. O participante pode editar seu nome e avatar dentro da sala, inclusive enviar uma foto sem ter conta.
- Voltar à sala no mesmo navegador reutiliza a credencial local e evita criar outro participante. Limpar os dados do navegador, usar outro perfil ou uma aba anônima separada cria outra identidade. A credencial de alguém removido deixa de ser aceita.
- **Ler QR Code** abre a câmera dentro do site e preenche o código da sala. Câmera e microfone pedem permissão e precisam de HTTPS ou localhost.
- Durante a pergunta, o professor vê enunciado e alternativas grandes; o celular mostra os quatro botões. A classificação não aparece ao lado.
- Depois de revelar a resposta, o professor escolhe **Mostrar classificação**. Na última pergunta, **Grande resultado final** abre o pódio, com revelação de terceiro, segundo e primeiro lugares. **Revelar todos** pula a espera. Os personagens usam os avatares ou fotos dos participantes.
- A sequência de acertos aparece como ofensiva; ela não altera a fórmula de pontuação existente.
- Em **Quiz → Música e sons do quiz**, configure separadamente lobby e perguntas, volume e efeitos. O sorteio usa as nove músicas de lobby enviadas pelo usuário e vinte variantes de perguntas agrupadas por tempo (10, 20, 30, 60, 90 e 120 segundos). Para outros tempos, usa a duração disponível seguinte e repete se necessário. As cinco faixas do editor continuam disponíveis como escolhas manuais, além do upload de arquivos próprios.
- Cada pergunta tem uma chance de 1/3 de usar uma das três contagens especiais nos últimos cinco segundos. Essas faixas já incluem o resultado: ao terminar o tempo, não se sobrepõe outro efeito. Se o professor revelar antes de terminar, a contagem para e o efeito normal de resultado toca.
- Música padrão em 10% de volume, resultado em 20%. Depois da revelação completa do pódio, **Kids Gameplay** entra com fade de 1,8 segundo, velocidade de 85% sem preservar o tom, volume padrão de 7% e repetição. **Revelar todos** antecipa esse início. Sair do quiz ou desligar o som cancela as reproduções e esperas.
- Os 34 arquivos são reproduzidos pelos links fornecidos, sem cópias no R2. A reprodução precisa de conexão com esses servidores.

## Voz e chat: ativação do servidor

O editor permite gravar uma narração de até dois minutos no botão **Áudio → Gravar áudio**. O chat tem gravação de voz e mostra data e horário nas mensagens. A narração do slide fica no projeto; mensagens de voz usam arquivos privados no R2 e conferem a permissão da conversa antes de liberar o áudio.

Para ativar mensagens de voz entre contas reais, execute o conteúdo completo de `supabase/voice-chat.sql` no SQL Editor do Supabase e publique o conteúdo completo de `cloudflare/worker-ready.js` no Worker `storage-lab-files`. Preserve o binding `FILES` e as variáveis já configuradas. O SQL completo de instalação `supabase/setup-chat.sql` também contém essa migração para novas instalações.

A resposta de `/health` deve conter `"version":5` e `"voiceChat":true`. Não é necessário apagar tabelas ou dados anteriores. Esta atualização do servidor precisa ser aplicada no painel administrativo; alterar apenas os arquivos locais não publica o Worker.

## Ajustes de enquadramento e participantes

- Lobby, pergunta, classificação intermediária e pódio usam a altura disponível da janela. No celular, as alternativas são apenas letras grandes; o feedback aparece logo abaixo dos botões. A classificação completa fica em um painel que pode ser aberto, sem aumentar a página.
- O cabeçalho do quiz no celular mantém a marca e o status na mesma linha. O perfil da sala continua acessível no lobby.
- Os personagens têm quatro variações de dança, com articulações nos braços e pernas; pulam durante a subida das torres. A preferência de reduzir animações continua respeitada.
- O efeito de resultado e o final da contagem especial não são cortados ao abrir a classificação. Sair ou iniciar outra pergunta continua encerrando o áudio anterior.
- **Tirar minha foto** abre a câmera frontal, captura uma imagem e encerra a câmera. A captura funciona em HTTPS ou localhost, com permissão do navegador; escolher um arquivo continua disponível.

## Etapas, atalhos e botões

- Para excluir uma enquete ou outra etapa, use **··· na aba da etapa → Excluir etapa → confirmar**. São removidos somente os itens dessa etapa. A aula precisa conservar pelo menos um slide.
- Mover para cima/baixo, duplicar, lixeira e adicionar ficam juntos abaixo do título da sequência lateral.
- O editor usa um atalho local como `?edit=abc12345`, sem os parâmetros extensos na barra. O atalho conserva a seleção e a navegação Voltar/Avançar neste navegador. Os links de convite e apresentação compartilhada continuam usando os botões próprios e funcionam entre aparelhos.
- Uma enquete pode sondar o conhecimento antes de explicar um assunto, colher uma opinião ou verificar dúvidas. Exemplo: “Para este PC, você escolheria HDD, SSD ou ambos?”. As respostas não dão pontos; os percentuais ajudam a conduzir a discussão.
