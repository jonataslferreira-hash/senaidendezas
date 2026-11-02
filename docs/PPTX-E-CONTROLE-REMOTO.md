# PPTX, biblioteca e conta no celular

## Importação do PowerPoint

A importação agora gera slides do editor, em vez de uma imagem única por página.
Textos são editáveis. Imagens e objetos gráficos podem ser movidos e
redimensionados. Objetos gráficos complexos entram como imagens de cada objeto;
não há edição dos dados de gráficos, SmartArt ou dos pontos de uma geometria.
Fundos e elementos do modelo ficam em uma camada separada.

O modelo Netflix fornecido foi testado localmente, com 14 slides. O bloqueio
anterior vinha de hyperlinks do slide mestre, confundidos com imagens externas.
Os hyperlinks são removidos do desenho antes da rasterização; imagens realmente
vinculadas continuam exigindo incorporação no arquivo. O importador não busca
recursos externos automaticamente.

O player lê duração, atraso, ordem, agrupamento por clique e alvos dos efeitos
suportados: aparecer, fade de entrada/saída, flutuar, voar de entrada/saída,
split de entrada, wipe de entrada e zoom de entrada. Os cliques são sincronizados
pela sala. O controle Próximo executa o próximo grupo antes de trocar o slide.

**Esta implementação não é uma reprodução completa do PowerPoint.** Há limites
de fontes disponíveis, formatação mista, listas, efeitos, mídia e renderização.
O relatório de compatibilidade aparece no próprio slide. Vídeo, áudio original,
avanço automático e animações não suportadas não são apresentados como preservados.
Salvar/exportar a aula usa o formato JSON do site, não um round-trip de PPTX.

Antes de adoção institucional, é necessário validar um conjunto representativo
de apresentações do Senai e decidir se os recursos restantes exigem integração
com um motor Office. Não se deve apresentar a solução atual como compatibilidade
total com qualquer PPTX.

Referências do renderizador e limites:
https://github.com/office-kit/pptx

## Controle no celular

Execute `supabase/remote-control.sql` no SQL Editor. Ele libera presença e
comandos somente no tópico privado cujo identificador corresponde à conta
autenticada. Não há chave administrativa no navegador. Não precisa republicar
o Worker para essa alteração.

Com a mesma conta no PC e celular, uma apresentação ao vivo aparece na biblioteca
do celular. O botão de controle abre os comandos. Prévias não são anunciadas
como apresentações ao vivo. Outra conta não pode entrar no tópico privado.

O mesmo controle também aparece no cabeçalho da sala, depois de entrar pelo QR
Code: **Controlar slide**. O botão exige que o tópico privado da conta anuncie
uma apresentação com o mesmo código da sala. Estar na sala como participante,
por si só, não concede acesso aos comandos.

## Apresentação no PC e conteúdo no celular

Slides antigos de texto, imagem e modelo usam o mesmo quadro visual dos slides
criados no editor. Essa adaptação não regrava a aula salva. Ao editar um slide
antigo, o editor usa a mesma composição mostrada na apresentação.

No editor, abra **Atividades e passagem deste slide → Conteúdo no celular**.
Escolha automático, somente texto, ou uma das imagens/modelos do slide. Essa
escolha também está em **Editar slide** durante a apresentação e é enviada à
turma ao salvar. O modo automático prioriza um modelo; depois uma imagem
desbloqueada, dando preferência à maior. Se o objeto escolhido for removido, a
exibição volta automaticamente a essa prioridade.

Em telas de até 800 pixels, participantes recebem título legível, mídia em
destaque e texto adaptado, sem o quadro em miniatura. Modelos mantêm rotação,
exploração de peças e abertura das camadas. Em telas maiores, a apresentação
continua completa. PDFs continuam sendo páginas em imagem; não é possível
extrair seus objetos individuais pelo seletor.

## Nome, foto e biblioteca

A entrada na sala usa o nome do perfil e oferece a miniatura da foto da conta
como avatar inicial. O participante pode alterar o nome e escolher um avatar
do site. A foto enviada à sala é uma miniatura, sem conceder acesso ao arquivo
privado da conta. O nome escolhido não equivale a identidade verificada.

Arquivos locais e da nuvem agora aparecem na mesma biblioteca. A indicação de
armazenamento fica junto das quantidades. Uma cópia da nuvem aberta no editor
fica associada ao arquivo de origem para evitar duplicação de cartão e indicar
alterações locais posteriores. A indicação usa os arquivos da conta ativa.
