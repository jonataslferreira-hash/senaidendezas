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
| Contas e perfil | Login/cadastro/recuperação Supabase, nome, foto otimizada, bio, instituição, cores, redução de movimento e troca de senha. A foto exige armazenamento ativo. |
| Arquivos da conta no R2 | Worker privado e configuração do bucket `storagelab` preparados. Precisa publicar e fornecer/configurar a URL do Worker. O endereço S3 não substitui essa URL. |
| Compressão | Imagens otimizadas no envio e aulas comprimidas na nuvem quando houver economia. Processamento de gzip em Web Worker. |
| Site animado e interativo | Biblioteca clara com demonstração interativa de três etapas, abertura do dispositivo ilustrado, feedback de resposta, movimento entre telas e slides, painéis e pódio. A animação automática termina em 7,6 segundos; o usuário pode repetir. |
| Reduzir o consumo de CPU | Testes pesados encerrados; 3D sob demanda, limite de quadros e pausa fora da área visível. Preferência de movimento reduzido e testes leves sem WebGL. |

## Próximas funcionalidades, depois desta revisão

O usuário pediu que a plataforma tenha atividades além do quiz. Estão
registradas como próximas evoluções, sem controles simulados no produto:

- Enquetes e votação ao vivo, sem resposta obrigatoriamente certa.
- Nuvem de palavras e respostas curtas para discussão.
- Atividades de associação e ordenação.
- Reações da turma durante os slides.
- Disparar atividades durante a apresentação.
- Celular do professor como controle remoto autenticado.

A ordem e o funcionamento dessas novas atividades serão definidos na próxima
etapa. Os controles do professor continuarão separados da participação do aluno.
