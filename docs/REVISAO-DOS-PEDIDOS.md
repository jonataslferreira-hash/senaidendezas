# Revisão dos pedidos da plataforma

Esta lista separa recursos implementados de serviços que ainda precisam ser
ativados ou publicados. Código local não confirma publicação no GitHub Pages,
execução do SQL no Supabase ou implantação do Worker no Cloudflare.

| Pedido | Situação e forma de conferir |
|---|---|
| Voltar/Avançar do navegador dentro do site | Biblioteca, edição, aba do quiz e prévia têm histórico e endereço próprios. Recarregar reabre a aula. |
| Editor visual primeiro, com Campos no topo | Todas as aulas abrem no visual; o botão alterna para Campos e volta ao visual. |
| Criar e editar slides no PC e celular | Texto, imagem, forma, modelos, arraste, redimensionamento, camadas, temas e desfazer/refazer. Não é um clone completo do PowerPoint. |
| Importar PDF e PPTX | As páginas viram imagens para apresentar e recebem novos elementos editáveis por cima. Objetos e animações originais do arquivo não são extraídos como objetos editáveis. |
| Modelos próprios | Upload OBJ/MTL, GLB/GLTF e recursos associados, dentro dos limites descritos no README. |
| Apresentação realmente em tela cheia | Suporta páginas importadas, imagens e slides criados no editor. |
| Controles ao mover o mouse e QR nos cantos | Controles reaparecem no PC; QR e código podem ficar nos quatro cantos. |
| Aluno explorar só o modelo do slide atual | Modelos de outros slides ficam bloqueados para o aluno. |
| Alunos acompanharem o professor | A sala sincroniza slides, modelos, quiz e resultados; alunos entram por código ou QR. |
| Lobby antes do quiz | Personagens, entrada de participantes, trilha opcional e contagem iniciada pelo professor. |
| Música própria no slide e quiz | Upload, prévia, volume e repetição. O professor controla o áudio; não há várias trilhas tocando nos celulares. |
| Colaboração simultânea | Código com Yjs, presença, convites por e-mail e versões no R2. Exige SQL/Worker atualizados; envio de e-mail exige configurar o provedor. Veja COLABORACAO-E-MUSICA.md. |
| Música pessoal no editor | Cinco faixas fornecidas, player no cabeçalho, CD com cor da capa, upload pessoal e player oficial do Spotify. |
| Contas e perfil | Login/cadastro/recuperação Supabase, nome, foto com recorte por gestos/câmera e recuperação após reload, bio, instituição, cores, redução de movimento e troca de senha. A foto exige armazenamento ativo. |
| Arquivos da conta no R2 | Worker publicado com o bucket `storagelab`; URL configurada no projeto e no workflow. A consulta sem login foi bloqueada e CORS passou. Falta confirmar o envio autenticado pelo site após publicar o frontend. |
| Compressão | Imagens otimizadas no envio e aulas comprimidas na nuvem quando houver economia. Processamento de gzip em Web Worker. |
| Site animado e interativo | Biblioteca com claro/escuro/sistema, chamada principal única, logo de béquer no site e favicon. Caixa e cartões flutuam; Crie → Conecte → Interaja se repete automaticamente. Há pausa manual e respeito ao movimento reduzido. |
| Enquetes além do quiz | Enquete configurável por slide, 2–4 opções, votos únicos por rodada, resultados ao vivo, encerramento e retorno ao mesmo slide. Sem pontuação. |
| Ordem e passagem dos slides | Mover, duplicar e excluir também no editor visual; transição por slide: deslizar, dissolver ou nenhuma. Avanço manual. |
| Tela preta no Pages | Publicação atual abriu no diagnóstico. Build local testado sob /senaidendezas/, sem erro de JS/HTTP; carregamento inicial visível e recuperação se o módulo falhar. Causa da imagem anterior não reproduzida. |
| Reduzir o consumo de CPU | Testes pesados encerrados; 3D sob demanda, limite de quadros e pausa fora da área visível. Preferência de movimento reduzido e testes leves sem WebGL. |

## Próximas funcionalidades, depois desta revisão

O usuário pediu que a plataforma tenha atividades além do quiz. Estão
registradas como próximas evoluções, sem controles simulados no produto:

- Nuvem de palavras e respostas curtas para discussão.
- Atividades de associação e ordenação.
- Reações da turma durante os slides.
- Disparar atividades durante a apresentação.
- Celular do professor como controle remoto autenticado.

A ordem e o funcionamento dessas novas atividades serão definidos na próxima
etapa. Os controles do professor continuarão separados da participação do aluno.
