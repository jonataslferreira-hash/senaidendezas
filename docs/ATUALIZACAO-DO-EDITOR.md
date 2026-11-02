# Editor, música e colaboração

O editor permite posicionar objetos de -1000% a 1000% e ampliá-los até 1000%.
As margens ficam visíveis na edição; a apresentação recorta o conteúdo que
ultrapassa o slide. Posição e tamanho são preservados no salvamento e no grupo.

O player sempre inicia no aleatório. A fila visita as outras faixas antes de
repetir, e o botão anterior recupera o histórico. Os arquivos de áudio aceitam
slowed; o player oficial do Spotify não oferece controle de velocidade.
Pode-se adicionar uma versão slowed já publicada no Spotify pelo próprio link.
Referência: https://developer.spotify.com/documentation/embeds/references/iframe-api

As opções Clássico, Frutiger Aero, Liquid Glass e Minimalista alteram superfícies,
tipografia, profundidade e botões. Os temas do slide também alteram fundo,
tipografia e formas, mantendo o conteúdo e as posições dos elementos.

## Ativação para quem já executou setup-chat.sql

1. Abra `supabase/workspace-upgrade.sql`, copie todo o conteúdo e execute no
   Supabase → SQL Editor → New query → Run. Não substitua só um trecho.
2. Abra `cloudflare/worker-ready.js`, copie todo o conteúdo e substitua o código
   do Worker `storage-lab-files` em Edit code. Clique Deploy.
3. Em `https://storage-lab-files.lagujf.workers.dev/health`, a versão deve ser 4,
   com `roles: true` e `people: true`.
4. Publique os arquivos do site pelo fluxo existente do GitHub Pages.

Uma instalação nova pode executar o arquivo completo `supabase/setup-chat.sql`,
que também contém esta atualização. Os scripts podem ser executados novamente.

## Permissões

- Dono: administra convites e permissões, edita e comenta.
- Editor: edita e comenta.
- Comentador: lê e envia mensagens sobre a aula.
- Leitor: apenas lê e apresenta.

Os papéis valem para as aulas do mesmo grupo. O fluxo atual cria um grupo por
aula. O dono mantém a administração e não pode se rebaixar pelo seletor.

Cada atualização colaborativa passa pelo RPC `sl_broadcast_document`, que
confere o papel atual antes de emitir o broadcast privado. Clientes não podem
publicar diretamente no canal `sl-doc-v2`. Assim, uma permissão antiga de canal
não autoriza um ex-editor a continuar enviando alterações. Publicação de
snapshots e comentários também são protegidos no banco. Upload e remoção de
arquivos exigem permissão de edição no Worker.

Convites aparecem no Chat da conta que usa o e-mail informado, com aceite antes
de abrir a aula. E-mail externo continua dependendo da configuração do provedor;
o convite dentro do site e o link funcionam sem ele. Fotos de outras pessoas
exigem um contato aceito ou participação no mesmo grupo. A digitação usa canais
privados e expira automaticamente, sem salvar texto não enviado.

Os testes locais usam contas e serviços simulados. A execução do SQL e a
publicação do Worker reais são etapas administrativas separadas.
