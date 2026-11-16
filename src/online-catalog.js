// Catálogo da biblioteca online de modelos 3D gratuitos.
// Fontes: NASA 3D Resources (domínio público, sem necessidade de crédito) e
// modelos CC0 do Kenney espelhados no GitHub. Todos baixados sob demanda do
// raw.githubusercontent.com e salvos na aula como um modelo enviado.
// Para trocar um espelho, basta ajustar as URLs base abaixo.

const NASA_RAW = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/';
const KENNEY_RAW = 'https://raw.githubusercontent.com/shorepine/kenney/main/';

export const ONLINE_MODEL_GROUPS = [
  { id: 'espaco',    label: 'Espaço e Astronomia' },
  { id: 'missoes',   label: 'Foguetes e Missões' },
  { id: 'marte',     label: 'Marte e Rovers' },
  { id: 'clima',     label: 'Terra e Clima' },
  { id: 'natureza',  label: 'Natureza e Plantas' },
  { id: 'animais',   label: 'Animais' },
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'historia',  label: 'Idade Média' }
];

export const ONLINE_MODELS = [
  { id: 'nasa-hubble', name: 'Telescópio Espacial Hubble', group: 'espaco', source: 'nasa', file: '3D Models/Hubble Space Telescope (A)/Hubble Space Telescope (A).glb', bytes: 1694988 },
  { id: 'nasa-webb', name: 'Telescópio Espacial James Webb', group: 'espaco', source: 'nasa', file: '3D Models/James Webb Space Telescope (A)/James Webb Space Telescope (A).glb', bytes: 4710016 },
  { id: 'nasa-roman', name: 'Telescópio Nancy Grace Roman', group: 'espaco', source: 'nasa', file: '3D Models/Nancy Grace Roman Space Telescope (A)/Nancy Grace Roman Space Telescope (A).glb', bytes: 2672000 },
  { id: 'nasa-chandra', name: 'Observatório de Raios-X Chandra', group: 'espaco', source: 'nasa', file: '3D Models/Chandra X-ray Observatory/Chandra X-ray Observatory.glb', bytes: 998500 },
  { id: 'nasa-spitzer', name: 'Telescópio Espacial Spitzer', group: 'espaco', source: 'nasa', file: '3D Models/Spitzer Space Telescope/Spitzer Space Telescope.glb', bytes: 251388 },
  { id: 'nasa-voyager', name: 'Sonda Voyager', group: 'espaco', source: 'nasa', file: '3D Models/Voyager Probe (A)/Voyager Probe (A).glb', bytes: 285936 },
  { id: 'nasa-parker', name: 'Sonda Solar Parker', group: 'espaco', source: 'nasa', file: '3D Models/Parker Solar Probe/Parker Solar Probe.glb', bytes: 443572 },
  { id: 'nasa-cassini', name: 'Sonda Cassini-Huygens', group: 'espaco', source: 'nasa', file: '3D Models/Cassini-Huygens (A)/Cassini-Huygens (A).glb', bytes: 1660492 },
  { id: 'nasa-juno', name: 'Sonda Juno (Júpiter)', group: 'espaco', source: 'nasa', file: '3D Models/Juno (A)/Juno (A).glb', bytes: 8999028 },
  { id: 'nasa-galileo', name: 'Sonda Galileo (Júpiter)', group: 'espaco', source: 'nasa', file: '3D Models/Galileo/Galileo.glb', bytes: 248532 },
  { id: 'nasa-bennu', name: 'Asteroide Bennu', group: 'espaco', source: 'nasa', file: '3D Models/1999 RQ36 asteroid/1999 RQ36 asteroid.glb', bytes: 329596 },
  { id: 'nasa-cassiopeia', name: 'Supernova Cassiopeia A', group: 'espaco', source: 'nasa', file: '3D Models/Cassiopeia A Supernova/Cassiopeia A Supernova.glb', bytes: 10475620 },
  { id: 'nasa-veu', name: 'Nebulosa do Véu (Cygnus Loop)', group: 'espaco', source: 'nasa', file: '3D Models/Cygnus Loop Supernova/Cygnus Loop Supernova.glb', bytes: 2888172 },
  { id: 'nasa-saturno-v', name: 'Foguete Saturno V', group: 'missoes', source: 'nasa', file: '3D Models/Saturn V/Saturn V.glb', bytes: 927212 },
  { id: 'nasa-atlas', name: 'Foguete Atlas (Friendship 7)', group: 'missoes', source: 'nasa', file: '3D Models/Atlas 6 (Friendship 7)/Atlas 6 (Friendship 7).glb', bytes: 1026724 },
  { id: 'nasa-jupiter-c', name: 'Foguete Jupiter-C', group: 'missoes', source: 'nasa', file: '3D Models/Explorer Jupiter-C Rocket/Explorer Jupiter-C Rocket.glb', bytes: 149372 },
  { id: 'nasa-gemini', name: 'Cápsula Gemini', group: 'missoes', source: 'nasa', file: '3D Models/Gemini/Gemini.glb', bytes: 1387812 },
  { id: 'nasa-apolo-lunar', name: 'Módulo Lunar Apollo', group: 'missoes', source: 'nasa', file: '3D Models/Apollo Lunar Module/Apollo Lunar Module.glb', bytes: 716840 },
  { id: 'nasa-onibus-espacial', name: 'Ônibus Espacial', group: 'missoes', source: 'nasa', file: '3D Models/Space Shuttle (A)/Space Shuttle (A).glb', bytes: 1194068 },
  { id: 'nasa-apolo-soyuz', name: 'Missão Apollo-Soyuz', group: 'missoes', source: 'nasa', file: '3D Models/Apollo Soyuz/Apollo Soyuz.glb', bytes: 952608 },
  { id: 'nasa-iss', name: 'Estação Espacial Internacional', group: 'missoes', source: 'nasa', file: '3D Models/International Space Station (ISS) (B)/International Space Station (ISS) (B).glb', bytes: 476992 },
  { id: 'nasa-canadarm', name: 'Braço Robótico Canadarm', group: 'missoes', source: 'nasa', file: '3D Models/Space Shuttle Remote Manipulator System (Canadarm)/Space Shuttle Remote Manipulator System (Canadarm).glb', bytes: 271276 },
  { id: 'nasa-astronauta', name: 'Astronauta', group: 'missoes', source: 'nasa', file: '3D Models/Astronaut/Astronaut.glb', bytes: 762988 },
  { id: 'nasa-traje', name: 'Traje de Escape da Tripulação', group: 'missoes', source: 'nasa', file: '3D Models/Advanced Crew Escape Suit/Advanced Crew Escape Suit.glb', bytes: 858408 },
  { id: 'nasa-cubesat', name: 'CubeSat (1U)', group: 'missoes', source: 'nasa', file: '3D Models/CubeSat - 1 RU Generic/CubeSat - 1 RU Generic.glb', bytes: 149424 },
  { id: 'nasa-vela-solar', name: 'Vela Solar (conceito)', group: 'missoes', source: 'nasa', file: '3D Models/Solar Sail Concept/Solar Sail Concept.glb', bytes: 235524 },
  { id: 'nasa-lro', name: 'Orbitador Lunar (LRO)', group: 'missoes', source: 'nasa', file: '3D Models/Lunar Reconnaissance Orbiter (A)/Lunar Reconnaissance Orbiter (A).glb', bytes: 654500 },
  { id: 'nasa-perseverance', name: 'Rover Perseverance', group: 'marte', source: 'nasa', file: '3D Models/Mars 2020 Perseverance Rover/Mars 2020 Perseverance Rover.glb', bytes: 4987176 },
  { id: 'nasa-ingenuity', name: 'Helicóptero Ingenuity', group: 'marte', source: 'nasa', file: '3D Models/Ingenuity Mars Helicopter/Ingenuity Mars Helicopter.glb', bytes: 2019408 },
  { id: 'nasa-opportunity', name: 'Rover Opportunity', group: 'marte', source: 'nasa', file: '3D Models/Mars Exploration Rover - Opportunity (MER-B)/Mars Exploration Rover - Opportunity (MER-B).glb', bytes: 36668 },
  { id: 'nasa-odyssey', name: 'Mars Odyssey', group: 'marte', source: 'nasa', file: '3D Models/Mars Odyssey/Mars Odyssey.glb', bytes: 5801372 },
  { id: 'nasa-goes', name: 'Satélite Meteorológico GOES', group: 'clima', source: 'nasa', file: '3D Models/Geostationary Operational Environmental Satellites/Geostationary Operational Environmental Satellites.glb', bytes: 335620 },
  { id: 'nasa-trmm', name: 'Satélite de Chuvas Tropicais (TRMM)', group: 'clima', source: 'nasa', file: '3D Models/Tropical Rainfall Measuring Mission (TRMM)/Tropical Rainfall Measuring Mission (TRMM).glb', bytes: 195804 },
  { id: 'nasa-jason', name: 'Satélite Jason-2 (nível do oceano)', group: 'clima', source: 'nasa', file: '3D Models/Ocean Surface Topography Mission (OSTM Jason-2)/Ocean Surface Topography Mission (OSTM Jason-2).glb', bytes: 924688 },
  { id: 'nasa-aqua', name: 'Satélite Aqua (ciclo da água)', group: 'clima', source: 'nasa', file: '3D Models/Aqua (A)/Aqua (A).glb', bytes: 1994440 },
  { id: 'nasa-cloudsat', name: 'Satélite CloudSat (nuvens)', group: 'clima', source: 'nasa', file: '3D Models/CloudSat (A)/CloudSat (A).glb', bytes: 267656 },
  { id: 'nasa-sdo', name: 'Observatório Solar Dynamics', group: 'clima', source: 'nasa', file: '3D Models/Solar Dynamics Observatory/Solar Dynamics Observatory.glb', bytes: 497844 },
  { id: 'ken-arvore', name: 'Árvore Frondosa', group: 'natureza', source: 'kenney', file: '3d/nature/tree_detailed.glb', bytes: 31412 },
  { id: 'ken-arvore-outono', name: 'Árvore de Outono', group: 'natureza', source: 'kenney', file: '3d/nature/tree_detailed_fall.glb', bytes: 31404 },
  { id: 'ken-pinheiro', name: 'Pinheiro', group: 'natureza', source: 'kenney', file: '3d/nature/tree_pineRoundA.glb', bytes: 14488 },
  { id: 'ken-palmeira', name: 'Palmeira', group: 'natureza', source: 'kenney', file: '3d/nature/tree_palmDetailedTall.glb', bytes: 28204 },
  { id: 'ken-cacto', name: 'Cacto', group: 'natureza', source: 'kenney', file: '3d/nature/cactus_tall.glb', bytes: 9668 },
  { id: 'ken-trigo', name: 'Plantação de Trigo', group: 'natureza', source: 'kenney', file: '3d/nature/crops_wheatStageA.glb', bytes: 56228 },
  { id: 'ken-milho', name: 'Pé de Milho', group: 'natureza', source: 'kenney', file: '3d/nature/crops_cornStageD.glb', bytes: 29316 },
  { id: 'ken-bambu', name: 'Bambu', group: 'natureza', source: 'kenney', file: '3d/nature/crops_bambooStageB.glb', bytes: 40144 },
  { id: 'ken-flor-vermelha', name: 'Flor Vermelha', group: 'natureza', source: 'kenney', file: '3d/nature/flower_redB.glb', bytes: 8080 },
  { id: 'ken-flor-amarela', name: 'Flor Amarela', group: 'natureza', source: 'kenney', file: '3d/nature/flower_yellowA.glb', bytes: 7120 },
  { id: 'ken-flor-roxa', name: 'Flor Roxa', group: 'natureza', source: 'kenney', file: '3d/nature/flower_purpleA.glb', bytes: 7112 },
  { id: 'ken-cogumelos', name: 'Cogumelos', group: 'natureza', source: 'kenney', file: '3d/nature/mushroom_redGroup.glb', bytes: 14960 },
  { id: 'ken-arbusto', name: 'Arbusto', group: 'natureza', source: 'kenney', file: '3d/nature/plant_bushDetailed.glb', bytes: 10172 },
  { id: 'ken-grama', name: 'Tufos de Grama', group: 'natureza', source: 'kenney', file: '3d/nature/grass_leafsLarge.glb', bytes: 13988 },
  { id: 'ken-pedra', name: 'Pedra Grande', group: 'natureza', source: 'kenney', file: '3d/nature/rock_largeA.glb', bytes: 7552 },
  { id: 'ken-tronco', name: 'Tronco Caído', group: 'natureza', source: 'kenney', file: '3d/nature/log.glb', bytes: 14288 },
  { id: 'ken-toco', name: 'Toco de Árvore', group: 'natureza', source: 'kenney', file: '3d/nature/stump_roundDetailed.glb', bytes: 8188 },
  { id: 'ken-abelha', name: 'Abelha', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-bee.glb', bytes: 164356 },
  { id: 'ken-lagarta', name: 'Lagarta', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-caterpillar.glb', bytes: 130968 },
  { id: 'ken-pintinho', name: 'Pintinho', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-chick.glb', bytes: 125424 },
  { id: 'ken-peixe', name: 'Peixe', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-fish.glb', bytes: 91584 },
  { id: 'ken-caranguejo', name: 'Caranguejo', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-crab.glb', bytes: 150768 },
  { id: 'ken-gato', name: 'Gato', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-cat.glb', bytes: 165164 },
  { id: 'ken-cachorro', name: 'Cachorro', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-dog.glb', bytes: 119544 },
  { id: 'ken-coelho', name: 'Coelho', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-bunny.glb', bytes: 131568 },
  { id: 'ken-vaca', name: 'Vaca', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-cow.glb', bytes: 128084 },
  { id: 'ken-porco', name: 'Porco', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-pig.glb', bytes: 127032 },
  { id: 'ken-raposa', name: 'Raposa', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-fox.glb', bytes: 141880 },
  { id: 'ken-veado', name: 'Veado', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-deer.glb', bytes: 150400 },
  { id: 'ken-castor', name: 'Castor', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-beaver.glb', bytes: 149728 },
  { id: 'ken-leao', name: 'Leão', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-lion.glb', bytes: 172936 },
  { id: 'ken-tigre', name: 'Tigre', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-tiger.glb', bytes: 172348 },
  { id: 'ken-elefante', name: 'Elefante', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-elephant.glb', bytes: 148892 },
  { id: 'ken-girafa', name: 'Girafa', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-giraffe.glb', bytes: 132676 },
  { id: 'ken-macaco', name: 'Macaco', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-monkey.glb', bytes: 174944 },
  { id: 'ken-panda', name: 'Panda', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-panda.glb', bytes: 133624 },
  { id: 'ken-papagaio', name: 'Papagaio', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-parrot.glb', bytes: 154124 },
  { id: 'ken-pinguim', name: 'Pinguim', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-penguin.glb', bytes: 130396 },
  { id: 'ken-urso-polar', name: 'Urso Polar', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-polar.glb', bytes: 98964 },
  { id: 'ken-coala', name: 'Coala', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-koala.glb', bytes: 131008 },
  { id: 'ken-javali', name: 'Javali', group: 'animais', source: 'kenney', file: '3d/cube-pets/animal-hog.glb', bytes: 141596 },
  { id: 'ken-maca', name: 'Maçã', group: 'alimentos', source: 'kenney', file: '3d/food/apple.glb', bytes: 14376 },
  { id: 'ken-banana', name: 'Banana', group: 'alimentos', source: 'kenney', file: '3d/food/banana.glb', bytes: 12348 },
  { id: 'ken-laranja', name: 'Laranja', group: 'alimentos', source: 'kenney', file: '3d/food/orange.glb', bytes: 13088 },
  { id: 'ken-limao', name: 'Limão', group: 'alimentos', source: 'kenney', file: '3d/food/lemon.glb', bytes: 11924 },
  { id: 'ken-morango', name: 'Morango', group: 'alimentos', source: 'kenney', file: '3d/food/strawberry.glb', bytes: 16620 },
  { id: 'ken-uvas', name: 'Uvas', group: 'alimentos', source: 'kenney', file: '3d/food/grapes.glb', bytes: 58992 },
  { id: 'ken-melancia', name: 'Melancia', group: 'alimentos', source: 'kenney', file: '3d/food/watermelon.glb', bytes: 93884 },
  { id: 'ken-abacaxi', name: 'Abacaxi', group: 'alimentos', source: 'kenney', file: '3d/food/pineapple.glb', bytes: 20248 },
  { id: 'ken-pera', name: 'Pera', group: 'alimentos', source: 'kenney', file: '3d/food/pear.glb', bytes: 15556 },
  { id: 'ken-tomate', name: 'Tomate', group: 'alimentos', source: 'kenney', file: '3d/food/tomato.glb', bytes: 14084 },
  { id: 'ken-cenoura', name: 'Cenoura', group: 'alimentos', source: 'kenney', file: '3d/food/carrot.glb', bytes: 16364 },
  { id: 'ken-brocolis', name: 'Brócolis', group: 'alimentos', source: 'kenney', file: '3d/food/broccoli.glb', bytes: 20452 },
  { id: 'ken-espiga-milho', name: 'Espiga de Milho', group: 'alimentos', source: 'kenney', file: '3d/food/corn.glb', bytes: 14284 },
  { id: 'ken-berinjela', name: 'Berinjela', group: 'alimentos', source: 'kenney', file: '3d/food/eggplant.glb', bytes: 13416 },
  { id: 'ken-ovo', name: 'Ovo', group: 'alimentos', source: 'kenney', file: '3d/food/egg.glb', bytes: 6044 },
  { id: 'ken-pao', name: 'Pão', group: 'alimentos', source: 'kenney', file: '3d/food/bread.glb', bytes: 9468 },
  { id: 'ken-queijo', name: 'Queijo', group: 'alimentos', source: 'kenney', file: '3d/food/cheese.glb', bytes: 60976 },
  { id: 'ken-peixe-assado', name: 'Peixe Assado', group: 'alimentos', source: 'kenney', file: '3d/food/fish.glb', bytes: 31672 },
  { id: 'ken-salada', name: 'Salada', group: 'alimentos', source: 'kenney', file: '3d/food/salad.glb', bytes: 17200 },
  { id: 'ken-pizza', name: 'Pizza', group: 'alimentos', source: 'kenney', file: '3d/food/pizza.glb', bytes: 106780 },
  { id: 'ken-hamburguer', name: 'Hambúrguer', group: 'alimentos', source: 'kenney', file: '3d/food/burger-cheese.glb', bytes: 25900 },
  { id: 'ken-batata-frita', name: 'Batata Frita', group: 'alimentos', source: 'kenney', file: '3d/food/fries.glb', bytes: 59228 },
  { id: 'ken-bolo', name: 'Bolo', group: 'alimentos', source: 'kenney', file: '3d/food/cake.glb', bytes: 72884 },
  { id: 'ken-catapulta', name: 'Catapulta', group: 'historia', source: 'kenney', file: '3d/castle/siege-catapult.glb', bytes: 86164 },
  { id: 'ken-trabuco', name: 'Trabuco', group: 'historia', source: 'kenney', file: '3d/castle/siege-trebuchet.glb', bytes: 139848 },
  { id: 'ken-balista', name: 'Balista', group: 'historia', source: 'kenney', file: '3d/castle/siege-ballista.glb', bytes: 64608 },
  { id: 'ken-torre-cerco', name: 'Torre de Cerco', group: 'historia', source: 'kenney', file: '3d/castle/siege-tower.glb', bytes: 144200 },
  { id: 'ken-ariete', name: 'Ariete', group: 'historia', source: 'kenney', file: '3d/castle/siege-ram.glb', bytes: 103620 },
  { id: 'ken-torre-castelo', name: 'Torre de Castelo', group: 'historia', source: 'kenney', file: '3d/castle/tower-base.glb', bytes: 41724 },
  { id: 'ken-muralha', name: 'Muralha com Torre', group: 'historia', source: 'kenney', file: '3d/castle/wall-corner-half-tower.glb', bytes: 80020 },
  { id: 'ken-portao', name: 'Portão do Castelo', group: 'historia', source: 'kenney', file: '3d/castle/gate.glb', bytes: 13880 },
];

const GROUP_BY_ID = new Map(ONLINE_MODEL_GROUPS.map(g => [g.id, g]));

export function onlineGroupLabel(groupId) {
  return GROUP_BY_ID.get(groupId)?.label || 'Biblioteca';
}

export function onlineModelUrl(model) {
  const base = model.source === 'kenney' ? KENNEY_RAW : NASA_RAW;
  return base + model.file.split('/').map(encodeURIComponent).join('/');
}

export function onlineModelSizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
