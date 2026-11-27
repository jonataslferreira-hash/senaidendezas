import {newSlide} from './lessons.js';
import {newElement} from './canvas-data.js';
import {creativeDirections, creativeElements} from './creative-slide-layouts.js';
import {storyPages} from './creative-slide-stories.js';
import {onlineDeckConcepts, onlineSources, onlineStoryPages} from './creative-slide-online-inspirations.js';
import importedSourceDecks from './creative-slide-imported-data.json' with {type: 'json'};

const sizes = {
  '16:9': {pageWidth: 1600, pageHeight: 900},
  '9:16': {pageWidth: 900, pageHeight: 1600},
  '1:1': {pageWidth: 1080, pageHeight: 1080}
};

const concepts = [
  ['strawberry-party', 'Festa de Morango', 'Convite fofo com morangos, balões e uma tarde inteira de brincadeiras no jardim.', 'festas', 'sakura', '16:9', 'Sábado, 15h · No jardim', [
    ['Morangos no jardim', 'Uma tarde doce para brincar, comer bolo e tirar fotos.'], ['Doces da mesa', 'Bolo de morango, brigadeiro rosa e limonada na jarra.'], ['Vem comemorar', 'Confirme presença e traga sua cor favorita.']]],
  ['strawberry-poster', 'Festa de Morango · Cartaz', 'Cartaz de feira em tinta tomate, com morango recortado e letras grandes.', 'festas', 'candy', '16:9', 'Sábado, 15h · No jardim', [
    ['Morangos fresquinhos', 'Cestinhas de 1 kg colhidas na mesma manhã.'], ['Banca da feira', 'Bolo com nata · geleia · limonada de morango.'], ['Última chamada', 'Sábado até as 18h. Leve sua ecobag.']]],
  ['strawberry-album', 'Festa de Morango · Álbum', 'Álbum em papel quadriculado para fotos, bilhetes e receitas da festa.', 'memorias', 'berry', '16:9', 'Uma tarde no jardim', [
    ['A mesa antes da festa', 'Toalha xadrez, jarra de limonada e bolo com morangos.'], ['O primeiro pedaço', 'Saiu torto e ninguém quis outra fatia.'], ['Para guardar', 'Cole aqui a foto que você imprimiria.']]],
  ['coastal-postcards', 'Cartões do Litoral', 'Viagem em cartões-postais, do primeiro mergulho ao pôr do sol.', 'viagens', 'sky', '16:9', 'Lembranças à beira-mar', [
    ['Primeiro mergulho', 'Água fria, areia nos pés e um grito de alegria.'], ['Achados da costa', 'Conchas, um cartão do farol e sorvete de coco.'], ['O último sol', 'A vista do fim da tarde merece uma página só.']]],
  ['moonlight-playlist', 'Playlist de Meia-Noite', 'Capas de vinil para organizar músicas e contar por que cada uma entrou na seleção.', 'cultura', 'night', '16:9', 'Músicas para ouvir depois que a cidade dorme', [
    ['Lado A', 'Piano baixinho, janela aberta e a rua lá embaixo.'], ['Lado B', 'Batidas suaves para quando quase ninguém acorda.'], ['Bis', 'A música que fica tocando na cabeça no dia seguinte.']]],
  ['indie-arcade', 'Pequeno Arcade', 'Vitrine de jogos indie, com blocos de fliperama e tela de recordes.', 'cultura', 'neon', '16:9', 'Jogos curtos para uma noite entre amigos', [
    ['Pressione Start', 'Escolha um jogo curto para abrir a noite.'], ['Modo dupla', 'Troque o controle a cada fase e ria dos erros.'], ['Continue?', 'Anote o próximo jogo que vocês querem testar.']]],
  ['sunset-at-home', 'Cinema no Quintal', 'Programação de cinema ao ar livre, com tela emoldurada e cores de fim de tarde.', 'cultura', 'sunset', '16:9', 'Uma noite de filmes sob as estrelas', [
    ['Sessão das 19h', 'A tela acende quando o céu escurece.'], ['Intervalo', 'Pipoca, cobertor e mais cinco minutos de conversa.'], ['Próxima sessão', 'Deixe aqui o filme escolhido para a próxima noite.']]],
  ['clay-studio', 'Ateliê de Barro', 'Diário de cerâmica com tons de argila e formas inspiradas em peças feitas à mão.', 'criativo', 'clay', '16:9', 'Da primeira forma à peça pronta', [
    ['Na bancada', 'Barro amassado, esponja úmida e um pote de água.'], ['Marcas das mãos', 'Fotografe o barro ainda mole, antes de alisar.'], ['Peça pronta', 'Registre a frente, a base e o detalhe favorito.']]],
  ['easy-brunch', 'Brunch sem Pressa', 'Menu com fotos para servir panquecas, frutas e café entre amigos.', 'cotidiano', 'mint', '16:9', 'Panquecas, frutas da estação e café coado', [
    ['Para beliscar', 'Torradas crocantes, geleia e fruta da estação.'], ['Da frigideira', 'Panquecas quentes com manteiga e um fio de mel.'], ['Mais um café?', 'Termine com café coado e um pedaço de bolo.']]],
  ['rainy-book-club', 'Clube da Janela', 'Encontro de leitura com páginas para trechos, opiniões e a próxima escolha.', 'cultura', 'cloud', '16:9', 'Nosso próximo encontro de leitura', [
    ['A leitura do mês', 'Comece pela cena que ficou na memória.'], ['Entre as páginas', 'Guarde um trecho e conte o que você viu nele.'], ['Nos vemos em breve', 'Deixe três sugestões para a próxima leitura.']]],
  ['neighborhood-art', 'Museu do Meu Bairro', 'Galeria de detalhes encontrados em caminhadas pelo bairro.', 'criativo', 'caderno', '16:9', 'Uma exposição de coisas que passam despercebidas', [
    ['Na calçada', 'Placas antigas e sombras que só aparecem de manhã.'], ['Na esquina', 'Uma fachada que você passava sem reparar.'], ['Volte amanhã', 'Compare a mesma rua em outro horário.']]],
  ['picnic-with-friends', 'Piquenique de Domingo', 'Convite descontraído com toalha quadriculada, limão e dicas para o encontro.', 'festas', 'honey', '16:9', 'Onde a grama encontra a toalha', [
    ['Onde encontrar', 'Na grama perto das árvores, às 11h.'], ['O que levar', 'Uma bebida fresca, frutas e algo para sentar.'], ['Se chover', 'Levamos o piquenique para a varanda.']]],

  ['birthday-story', 'Parabéns em Stories', 'Convite vertical com fotos da festa, horário, trajeto e confirmação de presença.', 'festas', 'peach', '9:16', 'Você está na lista. Vem comemorar!', [
    ['Guarde a data', 'Domingo, 16h. Separe a tarde inteira.'], ['Como chegar', 'A entrada fica do lado do jardim.'], ['Você vem?', 'Mande um oi para confirmar presença.']]],
  ['morning-vlog', 'Manhã em Cenas', 'Roteiro vertical de vlog com enquadramentos, câmera e páginas para narrar a rotina.', 'cotidiano', 'sky', '9:16', 'Pequenos momentos antes do meio-dia', [
    ['Abra a janela', 'Comece com a luz entrando devagar no quarto.'], ['Pause para o café', 'Grave o som da água e o vapor subindo.'], ['Saia para andar', 'Termine com um detalhe que nunca tinha filmado.']]],
  ['roadtrip-vertical', 'Diário de Estrada', 'Cartões verticais para compartilhar paradas, descobertas e desvios de uma viagem.', 'viagens', 'sunset', '9:16', 'Quilômetros de café, mirantes e histórias', [
    ['A primeira parada', 'Uma padaria na beira da estrada e café bem forte.'], ['Mudança de rota', 'O caminho mais longo passou por um mirante.'], ['Volta para casa', 'Guarde a foto que melhor resume a viagem.']]],
  ['moon-zine', 'Zine da Lua', 'Zine vertical de fotografia noturna, com legendas e notas de campo.', 'criativo', 'night', '9:16', 'Três cenas da cidade depois das dez', [
    ['Depois das dez', 'A cidade desacelera e os sons mudam de lugar.'], ['Janela acesa', 'Uma luz atravessa o pátio por alguns minutos.'], ['Antes do sol', 'O azul aparece primeiro no canto do céu.']]],
  ['market-story', 'Feirinha no Bolso', 'Stories de feira com frutas frescas, rotas entre bancas e receita rápida.', 'cotidiano', 'soda', '9:16', 'O que levar para casa nesta semana', [
    ['Da estação', 'Morangos firmes e limões de casca fina.'], ['Achado da banca', 'Leve hortelã para perfumar a jarra.'], ['Em casa', 'Misture fruta, hortelã, gelo e água com gás.']]],
  ['pet-story', 'Diário de Patinhas', 'Álbum vertical de pequenos momentos com seu pet e espaço para legendas.', 'memorias', 'berry', '9:16', 'O dia a dia da melhor companhia', [
    ['Hora do passeio', 'O caminho favorito começa sempre pelo mesmo portão.'], ['Soneca oficial', 'A almofada do sofá já tem dona.'], ['Melhor retrato', 'Escolha a pose que mais parece com ele.']]],
  ['outfit-stories', 'Vitrine de Looks', 'Provador em formato de story para guardar combinações e seus detalhes favoritos.', 'criativo', 'lilac', '9:16', 'Combinações para vestir do meu jeito', [
    ['Look de manhã', 'Separe a base e marque o tecido preferido.'], ['Troca rápida', 'Veja o que muda com outro acessório ou sapato.'], ['O detalhe', 'Aproxime a câmera para mostrar a peça favorita.']]],
  ['matcha-recipe', 'Receita de Matchá', 'Receita de bolso para mostrar ingredientes, preparo e acabamento.', 'cotidiano', 'matcha', '9:16', 'Uma bebida gelada em três passos', [
    ['Ingredientes', 'Matchá, água morna, leite e bastante gelo.'], ['Bata bem', 'Misture o matchá na água até formar espuma.'], ['Sirva em camadas', 'Leite sobre o gelo e o chá por cima.']]],
  ['concert-pocket', 'Ingresso de Bolso', 'Agenda vertical com aparência de ingresso para planejar a noite de um show.', 'cultura', 'blue', '9:16', 'Nossa noite de música ao vivo', [
    ['Abertura dos portões', 'Combine um ponto de encontro antes de entrar.'], ['A faixa esperada', 'Anote a música que todo mundo quer cantar junto.'], ['Depois do bis', 'Salve a lembrança antes que a bateria acabe.']]],
  ['pocket-quest', 'Missão de Bolso', 'Pequeno jogo de desafios para stories, com fichas e estética de portátil retrô.', 'cultura', 'neon', '9:16', 'Três desafios para um passeio diferente', [
    ['Nível 1', 'Encontre algo verde e fotografe de bem perto.'], ['Nível 2', 'Recrie a pose de uma estátua do bairro.'], ['Final da missão', 'Mostre as fotos e eleja a mais improvável.']]],

  ['friends-scrapbook', 'Colagem de Amizade', 'Álbum quadrado de recados, fotos e lembranças em papel cor-de-rosa.', 'memorias', 'candy', '1:1', 'As histórias que a gente conta de novo', [
    ['A foto de sempre', 'Aquela que toda vez faz alguém rir.'], ['Bilhete dobrado', 'Uma coisa que só vocês entenderiam.'], ['Mais uma memória', 'Deixe espaço para a próxima reunião.']]],
  ['bloom-feed', 'Flores na Varanda', 'Carrossel botânico para registrar brotos e flores em vasos pequenos.', 'cotidiano', 'sakura', '1:1', 'Um diário de pequenas coisas que crescem', [
    ['A primeira folha', 'Anote quando o broto apareceu e quanta luz recebe.'], ['Dias de rega', 'Verifique a terra antes de molhar de novo.'], ['A varanda hoje', 'Compare a foto de agora com a do primeiro dia.']]],
  ['tiny-bakery', 'Confeitaria em Miniatura', 'Cartões quadrados de vitrine para doces, sabores e encomendas.', 'cotidiano', 'lilac', '1:1', 'Doces de vitrine feitos em pequenas fornadas', [
    ['Na vitrine', 'Bolo de baunilha, biscoitos de limão e tarte de fruta.'], ['Sabor da semana', 'Chocolate com uma pitada de sal.'], ['Reserve o seu', 'Use esta página para datas e retirada.']]],
  ['ocean-photo-dump', 'Álbum de Água Salgada', 'Carrossel quadrado para fotos da praia e pequenas legendas.', 'viagens', 'sky', '1:1', 'Recordações de um dia à beira-mar', [
    ['Antes da maré', 'Pegadas, poças e conchas antes do mar subir.'], ['Entre ondas', 'Azuis diferentes no mesmo trecho de areia.'], ['Na volta', 'Cabelo molhado e um último olhar para o horizonte.']]],
  ['after-dark-gallery', 'Galeria Depois do Escuro', 'Portfólio quadrado para fotos noturnas, com páginas de exposição e legendas.', 'criativo', 'blue', '1:1', 'Luzes baixas, reflexos e ruas vazias', [
    ['Luzes baixas', 'O contraste entre a vitrine e a rua vazia.'], ['Reflexos', 'O chão molhado guarda a cor dos letreiros.'], ['Último quadro', 'A foto em que quase tudo virou sombra.']]],
  ['sunset-invite', 'Convite Pôr do Sol', 'Cartões quadrados para combinar um encontro ao ar livre no fim da tarde.', 'festas', 'sunset', '1:1', 'Vamos ver o céu mudar de cor?', [
    ['Quando', 'Sexta, um pouco antes das seis.'], ['Onde', 'No gramado de onde se vê a cidade inteira.'], ['O combinado', 'Cada pessoa leva algo para dividir.']]],
  ['lemonade-cards', 'Clube da Limonada', 'Páginas refrescantes para receitas de verão, com cores cítricas e formas geométricas.', 'cotidiano', 'soda', '1:1', 'Três jeitos de refrescar a tarde', [
    ['A clássica', 'Limão, água, gelo e um pouco de açúcar.'], ['Com hortelã', 'Amasse as folhas de leve antes de servir.'], ['Com framboesa', 'Misture a fruta na jarra para dar cor e acidez.']]],
  ['vinyl-swap', 'Troca de Discos', 'Capas e faixas para compartilhar descobertas musicais.', 'cultura', 'blue', '1:1', 'Os discos que a gente quer emprestar', [
    ['O lado que marcou', 'Escolha uma faixa e conte quando a ouviu primeiro.'], ['Uma capa favorita', 'Separe um espaço para a arte que você ama.'], ['De mão em mão', 'Anote para quem emprestar o disco da vez.']]],
  ['kitchen-letters', 'Caderno de Receitas de Casa', 'Página de receita com bordas de papel, notas e espaço para variações.', 'memorias', 'clay', '1:1', 'Receitas que vale a pena passar adiante', [
    ['Anote os ingredientes', 'Registre as medidas do jeito que você aprendeu.'], ['O ponto certo', 'A cor, a textura ou o cheiro que avisam que está pronto.'], ['Para quem vem depois', 'Uma dica que nunca apareceu na receita original.']]],
  ['pixel-stickers', 'Figurinhas Pixel', 'Conjunto de cartões quadrados com blocos retrô para inventar personagens.', 'criativo', 'neon', '1:1', 'Crie seu personagem e comece a partida', [
    ['Escolha seu herói', 'Invente um nome e descreva o primeiro poder.'], ['Objeto secreto', 'Desenhe o item que só aparece na última fase.'], ['Tela final', 'Guarde espaço para uma frase de vitória.']]]
];

const repositorySourceByDeck = {
  'coastal-postcards': 'webslides',
  'moonlight-playlist': 'marp-core',
  'indie-arcade': 'impress-js',
  'rainy-book-club': 'gnab-remark',
  'neighborhood-art': 'impress-js',
  'birthday-story': 'webslides',
  'morning-vlog': 'marp-core',
  'roadtrip-vertical': 'webslides',
  'moon-zine': 'marp-core',
  'market-story': 'webslides',
  'pet-story': 'impress-js',
  'outfit-stories': 'marp-core',
  'matcha-recipe': 'gnab-remark',
  'concert-pocket': 'webslides',
  'pocket-quest': 'impress-js',
  'friends-scrapbook': 'impress-js',
  'bloom-feed': 'gnab-remark',
  'tiny-bakery': 'gnab-remark',
  'ocean-photo-dump': 'webslides',
  'after-dark-gallery': 'marp-core',
  'sunset-invite': 'webslides',
  'lemonade-cards': 'gnab-remark',
  'vinyl-swap': 'gnab-remark',
  'kitchen-letters': 'marp-core',
  'pixel-stickers': 'impress-js'
};

const pagesByDeck = {...storyPages, ...onlineStoryPages};

const repositoryConcepts = concepts.filter(([id]) => repositorySourceByDeck[id]);
const retainedConcepts = concepts.filter(([id]) => !repositorySourceByDeck[id]);

export const creativeDecks = [...repositoryConcepts, ...onlineDeckConcepts, ...retainedConcepts].map(([id, name, description, category, palette, format, coverSubtitle, beats, sourceId]) => {
  const [first, second, last] = beats;
  const [extraA, extraB, extraC, extraD] = pagesByDeck[id];
  const [coverStyle, primaryPhoto] = creativeDirections[id];
  const imported = importedSourceDecks[id];
  const source = imported ? {
    source: 'open-source',
    collection: imported.collection,
    collectionLabel: imported.collectionLabel,
    author: imported.author,
    license: imported.license,
    licenseShort: imported.licenseShort,
    upstreamName: imported.sourceTitle,
    sourceUrl: imported.sourceUrl,
    licenseUrl: imported.licenseUrl,
    sourceDeckUrl: imported.sourceDeckUrl,
    sourceSlideCount: imported.sourceSlideCount,
    selectedSlideIndexes: imported.selectedSlideIndexes,
    previewSlides: imported.previewSlides
  } : onlineSources[sourceId || repositorySourceByDeck[id]] || null;
  const designedPages = [
    [...first, primaryPhoto ? 'photo' : 'poster'], extraA,
    [...second, 'poster'], extraB, extraC, extraD, [...last, 'note']
  ];
  const pages = imported ? imported.slideTitles.slice(1).map(title => [title]) : designedPages;
  const deckFormat = imported?.format || format;
  return {
    id, name, description, category, theme: 'atelier-' + palette, coverStyle, format: deckFormat, coverSubtitle, pages,
    ...(imported ? {pageWidth: imported.pageWidth, pageHeight: imported.pageHeight} : sizes[deckFormat]),
    ...(imported ? {remixPages: designedPages} : {}),
    ...(source || {})
  };
});

export const newRepositoryDecks = creativeDecks.filter(deck => repositorySourceByDeck[deck.id]);

export function creativeSlide(deck, theme, palette, pageIndex = 0, options = {}) {
  const imported = importedSourceDecks[deck.id];
  if (imported) {
    const preview = imported.previewSlides[pageIndex];
    if (!preview) throw Error(`Prévia indisponível para o slide ${pageIndex + 1} de ${deck.name}.`);
    const title = preview.title || deck.name;
    return {
      ...newSlide(), pageWidth: imported.pageWidth, pageHeight: imported.pageHeight, kind: 'canvas',
      title, tag: deck.categoryLabel, visualTheme: theme, sourceType: 'pptx',
      background: '#ffffff', backgroundFill: {mode: 'solid', color: '#ffffff'},
      elements: [newElement('image', {
        x: 0, y: 0, w: 100, h: 100, image: preview.url, imageAlt: title, locked: true
      })]
    };
  }
  const page = deck.pages[pageIndex - 1];
  const title = page?.[0] || options.title?.trim() || deck.name;
  const body = page?.[1] || options.description?.trim() || deck.coverSubtitle;
  const elements = creativeElements(deck, palette, title, body, page?.[2] || 'cover', pageIndex);
  return {
    ...newSlide(), ...sizes[deck.format], kind: 'canvas', title, tag: deck.categoryLabel,
    visualTheme: theme, background: palette.bg, backgroundFill: {mode: 'solid'},
    elements
  };
}
