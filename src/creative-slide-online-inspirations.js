const revealTheme = name => ({
  source: 'open-source',
  collection: 'revealjs-themes',
  collectionLabel: `Reveal.js · ${name}`,
  author: 'Hakim El Hattab e colaboradores do reveal.js',
  license: 'MIT',
  licenseShort: 'MIT',
  upstreamName: `Tema ${name} do reveal.js`,
  sourceUrl: `https://github.com/hakimel/reveal.js/blob/master/css/theme/${name}.scss`,
  licenseUrl: 'https://github.com/hakimel/reveal.js/blob/master/LICENSE'
});

const slidevTheme = (name, author) => ({
  source: 'open-source',
  collection: 'slidev-themes',
  collectionLabel: `Slidev Themes · ${name}`,
  author,
  license: 'MIT',
  licenseShort: 'MIT',
  upstreamName: `Tema ${name} do Slidev`,
  sourceUrl: `https://github.com/slidevjs/themes/tree/main/packages/theme-${name}`,
  licenseUrl: 'https://github.com/slidevjs/themes/blob/main/LICENSE'
});

export const onlineSources = {
  'reveal-serif': revealTheme('serif'),
  'reveal-beige': revealTheme('beige'),
  'reveal-league': revealTheme('league'),
  'reveal-solarized': revealTheme('solarized'),
  'reveal-sky': revealTheme('sky'),
  'reveal-moon': revealTheme('moon'),
  'reveal-blood': revealTheme('blood'),
  'reveal-simple': revealTheme('simple'),
  'reveal-white': revealTheme('white'),
  'reveal-dracula': revealTheme('dracula'),
  'reveal-night': revealTheme('night'),
  'slidev-seriph': slidevTheme('seriph', 'Anthony Fu · Slidev'),
  'slidev-shibainu': slidevTheme('shibainu', 'iiiiiiinès · Slidev'),
  'slidev-apple-basic': slidevTheme('apple-basic', 'Jeremy Meissner · Slidev'),
  'slidev-bricks': slidevTheme('bricks', 'iiiiiiinès · Slidev'),
  'marp-core': {
    source: 'open-source',
    collection: 'marp-core',
    collectionLabel: 'Marp · Gaia e Uncover',
    author: 'Marp team',
    license: 'MIT',
    licenseShort: 'MIT',
    upstreamName: 'Layouts originais inspirados nos temas Gaia e Uncover do Marp',
    sourceUrl: 'https://github.com/marp-team/marp-core/tree/main/themes',
    licenseUrl: 'https://github.com/marp-team/marp-core/blob/main/LICENSE'
  },
  webslides: {
    source: 'open-source',
    collection: 'webslides',
    collectionLabel: 'WebSlides · demos',
    author: 'José Luis Antúnez e colaboradores do WebSlides',
    license: 'MIT',
    licenseShort: 'MIT',
    upstreamName: 'Layouts originais inspirados nas demonstrações do WebSlides',
    sourceUrl: 'https://github.com/webslides/WebSlides/tree/master/demos',
    licenseUrl: 'https://github.com/webslides/WebSlides/blob/master/LICENSE'
  },
  'impress-js': {
    source: 'open-source',
    collection: 'impress-js',
    collectionLabel: 'impress.js · exemplos',
    author: 'Bartek Szopka e colaboradores do impress.js',
    license: 'MIT',
    licenseShort: 'MIT',
    upstreamName: 'Layouts originais inspirados nos exemplos espaciais do impress.js',
    sourceUrl: 'https://github.com/impress/impress.js/tree/master/examples',
    licenseUrl: 'https://github.com/impress/impress.js/blob/master/LICENSE'
  },
  'gnab-remark': {
    source: 'open-source',
    collection: 'gnab-remark',
    collectionLabel: 'remark.js · apresentações Markdown',
    author: 'O. Petter Bang e colaboradores do remark.js',
    license: 'MIT',
    licenseShort: 'MIT',
    upstreamName: 'Layouts originais inspirados nas apresentações remark.js',
    sourceUrl: 'https://github.com/gnab/remark',
    licenseUrl: 'https://github.com/gnab/remark/blob/develop/LICENSE'
  }
};

export const onlineDeckConcepts = [
  ['analog-film-notes', 'Caderno de Filme', 'Diário de fotografia analógica para guardar cenas, luz e histórias de cada rolo.', 'criativo', 'night', '16:9', 'Um rolo, muitas maneiras de olhar', [
    ['Rolo 01', '36 poses\nUma câmera sem tela\nLuz no visor'], ['Revelação', 'O que mudou entre apertar e revelar?'], ['Detalhe em foco', 'Registre um recorte que teria passado despercebido.']
  ], 'reveal-serif'],
  ['slow-coffee-ritual', 'Café em Camadas', 'Pequeno guia visual para experimentar moagem, aroma e receitas de café em casa.', 'cotidiano', 'clay', '16:9', 'Um ritual simples para começar devagar', [
    ['Prove primeiro', 'Aroma\nAcidez\nFinalização'], ['Moagem', 'Ajuste uma coisa por vez e anote o resultado.'], ['A receita da casa', 'Duas colheres para cada xícara, sem pressa.']
  ], 'reveal-beige'],
  ['city-window-gallery', 'Janelas da Cidade', 'Passeio fotográfico para descobrir molduras, reflexos e fachadas pelo caminho.', 'criativo', 'blue', '16:9', 'Olhe para cima e descubra outra cidade', [
    ['Olhe para cima', 'Molduras\nReflexos\nPersianas'], ['Luz e sombra', 'Volte ao mesmo lugar em outro horário.'], ['Uma fachada', 'Escolha um detalhe que quase ninguém nota.']
  ], 'reveal-league'],
  ['garden-seed-swap', 'Troca de Sementes', 'Encontro de jardinagem para compartilhar sementes, acompanhar brotos e trocar dicas.', 'cotidiano', 'mint', '16:9', 'Plante uma ideia e leve outra para casa', [
    ['Trocas da semana', 'Manjericão\nTomate\nGirassol'], ['Antes de plantar', 'Etiquete, umedeça e deixe perto da luz.'], ['Pequeno progresso', 'Anote o primeiro broto e a data.']
  ], 'reveal-solarized'],
  ['vinyl-side-stories', 'Lados do Vinil', 'Clube de escuta para escolher faixas, conversar sobre capas e compartilhar descobertas.', 'cultura', 'night', '16:9', 'Uma audição compartilhada, faixa por faixa', [
    ['Lado A', 'Uma voz que aproxima\nUm ritmo para cozinhar\nUma faixa surpresa'], ['A capa favorita', 'Repare nos detalhes da arte antes de ouvir.'], ['Faixa emprestada', 'Escreva quem recomendou esse disco.']
  ], 'slidev-seriph'],
  ['weekend-market-route', 'Rota da Feira', 'Roteiro vertical de feira com bancas favoritas, compras da estação e pausa para café.', 'cotidiano', 'soda', '9:16', 'Três paradas para uma manhã bem aproveitada', [
    ['Primeiro a banca', 'Fruta da estação\nQueijo\nFlores'], ['Rota curta', 'Comece na ponta e termine no café.'], ['Um achado', 'Anote a banca para voltar na próxima semana.']
  ], 'reveal-sky'],
  ['night-bus-postcards', 'Último Ônibus', 'Cartões noturnos para registrar trajetos, luzes da cidade e lugares para revisitar.', 'viagens', 'blue', '9:16', 'A cidade vista pela janela do ônibus', [
    ['Último ônibus', 'Linha ___\nParada ___\nHora ___'], ['Pela janela', 'Registre as luzes que aparecem entre os prédios.'], ['Ponto de volta', 'Marque o lugar que você quer visitar de dia.']
  ], 'reveal-moon'],
  ['backstage-show-diary', 'Bastidores do Show', 'Diário de bolso para planejar o encontro, guardar o setlist e lembrar do bis.', 'cultura', 'neon', '9:16', 'Antes, durante e depois da música ao vivo', [
    ['Antes de abrir', 'Pulseira\nPonto de encontro\nBateria extra'], ['Passagem de som', 'O primeiro acorde mudou a expectativa?'], ['No meio da plateia', 'Guarde um instante que não saiu no vídeo.']
  ], 'reveal-blood'],
  ['pet-park-moments', 'Passeio de Patinhas', 'Story vertical para acompanhar passeios, paradas favoritas e momentos do parque com seu pet.', 'memorias', 'peach', '9:16', 'Uma volta no parque pela perspectiva dele', [
    ['O passeio', 'Guia confortável\nÁgua\nPetisco'], ['Parada favorita', 'Ele sempre escolhe o mesmo caminho.'], ['Cara de feliz', 'Salve a expressão depois da corrida.']
  ], 'slidev-shibainu'],
  ['thrift-store-lookbook', 'Achados de Brechó', 'Lookbook vertical para registrar peças garimpadas e testar combinações com o que já existe no armário.', 'criativo', 'lilac', '9:16', 'Uma peça encontrada, três jeitos de usar', [
    ['Na arara', 'Uma cor\nUma textura\nUma peça surpresa'], ['Prove sem pressa', 'O caimento importa mais que a etiqueta.'], ['Nova combinação', 'Misture a peça achada com algo que já tem.']
  ], 'slidev-apple-basic'],
  ['recipe-zine-oven', 'Zine de Fornada', 'Caderninho quadrado para documentar fornadas, ajustes de receita e acabamentos simples.', 'cotidiano', 'berry', '1:1', 'Uma receita, uma fornada de cada vez', [
    ['A massa', 'Farinha\nManteiga\nFruta da estação'], ['Forno aquecido', 'Observe cor e aroma antes de marcar o tempo.'], ['Cobertura', 'Escolha um acabamento simples que deixe a massa brilhar.']
  ], 'reveal-simple'],
  ['sea-glass-collection', 'Coleção à Beira-Mar', 'Álbum quadrado de cores, texturas e pequenas descobertas feitas durante uma caminhada na praia.', 'viagens', 'sky', '1:1', 'O mar muda, cada visita também', [
    ['Achados da praia', 'Vidro polido\nConcha vazia\nPedra lisa'], ['Onde procurar', 'Depois da maré baixa, sem levar seres vivos.'], ['Cor da água', 'Compare com a próxima visita, sem filtros.']
  ], 'reveal-white'],
  ['board-game-night', 'Noite de Jogos de Mesa', 'Convite quadrado para escolher jogos, combinar a mesa e guardar as melhores jogadas da noite.', 'festas', 'neon', '1:1', 'Uma partida rápida ou uma revanche?', [
    ['Escolha a mesa', 'Jogo rápido\nJogo cooperativo\nJogo de blefe'], ['Regras da noite', 'Uma partida para aprender, outra para inventar.'], ['Jogada memorável', 'Escreva o momento que virou a rodada.']
  ], 'reveal-dracula'],
  ['flower-color-club', 'Arranjo de Estação', 'Carrossel quadrado para experimentar cores, alturas e combinações com flores da estação.', 'criativo', 'sakura', '1:1', 'Um vaso, três decisões de cor', [
    ['Paleta de pétalas', 'Rosa suave\nAmarelo quente\nVerde folha'], ['Montagem', 'Comece pelas folhas e encontre o ponto focal.'], ['Um vaso só', 'Mude a altura de um ramo e observe a diferença.']
  ], 'reveal-night'],
  ['rooftop-movie-night', 'Cinema no Terraço', 'Convite quadrado para uma sessão ao ar livre com filme escolhido em grupo e pausa para pipoca.', 'festas', 'sunset', '1:1', 'Uma sessão ao ar livre, sem pressa', [
    ['Sessão no terraço', 'Horário do pôr do sol\nManta no chão\nFilme escolhido'], ['Preparar a tela', 'Teste a projeção antes de escurecer.'], ['Pausa para pipoca', 'Conte qual cena virou conversa.']
  ], 'slidev-bricks']
];

export const onlineStoryPages = {
  'analog-film-notes': [
    ['Carregar o rolo', 'Confira a luz antes de sair.', 'heart-list'],
    ['A espera', 'A foto só aparece depois; aproveite o caminho.', 'cloud-page'],
    ['Sem apagar', 'Cada quadro guarda uma tentativa.', 'sticker-page'],
    ['Folha de contato', 'Escolha a sequência antes da foto final.', 'album']
  ],
  'slow-coffee-ritual': [
    ['Três notas', 'Aroma\nAcidez\nFinalização', 'heart-list'],
    ['A água', 'Mude a temperatura aos poucos e prove.', 'cloud-page'],
    ['Receita de hoje', 'Guarde a proporção que ficou equilibrada.', 'sticker-page'],
    ['Próximo domingo', 'Deixe um espaço para testar outro grão.', 'album']
  ],
  'city-window-gallery': [
    ['Repare na rua', 'Uma varanda\nUm letreiro\nUma sombra', 'heart-list'],
    ['Outro horário', 'A mesma fachada muda com a luz.', 'cloud-page'],
    ['Recorte favorito', 'Aproxime a imagem até restar só a forma.', 'sticker-page'],
    ['Mapa de janelas', 'Marque as ruas que você quer revisitar.', 'album']
  ],
  'garden-seed-swap': [
    ['Leve para trocar', 'Sementes\nEtiquetas\nUma história da planta', 'heart-list'],
    ['O combinado', 'Compartilhe o nome e a época de plantio.', 'cloud-page'],
    ['Primeiro broto', 'Anote quando apareceu e onde ficou o vaso.', 'sticker-page'],
    ['Próxima troca', 'Deixe espaço para a muda que vai chegar.', 'album']
  ],
  'vinyl-side-stories': [
    ['Três faixas', 'Uma descoberta\nUma lembrança\nUma surpresa', 'heart-list'],
    ['O lado B', 'Escolha a faixa que quase sempre passa despercebida.', 'cloud-page'],
    ['Capa e encarte', 'Guarde uma nota sobre a arte ou a letra.', 'sticker-page'],
    ['Outra audição', 'Anote quem leva o próximo disco.', 'album']
  ],
  'weekend-market-route': [
    ['Na sacola', 'Fruta da estação\nPão fresco\nFlores', 'heart-list'],
    ['Parada para café', 'Sente perto da janela e reveja a lista.', 'cloud-page'],
    ['Receita rápida', 'Misture o que amadurece primeiro.', 'sticker-page'],
    ['Banca favorita', 'Marque onde voltar na próxima semana.', 'album']
  ],
  'night-bus-postcards': [
    ['Depois da janela', 'Uma rua\nUm reflexo\nUma luz acesa', 'heart-list'],
    ['Mudou o caminho', 'Desça uma parada antes e caminhe com atenção.', 'cloud-page'],
    ['Lugar para voltar', 'Guarde o nome da rua e o horário da foto.', 'sticker-page'],
    ['Último cartão', 'Uma lembrança pequena do caminho para casa.', 'album']
  ],
  'backstage-show-diary': [
    ['Ponto de encontro', 'Portão\nHorário\nPessoa de referência', 'heart-list'],
    ['Primeira música', 'Anote o que a banda tocou para começar.', 'cloud-page'],
    ['Grito favorito', 'Qual refrão todo mundo cantou junto?', 'sticker-page'],
    ['Depois do bis', 'Guarde a lembrança antes que a bateria acabe.', 'album']
  ],
  'pet-park-moments': [
    ['Três paradas', 'Portão\nÁrvore\nBebedouro', 'heart-list'],
    ['Rota favorita', 'Siga o caminho que ele escolhe hoje.', 'cloud-page'],
    ['Pausa para água', 'Um momento tranquilo também merece registro.', 'sticker-page'],
    ['Volta completa', 'Marque o lugar que virou tradição.', 'album']
  ],
  'thrift-store-lookbook': [
    ['Antes de provar', 'Veja o tecido\nConfira o caimento\nProcure sinais de uso', 'heart-list'],
    ['Duas combinações', 'Teste com uma peça neutra e outra colorida.', 'cloud-page'],
    ['Detalhe útil', 'Bolso, botão ou costura: o que fez diferença?', 'sticker-page'],
    ['Garimpo do dia', 'Anote a peça e a ideia que ela trouxe.', 'album']
  ],
  'recipe-zine-oven': [
    ['Antes de começar', 'Separe os ingredientes e aqueça o forno.', 'heart-list'],
    ['Ponto da massa', 'A textura conta mais que o relógio.', 'cloud-page'],
    ['Acabamento simples', 'Deixe a fruta ou a crosta aparecer.', 'sticker-page'],
    ['Anote a fornada', 'Registre o que mudaria na próxima vez.', 'album']
  ],
  'sea-glass-collection': [
    ['Observe sem levar', 'Cor\nTextura\nMarcas do tempo', 'heart-list'],
    ['Maré baixa', 'Caminhe onde a areia está firme e segura.', 'cloud-page'],
    ['Devolva à praia', 'Conchas e seres vivos ficam no lugar.', 'sticker-page'],
    ['Diário da costa', 'Desenhe a paleta que encontrou no caminho.', 'album']
  ],
  'board-game-night': [
    ['Mesa pronta', 'Jogo escolhido\nLanches no centro\nRegras à vista', 'heart-list'],
    ['Primeira rodada', 'Uma partida curta ajuda todo mundo a aprender.', 'cloud-page'],
    ['Jogada inesperada', 'Guarde a virada que mudou a mesa.', 'sticker-page'],
    ['Próxima revanche', 'Anote o jogo que ficou para depois.', 'album']
  ],
  'flower-color-club': [
    ['Escolha três tons', 'Uma cor principal\nUma de apoio\nUma folha de contraste', 'heart-list'],
    ['Alturas diferentes', 'Comece pelo ramo mais alto e equilibre aos poucos.', 'cloud-page'],
    ['Vaso da semana', 'Use flores da estação e observe quanto duram.', 'sticker-page'],
    ['Composição final', 'Guarde o nome das flores e a paleta do dia.', 'album']
  ],
  'rooftop-movie-night': [
    ['Convide a turma', 'Filme escolhido\nManta compartilhada\nPipoca para dividir', 'heart-list'],
    ['Teste antes', 'Confira som e imagem enquanto ainda há luz.', 'cloud-page'],
    ['Cena que ficou', 'Anote o momento que virou conversa.', 'sticker-page'],
    ['Próxima sessão', 'Deixe a escolha do próximo filme em aberto.', 'album']
  ]
};
