// Photos are curated from Pexels and bundled as WebP so previews still load
// when the editor is accessed locally or over an unreliable connection.
const photos = {
  cake: [30307704, 'Bolo de morango com balões'],
  candles: [8199267, 'Velas acesas sobre um bolo de morango'],
  birthday: [34223327, 'Mesa de aniversário com bolo e balões'],
  coast: [39763693, 'Praia cercada por falésias'],
  waves: [40538877, 'Ondas chegando à praia'],
  road: [30302401, 'Estrada junto ao mar'],
  vinyl: [18337073, 'Toca-discos vintage'],
  records: [5118730, 'Discos de vinil sobre uma mesa'],
  cinema: [14355932, 'Fachada de cinema à noite'],
  clay: [30147980, 'Mãos moldando barro no torno'],
  brunch: [27080346, 'Panquecas e café'],
  book: [29159202, 'Livro aberto sobre a mesa'],
  market: [24194087, 'Limonada e sanduíches em uma toalha de piquenique'],
  picnic: [5038288, 'Toalha de piquenique com flores'],
  coffee: [10260855, 'Câmeras, livros e discos sobre uma mesa'],
  dog: [33693532, 'Cachorro dormindo no sofá'],
  matcha: [32599385, 'Matchá gelado em um copo'],
  city: [5741419, 'Luzes refletidas na calçada molhada'],
  neon: [30174038, 'Reflexos de neon na rua à noite'],
  flowers: [27542807, 'Flores em um vaso junto à janela'],
  bakery: [31298152, 'Bolos decorados com morango'],
  lemonade: [5947105, 'Limonada caseira em um copo com canudo'],
  friends: [7568999, 'Amigos conversando em um piquenique'],
  outfit: [3927390, 'Roupas e acessórios vistos de cima'],
  show: [1309599, 'Silhuetas diante das luzes de um show']
};

const photoPath = name => './catalog-photos/' + name + '.webp';
const photoPaths = new Set(Object.keys(photos).map(photoPath));
const artwork = new Set(['morango', 'flor', 'citrus', 'xicara', 'pauta-wide', 'pauta-tall', 'pauta-square',
  ...['wide', 'tall', 'square'].flatMap(size => ['rosa', 'erva'].map(color => 'convite-' + size + '-' + color))
]);
const artPath = name => './catalog-art/' + name + '.webp';
const artPaths = new Set(Array.from(artwork, artPath));
export const isCatalogPhoto = value => photoPaths.has(value) || artPaths.has(value);

export function catalogArt(name, imageAlt) {
  return {image: artPath(name), imageAlt, imageFit: 'contain', imageSource: artPath(name),
    imageCredit: 'Storage Lab', imageLicense: 'Integrado · Livre para editar'};
}

export function catalogPhoto(name) {
  const [sourceId, imageAlt] = photos[name];
  return {
    image: photoPath(name),
    imageAlt,
    imageFit: 'cover',
    imageSource: 'https://www.pexels.com/photo/' + sourceId + '/',
    imageLicense: 'Pexels License',
    imageCredit: 'Pexels'
  };
}
