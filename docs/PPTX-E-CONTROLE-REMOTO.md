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

## Nome, foto e biblioteca

A entrada na sala usa o nome do perfil e oferece a miniatura da foto da conta
como avatar inicial. O participante pode alterar o nome e escolher um avatar
do site. A foto enviada à sala é uma miniatura, sem conceder acesso ao arquivo
privado da conta. O nome escolhido não equivale a identidade verificada.

Arquivos locais e da nuvem agora aparecem na mesma biblioteca. A indicação de
armazenamento fica junto das quantidades. Uma cópia da nuvem aberta no editor
fica associada ao arquivo de origem para evitar duplicação de cartão e indicar
alterações locais posteriores. A indicação usa os arquivos da conta ativa.
