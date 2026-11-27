// Paletas e créditos de modelos de apresentação sob licenças abertas
// permissivas (CC0 1.0, MIT, BSD, Apache 2.0 e CC-BY 3.0), permitindo
// redistribuição, adaptação e exportação no Storage Lab com atribuição
// completa aos autores e projetos originais.
//
// Fontes verificadas:
// 1. OpenPresentation Gallery (MIT License) — Copyright (c) 2026 OpenPresentation
//    https://github.com/OpenPresentation/gallery
// 2. Material Simple para LibreOffice Impress (MIT License) — Copyright (c) 2016 Darshan Soni
//    https://github.com/dohliam/libreoffice-impress-templates/tree/master/user-contrib/material-simple
// 3. The Document Foundation · LibreOffice Design Team (CC0 1.0 Universal)
//    https://github.com/dohliam/libreoffice-impress-templates
// 4. Apache OpenOffice Templates Community (BSD / Apache License 2.0 / CC-BY 3.0)
//    https://github.com/dohliam/libreoffice-impress-templates/tree/master/apache-oo

// Formato compacto: [id, nome, bg, end, accent, sec, fontHint]
// fontHint: 'sans' | 'serif' | 'tech'
const themeTuples = [
  // --- Material Simple (MIT — Darshan Soni) ---
  ['lo-material-blue', 'Material Azul (MIT)', '#f7fbff', '#dbeeff', '#0d47a1', '#2196f3', 'sans'],
  ['lo-material-teal', 'Material Verde-Água (MIT)', '#f3fbfa', '#d7f0ec', '#00695c', '#009688', 'sans'],
  ['lo-material-green', 'Material Verde (MIT)', '#f4fbf5', '#d9f0db', '#1b5e20', '#4caf50', 'sans'],
  ['lo-material-purple', 'Material Roxo (MIT)', '#faf5fc', '#ead6f2', '#4a148c', '#9c27b0', 'sans'],
  ['lo-material-red', 'Material Vermelho (MIT)', '#fff6f6', '#fcdcd9', '#b71c1c', '#f44336', 'sans'],
  ['lo-material-pink', 'Material Rosa (MIT)', '#fff5f8', '#fad4e1', '#880e4f', '#e91e63', 'sans'],
  ['lo-material-orange', 'Material Laranja (MIT)', '#fffaf2', '#ffe8c7', '#bf360c', '#ff9800', 'sans'],
  ['lo-material-lime', 'Material Lima (MIT)', '#fafcf0', '#eef3c8', '#687010', '#9e9d24', 'sans'],
  ['lo-material-yellow', 'Material Âmbar (MIT)', '#fffdf0', '#fff4bf', '#9a4f00', '#f57f17', 'sans'],
  ['lo-material-brown', 'Material Café (MIT)', '#faf7f5', '#e6deda', '#3e2723', '#795548', 'serif'],
  ['lo-material-grey', 'Material Grafite (MIT)', '#fafafa', '#eaeaea', '#212121', '#616161', 'sans'],

  // --- The Document Foundation · Call for Templates (lo-cft, CC0 1.0) ---
  ['lo-bright-blue', 'Bright Blue (CC0)', '#ffffff', '#e6f2fc', '#1d5bbf', '#3698f0', 'sans'],
  ['lo-clean-inspiration', 'Inspiração Limpa (CC0)', '#f7f9fa', '#e5eef5', '#2a5f99', '#5a8f29', 'sans'],
  ['lo-dna', 'DNA Genética (CC0)', '#fdfdfd', '#d8e9fa', '#2b4a70', '#5a94d6', 'tech'],
  ['lo-fire-red', 'Fire Red (CC0)', '#ffffff', '#f8ecec', '#9a0201', '#d95b00', 'sans'],
  ['lo-four-colors', 'Quatro Cores (CC0)', '#ffffff', '#fff4d6', '#0077b6', '#d97706', 'sans'],
  ['lo-hexagons', 'Hexágonos Escuro (CC0)', '#0b1016', '#162230', '#e07a3f', '#4e8df5', 'tech'],
  ['lo-lush-green', 'Verde Botânico (CC0)', '#f4fbf5', '#daf2de', '#1e7a14', '#4caf50', 'serif'],
  ['lo-metropolis', 'Metrópole Azul (CC0)', '#1c3e73', '#10284d', '#7cc4ff', '#38bdf8', 'sans'],
  ['lo-orange-green', 'Folha & Citrus (CC0)', '#f8fce8', '#e6f2c2', '#237602', '#e07200', 'sans'],
  ['lo-portfolio', 'Portfólio Bronze (CC0)', '#121417', '#2b1e14', '#d4a96a', '#a87d44', 'serif'],
  ['lo-progress', 'Progresso Industrial (CC0)', '#f3f4f6', '#e5e7eb', '#204b9b', '#a95822', 'tech'],
  ['lo-projections', 'Projeções Douradas (CC0)', '#fbfcfd', '#eceef0', '#8f720f', '#c9a227', 'serif'],
  ['lo-red-scribble', 'Traço Carmim (CC0)', '#fffffe', '#fff3e8', '#b80047', '#e53935', 'serif'],
  ['lo-scipaper-left', 'Artigo Científico (CC0)', '#f6f8f6', '#e6f0e6', '#0a7d1e', '#2e9e42', 'serif'],
  ['lo-scipaper-top', 'Caderno Científico (CC0)', '#f5fafa', '#ddf2f2', '#0b7038', '#0e8585', 'tech'],
  ['lo-simple-blue', 'Azul Simples (CC0)', '#ffffff', '#daf1ff', '#006da3', '#c27a00', 'sans'],
  ['lo-smooth-black', 'Preto Suave (CC0)', '#0d0f12', '#1e242e', '#8aa7cc', '#5b82b5', 'sans'],
  ['lo-three-notes', 'Três Notas (CC0)', '#f4f5f8', '#e4e7f0', '#007d94', '#009fb8', 'sans'],
  ['lo-typography-blue', 'Tipografia Azul (CC0)', '#1c3b6b', '#2b5594', '#9ed0ff', '#4ca2e1', 'serif'],
  ['lo-typography-gold', 'Tipografia Ouro (CC0)', '#fff9e6', '#fae9b4', '#8a5200', '#c98804', 'serif'],

  // --- LibreOffice 4.4 Design Candidates (lo4-design-candidates, CC0 1.0) ---
  ['lo-cinema', 'Cinema 16:9 (CC0)', '#111418', '#222831', '#e0b973', '#94a3b8', 'sans'],
  ['lo-fiery', 'Brasa Solar (CC0)', '#fff5ee', '#fde2cf', '#8c221d', '#d95d1e', 'sans'],
  ['lo-katana', 'Katana Minimal (CC0)', '#f4f4f4', '#e6e6e6', '#2b2018', '#5c5f61', 'sans'],
  ['lo-orange-cube', 'Cubo Laranja (CC0)', '#f5f4ef', '#e5e3d8', '#c45800', '#a9230a', 'tech'],
  ['lo-org-blue', 'Organograma Azul (CC0)', '#102b35', '#061f29', '#7ad0f0', '#3d8db0', 'sans'],
  ['lo-org-gray', 'Organograma Pedra (CC0)', '#2b2c28', '#3c3d37', '#e0d2bc', '#9fa8b5', 'sans'],
  ['lo-pixel', 'Pixel Digital (CC0)', '#edf4fc', '#d2e2f7', '#233857', '#4278cc', 'tech'],
  ['lo-round', 'Círculos Limpos (CC0)', '#fafafa', '#ebebeb', '#101e37', '#33558a', 'sans'],
  ['lo-transversal', 'Transversal Turquesa (CC0)', '#0e4f4b', '#176e68', '#a6f4ec', '#52d1c6', 'sans'],
  ['lo-triangle', 'Triângulos Noite (CC0)', '#1f1d24', '#3b1e35', '#52b8ff', '#e0b84c', 'tech'],

  // --- LibreOffice 5.0 Design Candidates (lo5-design-candidates, CC0 1.0) ---
  ['lo-beehive', 'Colmeia Âmbar (CC0)', '#fffdf5', '#faf0c5', '#3d5166', '#c78c00', 'sans'],
  ['lo-blue-curve', 'Curva Azul (CC0)', '#ffffff', '#d7effa', '#066fa3', '#0a9ddd', 'sans'],
  ['lo-classy-red', 'Classy Red Editorial (CC0)', '#fcf8f9', '#f4e3e6', '#b81f35', '#d99b08', 'serif'],
  ['lo-cosmos-light', 'Cosmos Botânico (CC0)', '#fafbfc', '#edf5f9', '#2b4714', '#7a634f', 'serif'],
  ['lo-daruma', 'Daruma Vermelho (CC0)', '#fffefa', '#fff6d6', '#c91c1c', '#24150d', 'serif'],
  ['lo-forest-bird', 'Bosque Claro (CC0)', '#ffffff', '#eef4ec', '#3e6e22', '#6b533a', 'serif'],
  ['lo-leaf', 'Folha Viva (CC0)', '#0c4d20', '#14692e', '#d6f056', '#8de060', 'sans'],
  ['lo-lights', 'Luzes Noturnas (CC0)', '#0c0829', '#2f0a36', '#ff70b8', '#9980ff', 'sans'],
  ['lo-neuron', 'Neuron Ciências (CC0)', '#11181c', '#1f2e24', '#aecf00', '#38bdf8', 'tech'],
  ['lo-notebook', 'Caderno Clássico (CC0)', '#fdfdfd', '#eceef2', '#172554', '#445977', 'serif'],
  ['lo-pencil', 'Lápis Escolar (CC0)', '#ffffff', '#fcf4e8', '#b85d00', '#77160f', 'serif'],
  ['lo-peter-river', 'Peter River Limpo (CC0)', '#f7fbfe', '#dfeffb', '#1b6fa8', '#3498db', 'sans'],
  ['lo-piano', 'Piano Concerto (CC0)', '#0d0e11', '#1f2329', '#9bc0e6', '#6b8cad', 'serif'],
  ['lo-sakura', 'Sakura Primavera (CC0)', '#ffffff', '#fae3dc', '#a61466', '#d64593', 'serif'],
  ['lo-simple-clear', 'Claro Direto (CC0)', '#f6f7f9', '#e9edf2', '#114a8e', '#346ca8', 'sans'],
  ['lo-simple-dark', 'Escuro Direto (CC0)', '#15171a', '#21262e', '#6db3f2', '#3c8ce0', 'sans'],
  ['lo-technical-office', 'Escritório Técnico (CC0)', '#ffffff', '#e6eaed', '#196f8c', '#459bb8', 'tech'],
  ['lo-vivid-blue', 'Azul Vívido (CC0)', '#f7fbfc', '#e2f2f7', '#006e9e', '#297286', 'sans'],

  // --- Apache OpenOffice Community (BSD / Apache 2.0 / CC-BY 3.0) ---
  ['aoo-aquarelle', 'Aquarela (BSD)', '#faf3f1', '#efe7dc', '#8f6c0c', '#a85f4b', 'serif'],
  ['aoo-blue-gulls', 'Gaivotas Azuis (BSD)', '#eef6fc', '#d5e9f7', '#06578c', '#2790ca', 'sans'],
  ['aoo-purple-arch', 'Arquitetura Púrpura (Apache)', '#251429', '#3d2440', '#ffb142', '#e68a2e', 'sans'],
  ['aoo-sunflowers', 'Girassóis (BSD)', '#f9f9eb', '#f5f2ca', '#755800', '#b8860b', 'serif'],
  ['aoo-winter-mtns', 'Montanhas de Inverno (BSD)', '#eff5fa', '#d8e6f2', '#265485', '#4f82b5', 'sans'],
  ['aoo-black-edges', 'Bordas Grafite (BSD)', '#1f1f21', '#2d2d30', '#a6bfd4', '#dfd5c4', 'sans'],
  ['aoo-blue-curves', 'Ondas Azuis (BSD)', '#154d75', '#1d6699', '#9be2ff', '#4ec4f5', 'sans'],
  ['aoo-blue-grid', 'Grade Azul (BSD)', '#0b3559', '#124975', '#8cd2ff', '#4ea8de', 'tech'],
  ['aoo-green-poly', 'Polígonos Verdes (BSD)', '#124f27', '#1f6b38', '#a3f09c', '#68b662', 'tech'],
  ['aoo-paper-crane', 'Origami Papel (BSD)', '#f2f6f7', '#dfe8ea', '#3c556e', '#5d7b94', 'serif'],
  ['aoo-kanagawa', 'Grande Onda (CC-BY)', '#f7f4ea', '#e8ece6', '#284a6e', '#758a99', 'serif'],
  ['aoo-graph-paper', 'Papel Milimetrado (CC-BY)', '#f7f7f5', '#e4e6e0', '#2b2663', '#524c91', 'tech']
];

function isLightHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 135;
}

const fontMap = {
  sans: ['Trebuchet MS', 'Arial'],
  serif: ['Georgia', 'Arial'],
  tech: ['Verdana', 'Arial']
};

export const communitySlideThemes = Object.fromEntries(
  themeTuples.map(([id, name, background, end, accent, sec, fontHint]) => {
    const light = isLightHex(background);
    const [heading, body] = fontMap[fontHint] || fontMap.sans;
    return [id, {
      name,
      background,
      end,
      color: light ? '#1a2330' : '#f4f7fb',
      accent,
      tints: [accent, sec, light ? '#475569' : '#94a3b8'],
      heading,
      body,
      layout: 'opf-two-column'
    }];
  })
);

export const openSourceLicenses = [
  {
    id: 'openpresentation-gallery',
    project: 'OpenPresentation Gallery',
    author: 'OpenPresentation',
    license: 'MIT',
    notice: 'Copyright (c) 2026 OpenPresentation · Licença MIT',
    url: 'https://github.com/OpenPresentation/gallery',
    licenseUrl: 'https://github.com/OpenPresentation/gallery/blob/main/LICENSE'
  },
  {
    id: 'material-simple',
    project: 'Material Simple (LibreOffice Impress Templates)',
    author: 'Darshan Soni',
    license: 'MIT',
    notice: 'Copyright © 2016 Darshan Soni · Licença MIT',
    url: 'https://github.com/dohliam/libreoffice-impress-templates/tree/master/user-contrib/material-simple',
    licenseUrl: 'https://github.com/dohliam/libreoffice-impress-templates/blob/master/user-contrib/material-simple/LICENSE'
  },
  {
    id: 'libreoffice-design-cc0',
    project: 'LibreOffice Impress Templates (The Document Foundation)',
    author: 'Alexander Wilms, Mateus Machado Luna, Ron Faile, William Gathoye, Sci_citation, artyom.gilvanov, Daniel Hulse, Ashisuto, Jun NOGATA, Alejandro Moreno Calvo, fsanchez e colaboradores',
    license: 'CC0 1.0',
    notice: 'Domínio Público · CC0 1.0 Universal (The Document Foundation Design Team)',
    url: 'https://github.com/dohliam/libreoffice-impress-templates',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    id: 'apache-oo-permissive',
    project: 'Apache OpenOffice Community Templates',
    author: 'Volker Ahrendt, Shenfeng Liu, Nick Burch, Motaz M. Elewa, Ilko Hoepping, Xin Li, R. Stacey, Oschloe',
    license: 'BSD / Apache 2.0 / CC-BY 3.0',
    notice: 'Licenças permissivas BSD, Apache 2.0 e CC-BY 3.0 (via LibreOffice Impress Templates)',
    url: 'https://github.com/dohliam/libreoffice-impress-templates/tree/master/apache-oo',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0'
  },
  {
    id: 'slidescarnival-cc-by-4',
    project: 'SlidesCarnival Presentation Templates',
    author: 'SlidesCarnival',
    license: 'CC BY 4.0',
    notice: 'Modelos adaptados com atribuição sob Creative Commons Attribution 4.0 International',
    url: 'https://www.slidescarnival.com/',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
  }
];
