import {canvasThemes, mixHex, newElement} from './canvas-data.js';
import {newLesson, newQuestion, newSlide} from './lessons.js';
import {openSourceLicenses} from './open-community-themes.js';

export {openSourceLicenses};

export function themeVisuals(themeId) {
  return canvasThemes[themeId] || canvasThemes['studio-orbit'] || Object.values(canvasThemes)[0];
}

const LO_REPO = 'https://github.com/dohliam/libreoffice-impress-templates';
const CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';
const OPF_REPO = 'https://github.com/OpenPresentation/gallery';
const OPF_LIC = 'https://github.com/OpenPresentation/gallery/blob/main/LICENSE';
const MAT_REPO = `${LO_REPO}/tree/master/user-contrib/material-simple`;
const MAT_LIC = `${LO_REPO}/blob/master/user-contrib/material-simple/LICENSE`;
const AOO_REPO = `${LO_REPO}/tree/master/apache-oo`;
const BSD_URL = 'https://opensource.org/licenses/BSD-3-Clause';
const APACHE_URL = 'https://www.apache.org/licenses/LICENSE-2.0';
const CCBY_URL = 'https://creativecommons.org/licenses/by/3.0/';

// Diretório oficial de bibliotecas externas gratuitas. O Storage Lab não
// redistribui arquivos proprietários de terceiros: abre o site oficial
// para o usuário baixar o .pptx / .pdf e importar no editor.
export const externalTemplateSites = [
  {
    id: 'slidescarnival',
    name: 'SlidesCarnival',
    url: 'https://www.slidescarnival.com/category/free-templates',
    formats: 'PowerPoint (.pptx) · Google Slides · Canva',
    category: 'Educação, negócios e criatividade',
    note: 'Baixe em PowerPoint (.pptx) no site oficial e importe no Storage Lab para editar tudo.'
  },
  {
    id: 'slidesmania',
    name: 'SlidesMania',
    url: 'https://slidesmania.com/free-templates/education/',
    formats: 'PowerPoint (.pptx) · Google Slides',
    category: 'Cadernos escolares, jogos e aulas',
    note: 'Modelos gratuitos populares entre professores. Baixe em .pptx no site oficial e traga para cá.'
  },
  {
    id: 'presentationgo',
    name: 'PresentationGO',
    url: 'https://www.presentationgo.com/presentation/templates/',
    formats: 'PowerPoint (.pptx) · Google Slides',
    category: 'Diagramas, linhas do tempo e gráficos',
    note: 'Ótimo para mapas mentais, ciclos e diagramas prontos em .pptx.'
  },
  {
    id: 'slidesgo',
    name: 'Slidesgo',
    url: 'https://slidesgo.com/education',
    formats: 'PowerPoint (.pptx) · Google Slides',
    category: 'Educação e projetos escolares',
    note: 'Filtre por modelos gratuitos, baixe em .pptx no site oficial e importe no Storage Lab.'
  },
  {
    id: 'canva',
    name: 'Canva (Apresentações)',
    url: 'https://www.canva.com/pt_br/apresentacoes/modelos/',
    formats: 'Exportar como .pptx ou .pdf',
    category: 'Editorial e visual',
    note: 'Edite no Canva, exporte como Microsoft PowerPoint (.pptx) e importe aqui para apresentar com quiz.'
  }
];

function luminance(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].reduce((sum, idx, i) => {
    const c = parseInt(full.slice(idx, idx + 2), 16) / 255;
    const lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return sum + [0.2126, 0.7152, 0.0722][i] * lin;
  }, 0);
}

function contrastRatio(a, b) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

function readableOn(bg, preferred, light = '#ffffff', dark = '#141824') {
  if (preferred && contrastRatio(bg, preferred) >= 4.5) return preferred;
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

export function deckTone(themeId) {
  const t = themeVisuals(themeId);
  return luminance(t.background) > 0.36 ? 'light' : 'dark';
}

function paletteFor(themeId) {
  const theme = themeVisuals(themeId);
  const bg = theme.background;
  const end = theme.end || bg;
  const dark = luminance(bg) < 0.38;
  const surface = dark ? mixHex(bg, '#ffffff', 0.11) : mixHex(bg, '#ffffff', 0.72);
  const surfaceStrong = dark ? mixHex(bg, theme.accent, 0.24) : mixHex(bg, theme.accent, 0.16);
  const border = dark ? mixHex(bg, '#ffffff', 0.22) : mixHex(bg, theme.color, 0.16);
  const accent = theme.accent;
  const ink = readableOn(bg, theme.color);
  const title = readableOn(bg, dark ? '#ffffff' : theme.accent, '#ffffff', theme.color);
  const cardInk = readableOn(surface, theme.color);
  const cardTitle = readableOn(surface, theme.accent, '#ffffff', cardInk);
  const strongInk = readableOn(surfaceStrong, theme.color);
  const strongTitle = readableOn(surfaceStrong, theme.accent, '#ffffff', strongInk);
  const onAccent = readableOn(accent, '#ffffff');
  const tints = (theme.tints?.length ? theme.tints : [accent, mixHex(accent, ink, 0.35), mixHex(accent, end, 0.45)]);
  return {
    theme, bg, end, dark, surface, surfaceStrong, border, accent,
    ink, title, cardInk, cardTitle, strongInk, strongTitle, onAccent,
    heading: theme.heading || 'Trebuchet MS',
    body: theme.body || 'Arial',
    tints
  };
}

function shape(x, y, w, h, fill, extra = {}) {
  return newElement('shape', {
    x, y, w, h, fill,
    borderColor: extra.borderColor || 'transparent',
    borderWidth: extra.borderWidth || 0,
    cornerRadius: extra.cornerRadius ?? 14,
    shapeType: extra.shapeType || 'rect',
    ...extra
  });
}

function text(x, y, w, h, value, extra = {}) {
  return newElement('text', {
    x, y, w, h,
    text: value,
    fill: extra.fill || 'transparent',
    color: extra.color,
    fontSize: extra.fontSize || 24,
    bold: Boolean(extra.bold),
    italic: Boolean(extra.italic),
    align: extra.align || 'left',
    verticalAlign: extra.verticalAlign || 'start',
    fontFamily: extra.fontFamily || '',
    role: extra.role || 'body',
    cornerRadius: extra.cornerRadius || 0
  });
}

function imageFrame(x, y, w, h, label, p) {
  return [
    shape(x, y, w, h, p.surfaceStrong, {cornerRadius: 18, borderWidth: 2, borderColor: p.border}),
    shape(x + w * 0.14, y + h * 0.16, w * 0.22, h * 0.24, mixHex(p.surfaceStrong, p.accent, 0.35), {shapeType: 'ellipse'}),
    shape(x + w * 0.1, y + h * 0.52, w * 0.8, h * 0.3, mixHex(p.surfaceStrong, p.accent, 0.2), {cornerRadius: 12}),
    text(x + 3, y + h * 0.57, w - 6, h * 0.24, label, {
      color: p.strongTitle, fontSize: 16, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.body
    })
  ];
}

// 12 arquiteturas visuais distintas de capa para que cada modelo do catálogo
// tenha identidade própria (editorial, suíço, material, caderno, cinema, bauhaus...).
function buildCoverElements(p, c = {}, coverStyle = 'orbit-soft') {
  const tag = c.tag || 'APRESENTAÇÃO';
  const title = c.title || 'Título da apresentação';
  const subtitle = c.subtitle || 'Subtítulo curto com objetivo, turma ou contexto do encontro.';
  const footer = c.footer || 'Professor(a) · Disciplina · Turma';
  const secTint = p.tints[1 % p.tints.length];
  const thirdTint = p.tints[2 % p.tints.length];

  switch (coverStyle) {
    case 'split-left':
      return [
        shape(0, 0, 36, 100, p.accent, {cornerRadius: 0}),
        shape(5, 15, 11, 1.1, p.onAccent, {cornerRadius: 6}),
        text(5, 20, 26, 12, tag, {color: p.onAccent, fontSize: 15, bold: true, fontFamily: p.body}),
        text(5, 76, 26, 15, footer, {color: p.onAccent, fontSize: 14, verticalAlign: 'end', fontFamily: p.body}),
        text(42, 22, 51, 30, title, {role: 'title', color: p.title, fontSize: 46, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        shape(42, 55, 13, 1.1, p.accent, {cornerRadius: 6}),
        text(42, 60, 50, 22, subtitle, {color: p.ink, fontSize: 21, fontFamily: p.body})
      ];

    case 'split-right':
      return [
        shape(62, 0, 38, 100, p.accent, {cornerRadius: 0}),
        shape(68, 16, 26, 68, mixHex(p.accent, p.bg, 0.22), {cornerRadius: 16}),
        shape(72, 24, 12, 1.6, p.onAccent, {cornerRadius: 6}),
        shape(72, 48, 18, 26, secTint, {cornerRadius: 12}),
        shape(7, 13, 28, 7, p.surfaceStrong, {cornerRadius: 14}),
        text(9, 14, 24, 5, tag, {color: p.strongTitle, fontSize: 13, bold: true, verticalAlign: 'center', fontFamily: p.body}),
        text(7, 25, 50, 30, title, {role: 'title', color: p.title, fontSize: 46, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(7, 57, 49, 20, subtitle, {color: p.ink, fontSize: 20, fontFamily: p.body}),
        text(7, 82, 49, 8, footer, {color: p.ink, fontSize: 14, bold: true, fontFamily: p.body})
      ];

    case 'band-top':
      return [
        shape(0, 0, 100, 48, p.accent, {cornerRadius: 0}),
        shape(0, 48, 100, 1.5, secTint, {cornerRadius: 0}),
        text(8, 8, 60, 7, tag, {color: p.onAccent, fontSize: 14, bold: true, fontFamily: p.body}),
        text(8, 17, 84, 26, title, {role: 'title', color: p.onAccent, fontSize: 48, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(8, 56, 82, 18, subtitle, {color: p.ink, fontSize: 22, fontFamily: p.body}),
        shape(8, 79, 56, 9, p.surface, {cornerRadius: 12, borderWidth: 1, borderColor: p.border}),
        text(10.5, 80.5, 51, 6, footer, {color: p.cardInk, fontSize: 14, bold: true, verticalAlign: 'center', fontFamily: p.body})
      ];

    case 'swiss-grid':
      return [
        shape(7, 17, 86, 0.45, p.border, {cornerRadius: 0}),
        shape(7, 77, 86, 0.45, p.border, {cornerRadius: 0}),
        shape(76, 17, 0.5, 60, p.border, {cornerRadius: 0}),
        shape(79, 24, 14, 24, p.accent, {cornerRadius: 10}),
        text(79, 24, 14, 24, '01', {color: p.onAccent, fontSize: 38, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
        text(7, 8, 60, 7, tag, {color: p.title, fontSize: 14, bold: true, fontFamily: p.body}),
        text(7, 23, 66, 30, title, {role: 'title', color: p.title, fontSize: 48, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(7, 55, 66, 18, subtitle, {color: p.ink, fontSize: 21, fontFamily: p.body}),
        text(7, 81, 86, 8, footer, {color: p.ink, fontSize: 15, bold: true, fontFamily: p.body})
      ];

    case 'frame-classic':
      return [
        shape(5, 7, 90, 86, p.surface, {cornerRadius: 14, borderWidth: 3, borderColor: p.accent}),
        shape(44, 16, 12, 1, p.accent, {cornerRadius: 6}),
        text(16, 20, 68, 7, tag, {color: p.cardTitle, fontSize: 14, bold: true, align: 'center', fontFamily: p.body}),
        text(12, 30, 76, 27, title, {role: 'title', color: p.cardTitle, fontSize: 48, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
        text(16, 59, 68, 16, subtitle, {color: p.cardInk, fontSize: 20, align: 'center', fontFamily: p.body}),
        text(16, 79, 68, 8, footer, {color: p.cardInk, fontSize: 14, bold: true, align: 'center', fontFamily: p.body})
      ];

    case 'notebook-cover':
      return [
        shape(0, 0, 7, 100, p.accent, {cornerRadius: 0}),
        shape(11, 0, 0.5, 100, secTint, {cornerRadius: 0}),
        shape(11, 52, 83, 0.35, p.border, {cornerRadius: 0}),
        shape(11, 65, 83, 0.35, p.border, {cornerRadius: 0}),
        shape(11, 78, 83, 0.35, p.border, {cornerRadius: 0}),
        shape(15, 11, 30, 7.5, p.surfaceStrong, {cornerRadius: 8}),
        text(17, 12, 26, 5.5, tag, {color: p.strongTitle, fontSize: 13, bold: true, verticalAlign: 'center', fontFamily: p.body}),
        text(15, 22, 76, 27, title, {role: 'title', color: p.title, fontSize: 48, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(15, 54, 74, 20, subtitle, {color: p.ink, fontSize: 21, fontFamily: p.body}),
        text(15, 81, 74, 8, footer, {color: p.ink, fontSize: 15, bold: true, fontFamily: p.body})
      ];

    case 'bauhaus-blocks':
      return [
        shape(68, 10, 13, 24, p.accent, {cornerRadius: 10}),
        shape(83, 10, 11, 24, secTint, {cornerRadius: 10}),
        shape(68, 37, 26, 26, p.surfaceStrong, {cornerRadius: 14, borderWidth: 1, borderColor: p.border}),
        shape(68, 66, 13, 22, thirdTint, {shapeType: 'ellipse'}),
        shape(83, 66, 11, 22, p.accent, {cornerRadius: 10}),
        shape(7, 14, 10, 1.3, p.accent, {cornerRadius: 8}),
        text(7, 18, 55, 7, tag, {color: p.title, fontSize: 14, bold: true, fontFamily: p.body}),
        text(7, 27, 57, 28, title, {role: 'title', color: p.title, fontSize: 46, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(7, 57, 55, 19, subtitle, {color: p.ink, fontSize: 20, fontFamily: p.body}),
        text(7, 81, 55, 8, footer, {color: p.ink, fontSize: 14, bold: true, fontFamily: p.body})
      ];

    case 'cinema-frame':
      return [
        shape(0, 0, 100, 12, p.surfaceStrong, {cornerRadius: 0}),
        shape(0, 88, 100, 12, p.surfaceStrong, {cornerRadius: 0}),
        shape(43, 23, 14, 1, p.accent, {cornerRadius: 6}),
        text(8, 2.5, 84, 7, tag, {color: p.strongTitle, fontSize: 14, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.body}),
        text(10, 28, 80, 27, title, {role: 'title', color: p.title, fontSize: 50, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
        text(16, 58, 68, 18, subtitle, {color: p.ink, fontSize: 21, align: 'center', fontFamily: p.body}),
        text(8, 90.5, 84, 7, footer, {color: p.strongInk, fontSize: 14, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.body})
      ];

    case 'blueprint-tech':
      return [
        shape(7, 13, 86, 74, p.surface, {cornerRadius: 12, borderWidth: 2, borderColor: mixHex(p.surface, p.accent, 0.45)}),
        shape(7, 13, 86, 10, p.surfaceStrong, {cornerRadius: 8}),
        text(11, 14.5, 68, 7, tag, {color: p.strongTitle, fontSize: 14, bold: true, verticalAlign: 'center', fontFamily: p.body}),
        text(11, 28, 78, 26, title, {role: 'title', color: p.cardTitle, fontSize: 46, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(11, 56, 74, 16, subtitle, {color: p.cardInk, fontSize: 20, fontFamily: p.body}),
        text(11, 75, 76, 8, footer, {color: p.cardTitle, fontSize: 14, bold: true, fontFamily: p.body})
      ];

    case 'ribbon-side':
      return [
        shape(0, 0, 4.5, 100, p.accent, {cornerRadius: 0}),
        shape(4.5, 0, 2.4, 100, secTint, {cornerRadius: 0}),
        shape(6.9, 0, 1.3, 100, thirdTint, {cornerRadius: 0}),
        text(14, 14, 66, 7, tag, {color: p.title, fontSize: 14, bold: true, fontFamily: p.body}),
        text(14, 24, 78, 28, title, {role: 'title', color: p.title, fontSize: 48, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(14, 55, 74, 18, subtitle, {color: p.ink, fontSize: 21, fontFamily: p.body}),
        shape(14, 78, 54, 9, p.surface, {cornerRadius: 12, borderWidth: 1, borderColor: p.border}),
        text(16.5, 79.5, 49, 6, footer, {color: p.cardInk, fontSize: 14, bold: true, verticalAlign: 'center', fontFamily: p.body})
      ];

    case 'minimal-type':
      return [
        text(10, 15, 64, 7, tag, {color: p.title, fontSize: 14, bold: true, fontFamily: p.body}),
        text(10, 25, 80, 29, title, {role: 'title', color: p.title, fontSize: 52, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        shape(10, 57, 18, 0.9, p.accent, {cornerRadius: 4}),
        text(10, 62, 74, 16, subtitle, {color: p.ink, fontSize: 21, fontFamily: p.body}),
        text(10, 82, 74, 8, footer, {color: p.ink, fontSize: 14, fontFamily: p.body})
      ];

    case 'orbit-soft':
    default:
      return [
        shape(70, -14, 42, 62, mixHex(p.bg, p.accent, p.dark ? 0.24 : 0.14), {shapeType: 'ellipse'}),
        shape(80, 58, 28, 44, mixHex(p.bg, p.accent, p.dark ? 0.16 : 0.09), {shapeType: 'ellipse'}),
        shape(10, 20, 12, 1.1, p.accent, {cornerRadius: 8}),
        text(10, 24, 78, 28, title, {role: 'title', color: p.title, fontSize: 52, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(10, 54, 68, 18, subtitle, {color: p.ink, fontSize: 22, fontFamily: p.body}),
        shape(10, 78, 56, 9, p.surface, {cornerRadius: 14, borderWidth: 1, borderColor: p.border}),
        text(12.5, 79.5, 51, 6, footer, {color: p.cardInk, fontSize: 15, bold: true, verticalAlign: 'center', fontFamily: p.body})
      ];
  }
}

function headerBar(p, title, kicker) {
  const els = [];
  if (kicker) {
    els.push(text(7, 6.5, 60, 5, kicker.toUpperCase(), {
      color: p.accent, fontSize: 12, bold: true, fontFamily: p.body
    }));
  }
  els.push(text(7, kicker ? 11.5 : 8, 86, 12, title, {
    role: 'title', color: p.title, fontSize: 34, bold: true, fontFamily: p.heading
  }));
  els.push(shape(7, kicker ? 24.5 : 21.5, 11, 0.9, p.accent, {cornerRadius: 6}));
  return els;
}

// 18 layouts de slide individuais (Template básico sempre no índice 0)
export const slideTemplates = [
  {
    id: 'basic',
    name: 'Template básico do site',
    category: 'Padrão',
    description: 'Layout padrão do Storage Lab: título no topo e área livre para texto e mídia.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        text(8, 12, 84, 16, c.title || 'Título do slide', {
          role: 'title', color: p.title, fontSize: 42, bold: true, fontFamily: p.heading
        }),
        shape(8, 30, 14, 1, p.accent, {cornerRadius: 6}),
        text(8, 36, 84, 48, c.body || 'Escreva aqui os pontos principais, explicações ou exemplos da aula.', {
          color: p.ink, fontSize: 22, fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'cover',
    name: 'Capa de apresentação',
    category: 'Abertura',
    description: 'Capa limpa com título grande, subtítulo e linha de créditos na base.',
    build(themeId = 'studio-orbit', c = {}) {
      return buildCoverElements(paletteFor(themeId), c, c.coverStyle || 'orbit-soft');
    }
  },
  {
    id: 'section',
    name: 'Divisor de seção',
    category: 'Abertura',
    description: 'Quebra de capítulo com número grande e tema da próxima etapa.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        shape(0, 0, 34, 100, p.accent, {cornerRadius: 0}),
        text(6, 26, 22, 26, c.number || '01', {
          color: p.onAccent, fontSize: 72, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading
        }),
        text(6, 54, 22, 12, (c.kicker || 'PARTE 1').toUpperCase(), {
          color: p.onAccent, fontSize: 14, bold: true, align: 'center', fontFamily: p.body
        }),
        text(41, 30, 52, 22, c.title || 'Nova seção da aula', {
          role: 'title', color: p.title, fontSize: 42, bold: true, verticalAlign: 'center', fontFamily: p.heading
        }),
        text(41, 55, 50, 22, c.subtitle || 'Resumo curto do que a turma vai explorar nesta parte.', {
          color: p.ink, fontSize: 21, fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'agenda',
    name: 'Roteiro / Sumário',
    category: 'Abertura',
    description: 'Quatro tópicos numerados para mostrar o caminho da aula.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const items = c.items || [
        ['01', 'Contextualização', 'Por que este tema importa no dia a dia.'],
        ['02', 'Conceitos centrais', 'Ideias-chave explicadas com exemplos claros.'],
        ['03', 'Atividade prática', 'Exercício guiado com participação da turma.'],
        ['04', 'Síntese e quiz', 'Revisão rápida para fixar o aprendizado.']
      ];
      const els = [...headerBar(p, c.title || 'Roteiro da aula', c.kicker || 'SUMÁRIO')];
      items.slice(0, 4).forEach(([num, heading, desc], idx) => {
        const y = 30 + idx * 15.5;
        els.push(
          shape(7, y, 86, 13, p.surface, {cornerRadius: 12, borderWidth: 1, borderColor: p.border}),
          shape(9, y + 2.2, 8.5, 8.6, p.accent, {cornerRadius: 9}),
          text(9, y + 2.2, 8.5, 8.6, num, {color: p.onAccent, fontSize: 18, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          text(20, y + 1.4, 70, 5.2, heading, {color: p.cardTitle, fontSize: 18, bold: true, fontFamily: p.heading}),
          text(20, y + 6.8, 70, 5, desc, {color: p.cardInk, fontSize: 14, fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'bullets',
    name: 'Tópicos com destaque',
    category: 'Conteúdo',
    description: 'Lista limpa com quadro lateral de ponto-chave.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const points = c.points || [
        '• Apresente uma ideia principal por marcador.',
        '• Use frases curtas que facilitem a leitura de longe.',
        '• Conecte o conceito a um exemplo real da turma.',
        '• Feche com uma pergunta para checar o entendimento.'
      ];
      return [
        ...headerBar(p, c.title || 'Pontos principais', c.kicker || 'CONCEITO'),
        text(7, 30, 54, 58, points.join('\n\n'), {color: p.ink, fontSize: 20, fontFamily: p.body}),
        shape(65, 30, 28, 56, p.surfaceStrong, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
        text(68, 35, 22, 8, (c.calloutTitle || 'EM DESTAQUE').toUpperCase(), {
          color: p.strongTitle, fontSize: 13, bold: true, fontFamily: p.body
        }),
        text(68, 45, 22, 36, c.callout || 'Dica ou definição essencial que a turma deve lembrar ao final.', {
          color: p.strongInk, fontSize: 18, fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'two-columns',
    name: 'Duas colunas',
    category: 'Conteúdo',
    description: 'Dois cartões equilibrados para dividir teoria e prática.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const cols = c.columns || [
        {heading: 'Conceito', body: 'Explique a definição, as causas e o princípio fundamental do assunto.'},
        {heading: 'Aplicação', body: 'Mostre um exemplo concreto, experimento ou situação do cotidiano.'}
      ];
      const els = [...headerBar(p, c.title || 'Duas perspectivas', c.kicker || 'ESTRUTURA')];
      cols.slice(0, 2).forEach((col, i) => {
        const x = i === 0 ? 7 : 52;
        els.push(
          shape(x, 30, 41, 58, p.surface, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
          shape(x, 30, 41, 2.2, i === 0 ? p.accent : p.tints[1 % p.tints.length], {cornerRadius: 4}),
          text(x + 3.5, 36, 34, 9, col.heading, {color: p.cardTitle, fontSize: 24, bold: true, fontFamily: p.heading}),
          text(x + 3.5, 47, 34, 37, col.body, {color: p.cardInk, fontSize: 18, fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'cards-3',
    name: 'Três cartões / Pilares',
    category: 'Conteúdo',
    description: 'Três blocos numerados para pilares, categorias ou etapas.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const cards = c.cards || [
        {num: '01', heading: 'Primeiro pilar', body: 'Resumo direto do primeiro elemento da explicação.'},
        {num: '02', heading: 'Segundo pilar', body: 'Como este ponto complementa o anterior na prática.'},
        {num: '03', heading: 'Terceiro pilar', body: 'Resultado esperado ou impacto observado.'}
      ];
      const els = [...headerBar(p, c.title || 'Três pilares essenciais', c.kicker || 'VISÃO GERAL')];
      cards.slice(0, 3).forEach((card, i) => {
        const x = 7 + i * 29.5;
        const badgeColor = p.tints[i % p.tints.length];
        els.push(
          shape(x, 31, 27, 57, p.surface, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
          shape(x + 2.5, 35, 8.5, 8.5, badgeColor, {cornerRadius: 10}),
          text(x + 2.5, 35, 8.5, 8.5, card.num, {color: readableOn(badgeColor), fontSize: 17, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          text(x + 2.5, 47, 22, 10, card.heading, {color: p.cardTitle, fontSize: 19, bold: true, fontFamily: p.heading}),
          text(x + 2.5, 59, 22, 25, card.body, {color: p.cardInk, fontSize: 15, fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'grid-4',
    name: 'Grade 2×2',
    category: 'Conteúdo',
    description: 'Quatro blocos simétricos para matrizes, exemplos ou propriedades.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const boxes = c.boxes || [
        {heading: 'Quadrante 1', body: 'Característica ou exemplo principal.'},
        {heading: 'Quadrante 2', body: 'Fator complementar ou segunda categoria.'},
        {heading: 'Quadrante 3', body: 'Ponto de atenção ou desafio comum.'},
        {heading: 'Quadrante 4', body: 'Conclusão prática ou boa prática.'}
      ];
      const els = [...headerBar(p, c.title || 'Panorama em 4 blocos', c.kicker || 'MATRIZ')];
      boxes.slice(0, 4).forEach((box, i) => {
        const x = i % 2 === 0 ? 7 : 51.5;
        const y = i < 2 ? 30 : 61;
        els.push(
          shape(x, y, 41.5, 27, p.surface, {cornerRadius: 14, borderWidth: 1, borderColor: p.border}),
          shape(x + 2.5, y + 4.5, 1.3, 18, p.tints[i % p.tints.length], {cornerRadius: 4}),
          text(x + 5.5, y + 3.5, 33.5, 7.5, box.heading, {color: p.cardTitle, fontSize: 18, bold: true, fontFamily: p.heading}),
          text(x + 5.5, y + 12, 33.5, 12.5, box.body, {color: p.cardInk, fontSize: 15, fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'comparison',
    name: 'Comparativo A vs B',
    category: 'Análise',
    description: 'Contraste direto lado a lado com selo VS ao centro.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const left = c.left || {heading: 'Modelo A', body: '• Característica 1\n• Vantagem principal\n• Quando escolher'};
      const right = c.right || {heading: 'Modelo B', body: '• Característica 1\n• Diferencial chave\n• Quando escolher'};
      return [
        ...headerBar(p, c.title || 'Comparativo lado a lado', c.kicker || 'COMPARAÇÃO'),
        shape(7, 30, 39, 58, p.surface, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
        shape(7, 30, 39, 10, p.accent, {cornerRadius: 12}),
        text(9.5, 31.5, 34, 7, left.heading, {color: p.onAccent, fontSize: 20, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(10, 44, 33, 40, left.body, {color: p.cardInk, fontSize: 17, fontFamily: p.body}),
        shape(47.2, 53, 5.6, 9.5, p.surfaceStrong, {shapeType: 'ellipse', borderWidth: 1, borderColor: p.border}),
        text(47.2, 53, 5.6, 9.5, 'VS', {color: p.strongTitle, fontSize: 14, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
        shape(54, 30, 39, 58, p.surface, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
        shape(54, 30, 39, 10, p.tints[1 % p.tints.length], {cornerRadius: 12}),
        text(56.5, 31.5, 34, 7, right.heading, {color: readableOn(p.tints[1 % p.tints.length]), fontSize: 20, bold: true, verticalAlign: 'center', fontFamily: p.heading}),
        text(57, 44, 33, 40, right.body, {color: p.cardInk, fontSize: 17, fontFamily: p.body})
      ];
    }
  },
  {
    id: 'timeline',
    name: 'Linha do tempo',
    category: 'Análise',
    description: 'Quatro marcos horizontais em sequência cronológica.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const events = c.events || [
        {date: 'Etapa 1', heading: 'Origem', body: 'Marco inicial que desencadeia o processo.'},
        {date: 'Etapa 2', heading: 'Expansão', body: 'Principais mudanças e descobertas.'},
        {date: 'Etapa 3', heading: 'Virada', body: 'Ponto decisivo da história.'},
        {date: 'Etapa 4', heading: 'Hoje', body: 'Impacto atual e perspectivas.'}
      ];
      const els = [
        ...headerBar(p, c.title || 'Linha do tempo', c.kicker || 'CRONOLOGIA'),
        shape(9, 49, 82, 1.2, p.accent, {cornerRadius: 6})
      ];
      events.slice(0, 4).forEach((ev, i) => {
        const x = 7 + i * 22;
        els.push(
          shape(x + 7.5, 45.2, 5.2, 8.8, p.tints[i % p.tints.length], {shapeType: 'ellipse'}),
          text(x + 7.5, 45.2, 5.2, 8.8, String(i + 1), {color: readableOn(p.tints[i % p.tints.length]), fontSize: 15, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          text(x, 34, 20, 8, ev.date, {color: p.title, fontSize: 15, bold: true, align: 'center', fontFamily: p.heading}),
          shape(x, 57.5, 20, 30, p.surface, {cornerRadius: 12, borderWidth: 1, borderColor: p.border}),
          text(x + 1.5, 60, 17, 7, ev.heading, {color: p.cardTitle, fontSize: 15, bold: true, align: 'center', fontFamily: p.heading}),
          text(x + 1.5, 68, 17, 17, ev.body, {color: p.cardInk, fontSize: 13, align: 'center', fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'steps',
    name: 'Processo em 4 passos',
    category: 'Análise',
    description: 'Fluxo de trabalho claro para tutoriais, experimentos e oficinas.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const steps = c.steps || [
        {num: '1', heading: 'Observar', body: 'Levantar perguntas e dados iniciais.'},
        {num: '2', heading: 'Planejar', body: 'Definir método, papéis e critérios.'},
        {num: '3', heading: 'Executar', body: 'Testar na prática e registrar achados.'},
        {num: '4', heading: 'Compartilhar', body: 'Apresentar conclusões para a turma.'}
      ];
      const els = [...headerBar(p, c.title || 'Passo a passo', c.kicker || 'PROCESSO')];
      steps.slice(0, 4).forEach((step, i) => {
        const x = 7 + i * 22;
        const color = p.tints[i % p.tints.length];
        els.push(
          shape(x, 33, 20, 54, p.surface, {cornerRadius: 14, borderWidth: 1, borderColor: p.border}),
          shape(x, 33, 20, 12, color, {cornerRadius: 12}),
          text(x, 33, 20, 12, `PASSO ${step.num}`, {color: readableOn(color), fontSize: 14, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          text(x + 1.8, 49, 16.4, 9, step.heading, {color: p.cardTitle, fontSize: 17, bold: true, align: 'center', fontFamily: p.heading}),
          text(x + 1.8, 60, 16.4, 24, step.body, {color: p.cardInk, fontSize: 14, align: 'center', fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'metrics',
    name: 'Indicadores & números',
    category: 'Dados',
    description: 'Três números de alto impacto com explicação concisa.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const stats = c.stats || [
        {value: '84%', label: 'Participação ativa', detail: 'Engajamento médio durante atividades guiadas.'},
        {value: '3×', label: 'Mais retenção', detail: 'Quando teoria vem acompanhada de prática.'},
        {value: '15 min', label: 'Bloco ideal', detail: 'Ritmo recomendado entre explicação e dinâmica.'}
      ];
      const els = [...headerBar(p, c.title || 'Dados em destaque', c.kicker || 'INDICADORES')];
      stats.slice(0, 3).forEach((stat, i) => {
        const x = 7 + i * 29.5;
        els.push(
          shape(x, 32, 27, 54, p.surface, {cornerRadius: 16, borderWidth: 1, borderColor: p.border}),
          text(x + 2, 37, 23, 18, stat.value, {color: p.cardTitle, fontSize: 44, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          shape(x + 8, 57, 11, 0.9, p.tints[i % p.tints.length], {cornerRadius: 4}),
          text(x + 2, 60, 23, 8, stat.label, {color: p.cardTitle, fontSize: 16, bold: true, align: 'center', fontFamily: p.heading}),
          text(x + 2.5, 69, 22, 14, stat.detail, {color: p.cardInk, fontSize: 13, align: 'center', fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'quote',
    name: 'Citação / Reflexão',
    category: 'Destaque',
    description: 'Frase marcante centralizada com autoria para abrir debate.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        shape(12, 14, 76, 72, p.surface, {cornerRadius: 20, borderWidth: 1, borderColor: p.border}),
        text(16, 15, 10, 12, '“', {color: p.accent, fontSize: 64, bold: true, fontFamily: p.heading}),
        text(18, 28, 64, 36, c.quote || 'Aprender não é decorar respostas prontas, mas construir boas perguntas em conjunto.', {
          role: 'title', color: p.cardTitle, fontSize: 30, italic: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading
        }),
        shape(43, 68, 14, 0.9, p.accent, {cornerRadius: 6}),
        text(20, 72, 60, 9, c.author || '— Autoria ou fonte da citação', {
          color: p.cardInk, fontSize: 16, bold: true, align: 'center', fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'image-left',
    name: 'Imagem à esquerda',
    category: 'Visual',
    description: 'Quadro visual à esquerda com espaço para foto, gráfico ou mapa.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        ...imageFrame(6, 12, 42, 76, c.imageLabel || 'Substitua por foto ou gráfico', p),
        text(53, 14, 40, 6, (c.kicker || 'DESTAQUE VISUAL').toUpperCase(), {color: p.accent, fontSize: 12, bold: true, fontFamily: p.body}),
        text(53, 21, 41, 18, c.title || 'Título do conceito visual', {role: 'title', color: p.title, fontSize: 34, bold: true, fontFamily: p.heading}),
        shape(53, 41, 12, 1, p.accent, {cornerRadius: 6}),
        text(53, 46, 41, 40, c.body || 'Use a área à esquerda para inserir uma imagem, diagrama ou captura e explique aqui os detalhes importantes.', {
          color: p.ink, fontSize: 19, fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'image-right',
    name: 'Texto + imagem à direita',
    category: 'Visual',
    description: 'Explicação à esquerda e destaque visual grande à direita.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        text(7, 14, 40, 6, (c.kicker || 'ESTUDO DE EXEMPLO').toUpperCase(), {color: p.accent, fontSize: 12, bold: true, fontFamily: p.body}),
        text(7, 21, 41, 18, c.title || 'Explicação acompanhada de imagem', {role: 'title', color: p.title, fontSize: 34, bold: true, fontFamily: p.heading}),
        shape(7, 41, 12, 1, p.accent, {cornerRadius: 6}),
        text(7, 46, 41, 40, c.body || 'Organize a teoria em 2 ou 3 frases objetivas enquanto a imagem à direita ilustra o conceito.', {
          color: p.ink, fontSize: 19, fontFamily: p.body
        }),
        ...imageFrame(52, 12, 42, 76, c.imageLabel || 'Adicione sua imagem aqui', p)
      ];
    }
  },
  {
    id: 'spotlight',
    name: 'Frase de impacto',
    category: 'Destaque',
    description: 'Mensagem curta em tipografia grande para virar o foco da sala.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        shape(8, 18, 84, 64, p.accent, {cornerRadius: 22}),
        text(14, 24, 72, 8, (c.kicker || 'IDEIA-CHAVE').toUpperCase(), {
          color: p.onAccent, fontSize: 14, bold: true, align: 'center', fontFamily: p.body
        }),
        text(14, 34, 72, 34, c.title || 'Uma pergunta certa vale mais que dez definições decoradas.', {
          role: 'title', color: p.onAccent, fontSize: 40, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading
        }),
        text(18, 70, 64, 8, c.subtitle || 'Discuta em duplas por 2 minutos antes de avançar.', {
          color: p.onAccent, fontSize: 17, align: 'center', fontFamily: p.body
        })
      ];
    }
  },
  {
    id: 'summary',
    name: 'Resumo / Revisão',
    category: 'Encerramento',
    description: 'Síntese em 3 pontos-chave para fechar o conteúdo antes do quiz.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      const items = c.items || [
        'Primeiro aprendizado essencial que a turma leva desta aula.',
        'Segunda ideia-chave conectada ao exemplo prático discutido.',
        'Próximo passo, tarefa ou preparação para o quiz interativo.'
      ];
      const els = [...headerBar(p, c.title || 'O que aprendemos hoje', c.kicker || 'SÍNTESE')];
      items.slice(0, 3).forEach((line, i) => {
        const y = 31 + i * 19;
        els.push(
          shape(7, y, 86, 15.5, p.surface, {cornerRadius: 14, borderWidth: 1, borderColor: p.border}),
          shape(9.5, y + 3.2, 6.5, 9, p.tints[i % p.tints.length], {cornerRadius: 9}),
          text(9.5, y + 3.2, 6.5, 9, '✓', {color: readableOn(p.tints[i % p.tints.length]), fontSize: 20, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading}),
          text(18.5, y + 2.5, 71, 10.5, line, {color: p.cardInk, fontSize: 18, verticalAlign: 'center', fontFamily: p.body})
        );
      });
      return els;
    }
  },
  {
    id: 'closing',
    name: 'Encerramento / Obrigado',
    category: 'Encerramento',
    description: 'Slide final limpo com agradecimento, dúvidas e contato.',
    build(themeId = 'studio-orbit', c = {}) {
      const p = paletteFor(themeId);
      return [
        shape(0, 82, 100, 18, p.surfaceStrong, {cornerRadius: 0}),
        shape(42, 24, 16, 1.2, p.accent, {cornerRadius: 6}),
        text(10, 29, 80, 24, c.title || 'Obrigado!', {
          role: 'title', color: p.title, fontSize: 58, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.heading
        }),
        text(16, 55, 68, 16, c.subtitle || 'Dúvidas, comentários ou contribuições da turma?', {
          color: p.ink, fontSize: 22, align: 'center', fontFamily: p.body
        }),
        text(10, 86.5, 80, 8, c.footer || 'Material editável · Pronto para apresentar e jogar no Storage Lab', {
          color: p.strongInk, fontSize: 15, bold: true, align: 'center', verticalAlign: 'center', fontFamily: p.body
        })
      ];
    }
  }
];

export const slideTemplateCategories = [
  {id: 'all', label: 'Todos'},
  {id: 'Padrão', label: 'Padrão'},
  {id: 'Abertura', label: 'Abertura'},
  {id: 'Conteúdo', label: 'Conteúdo'},
  {id: 'Análise', label: 'Análise'},
  {id: 'Dados', label: 'Dados'},
  {id: 'Visual', label: 'Visual'},
  {id: 'Destaque', label: 'Destaque'},
  {id: 'Encerramento', label: 'Encerramento'}
];

export function getSlideTemplate(id) {
  return slideTemplates.find(t => t.id === id) || slideTemplates[0];
}

export function detectDeckTheme(slides = [], activeSlide = null) {
  const candidates = [activeSlide, ...(Array.isArray(slides) ? slides : [])].filter(Boolean);
  for (const s of candidates) {
    if (s.visualTheme && canvasThemes[s.visualTheme]) return s.visualTheme;
  }
  return 'studio-orbit';
}

export function createSlideFromTemplate(templateId, themeOrOpts = 'studio-orbit', contentArg = {}, extraArg = {}) {
  const tpl = getSlideTemplate(templateId);
  const isOpts = themeOrOpts && typeof themeOrOpts === 'object';
  const themeId = isOpts ? (themeOrOpts.themeId || themeOrOpts.theme || 'studio-orbit') : themeOrOpts;
  const content = isOpts ? themeOrOpts : (contentArg || {});
  const extra = isOpts ? themeOrOpts : (extraArg || {});

  if (tpl.id === 'basic') {
    const base = newSlide();
    if (extra.title) base.title = String(extra.title).slice(0, 200);
    if (extra.note) base.note = String(extra.note);
    return base;
  }

  const resolvedTheme = canvasThemes[themeId] ? themeId : 'studio-orbit';
  const elements = tpl.build(resolvedTheme, content);
  const titleEl = elements.find(e => e.role === 'title') || elements.find(e => e.type === 'text');
  const firstLine = String(content.title || titleEl?.text || tpl.name).split('\n')[0].trim().slice(0, 72);
  const bg = themeVisuals(resolvedTheme).background;
  return {
    ...newSlide(),
    kind: 'canvas',
    title: extra.title || firstLine || tpl.name,
    tag: extra.kicker || tpl.category,
    note: extra.note || '',
    visualTheme: resolvedTheme,
    background: bg,
    elements
  };
}

export function applyTemplateToSlide(slide, templateId) {
  const existingTexts = (slide.elements || []).filter(e => e.type === 'text' && e.text?.trim());
  const titleText = slide.title || existingTexts[0]?.text || '';
  const bodyText = existingTexts.slice(1).map(e => e.text.trim()).filter(Boolean).join('\n\n');
  const built = createSlideFromTemplate(templateId, slide.visualTheme || 'studio-orbit', {
    title: titleText || undefined,
    subtitle: bodyText || undefined,
    body: bodyText || undefined
  });
  slide.elements = built.elements;
  slide.background = built.background;
  return slide;
}

function makeCreditNote(deck) {
  if (!deck.license || deck.source !== 'open-source') return '';
  return `Modelo adaptado de "${deck.upstreamName || deck.name}" (${deck.author}) sob licença ${deck.license}. Fonte: ${deck.sourceUrl}`;
}

function deckQuestion(prompt, options, answer = 0, explanation = 'Reveja os pontos principais dos slides.') {
  return {
    ...newQuestion(),
    text: prompt,
    options,
    correct: answer,
    difficulty: 'Fácil',
    base: 1000,
    seconds: 20,
    explanation
  };
}

// Categorias principais do catálogo
export const templateCategories = [
  {id: 'all', label: 'Todos'},
  {id: 'escolar', label: 'Escolar'},
  {id: 'ciencias', label: 'Ciências'},
  {id: 'tecnologia', label: 'Tecnologia'},
  {id: 'humanas', label: 'Humanas'},
  {id: 'academico', label: 'Acadêmico & TCC'},
  {id: 'negocios', label: 'Projetos & Dados'},
  {id: 'criativo', label: 'Criativo'},
  {id: 'minimalista', label: 'Minimalista'},
  {id: 'quiz', label: 'Aula + Quiz'}
];

const categoryLabelMap = Object.fromEntries(templateCategories.map(c => [c.id, c.label]));

// Pacotes de conteúdo didático real por categoria para gerar decks completos e úteis
const categoryScripts = {
  escolar: (name) => [
    ['agenda', {title: 'Roteiro da aula', kicker: 'PLANEJAMENTO'}],
    ['bullets', {title: 'Conceitos essenciais', kicker: 'EXPLICAÇÃO', calloutTitle: 'Lembrete', callout: 'Relacione cada conceito a uma situação cotidiana da turma.'}],
    ['two-columns', {title: 'Teoria e exemplo prático', kicker: 'APLICAÇÃO'}],
    ['cards-3', {title: 'Três ideias centrais', kicker: 'ESTRUTURA'}],
    ['summary', {title: 'Resumo da aula', kicker: 'REVISÃO'}],
    ['closing', {title: 'Vamos praticar?', subtitle: `Apresentação montada com o estilo ${name}.`}]
  ],
  ciencias: () => [
    ['bullets', {title: 'Fenômeno observado', kicker: 'CIÊNCIAS', calloutTitle: 'Hipótese', callout: 'Descreva o que muda quando alteramos uma variável.'}],
    ['image-left', {title: 'Esquema e observação', kicker: 'EXPERIMENTO', imageLabel: 'Diagrama, gráfico ou foto de bancada'}],
    ['metrics', {title: 'Medições e resultados', kicker: 'DADOS', stats: [
      {value: '98%', label: 'Precisão', detail: 'Consistência entre as repetições do ensaio.'},
      {value: '4 etapas', label: 'Método', detail: 'Observação, hipótese, teste e análise.'},
      {value: '100%', label: 'Evidência', detail: 'Conclusão baseada nos registros da turma.'}
    ]}],
    ['steps', {title: 'Método experimental', kicker: 'PROCEDIMENTO'}],
    ['summary', {title: 'Conclusões científicas', kicker: 'SÍNTESE'}],
    ['closing', {title: 'Perguntas e experimentos', subtitle: 'Troque os dados pelos resultados da sua turma.'}]
  ],
  tecnologia: () => [
    ['agenda', {title: 'Arquitetura da aula', kicker: 'ROTEIRO'}],
    ['comparison', {title: 'Comparando abordagens', kicker: 'DECISÃO TÉCNICA', left: {heading: 'Abordagem A', body: '• Simples de iniciar\n• Menor complexidade\n• Ideal para protótipos'}, right: {heading: 'Abordagem B', body: '• Alta escalabilidade\n• Manutenção modular\n• Melhor desempenho em escala'}}],
    ['steps', {title: 'Fluxo de implementação', kicker: 'PIPELINE'}],
    ['grid-4', {title: 'Componentes do sistema', kicker: 'ARQUITETURA'}],
    ['metrics', {title: 'Benchmarks e métricas', kicker: 'DESEMPENHO', stats: [
      {value: '12 ms', label: 'Latência', detail: 'Resposta média em cenário de teste.'},
      {value: '99,9%', label: 'Disponibilidade', detail: 'Estabilidade esperada em produção.'},
      {value: '4×', label: 'Ganho prático', detail: 'Redução de retrabalho com automação.'}
    ]}],
    ['closing', {title: 'Mão no código', subtitle: 'Adicione capturas, comandos ou links do repositório.'}]
  ],
  humanas: () => [
    ['timeline', {title: 'Contexto histórico', kicker: 'LINHA DO TEMPO'}],
    ['image-right', {title: 'Fontes e registros da época', kicker: 'ANÁLISE', imageLabel: 'Mapa, documento ou obra histórica'}],
    ['two-columns', {title: 'Causas e consequências', kicker: 'INTERPRETAÇÃO', columns: [
      {heading: 'Fatores de origem', body: 'Contexto social, político e econômico que preparou o cenário.'},
      {heading: 'Desdobramentos', body: 'Transformações duradouras e reflexos no presente.'}
    ]}],
    ['quote', {quote: 'Compreender o passado amplia o olhar crítico sobre as escolhas do presente.', author: '— Ponto de partida para o debate'}],
    ['summary', {title: 'Síntese crítica', kicker: 'REVISÃO'}],
    ['closing', {title: 'Debate aberto', subtitle: 'Convide a turma a comparar perspectivas.'}]
  ],
  academico: () => [
    ['agenda', {title: 'Estrutura da apresentação', kicker: 'SUMÁRIO', items: [
      ['01', 'Tema e problema', 'Recorte da pesquisa e pergunta norteadora.'],
      ['02', 'Objetivos e justificativa', 'Contribuição esperada e relevância.'],
      ['03', 'Metodologia', 'Instrumentos, amostra e critérios de análise.'],
      ['04', 'Resultados e conclusão', 'Principais achados e referências.']
    ]}],
    ['bullets', {title: 'Problema e objetivos', kicker: 'FUNDAMENTAÇÃO', calloutTitle: 'Pergunta', callout: 'Qual questão específica este estudo busca responder?'}],
    ['steps', {title: 'Percurso metodológico', kicker: 'METODOLOGIA'}],
    ['metrics', {title: 'Principais achados', kicker: 'RESULTADOS'}],
    ['two-columns', {title: 'Discussão e limites', kicker: 'ANÁLISE', columns: [
      {heading: 'Principais contribuições', body: 'O que os dados confirmam em relação à literatura.'},
      {heading: 'Próximos estudos', body: 'Limitações encontradas e caminhos para continuidade.'}
    ]}],
    ['closing', {title: 'Obrigado à banca', subtitle: 'Espaço aberto para arguição e considerações.'}]
  ],
  negocios: () => [
    ['section', {number: '01', kicker: 'CONTEXTO', title: 'O desafio e a oportunidade', subtitle: 'Diagnóstico direto antes de apresentar a proposta.'}],
    ['metrics', {title: 'Números do cenário', kicker: 'INDICADORES'}],
    ['cards-3', {title: 'Proposta de solução', kicker: 'ESTRATÉGIA'}],
    ['comparison', {title: 'Cenário atual vs proposto', kicker: 'IMPACTO'}],
    ['steps', {title: 'Plano de ação', kicker: 'CRONOGRAMA'}],
    ['closing', {title: 'Próximos passos', subtitle: 'Alinhamento de responsáveis, metas e prazos.'}]
  ],
  criativo: () => [
    ['spotlight', {kicker: 'CONCEITO CENTRAL', title: 'Uma narrativa visual clara prende a atenção da sala inteira.', subtitle: 'Combine cor, ritmo e pouco texto por slide.'}],
    ['image-left', {title: 'Referência e inspiração', kicker: 'VISUAL', imageLabel: 'Fotografia, ilustração ou colagem'}],
    ['cards-3', {title: 'Três movimentos da história', kicker: 'ROTEIRO'}],
    ['grid-4', {title: 'Exploração de ideias', kicker: 'PAINEL'}],
    ['quote', {quote: 'Criatividade nasce quando conectamos repertório, curiosidade e experimentação.', author: '— Oficina criativa'}],
    ['closing', {title: 'Hora de criar', subtitle: 'Personalize cores, fontes e imagens no editor.'}]
  ],
  minimalista: () => [
    ['bullets', {title: 'Ideia principal', kicker: 'ESSENCIAL'}],
    ['two-columns', {title: 'Contraste direto', kicker: 'CLAREZA'}],
    ['image-right', {title: 'Um ponto focal por tela', kicker: 'EQUILÍBRIO', imageLabel: 'Imagem limpa em destaque'}],
    ['quote', {quote: 'Menos ruído visual significa mais espaço para a conversa acontecer.', author: '— Princípio editorial'}],
    ['summary', {title: 'Três pontos para levar', kicker: 'FECHAMENTO'}],
    ['closing', {title: 'Obrigado', subtitle: 'Espaço aberto para perguntas.'}]
  ],
  quiz: () => [
    ['agenda', {title: 'Como funciona a revisão', kicker: 'AULA + QUIZ', items: [
      ['01', 'Revisão rápida', 'Retomada dos conceitos essenciais em 3 slides.'],
      ['02', 'Exemplos resolvidos', 'Tira-dúvidas antes da rodada interativa.'],
      ['03', 'Quiz ao vivo', 'Turma entra pelo celular e responde em tempo real.'],
      ['04', 'Feedback na hora', 'Comentário imediato sobre cada alternativa.']
    ]}],
    ['cards-3', {title: 'Pontos que caem no quiz', kicker: 'REVISÃO'}],
    ['two-columns', {title: 'Atenção aos detalhes', kicker: 'DICAS'}],
    ['spotlight', {kicker: 'PREPARE O CELULAR', title: 'Hora do Quiz ao vivo!', subtitle: 'Clique em Apresentar e compartilhe o código da sala.'}]
  ]
};

function buildStandardDeck(deck, opts = {}) {
  const options = typeof opts === 'string' ? {theme: opts} : (opts || {});
  const theme = canvasThemes[options.theme] ? options.theme : deck.theme;
  const script = (categoryScripts[deck.category] || categoryScripts.escolar)(deck.name);
  const creditNote = makeCreditNote(deck);
  const coverTitle = options.title?.trim() || deck.coverTitle || deck.name;
  const coverSubtitle = options.description?.trim() || deck.coverSubtitle || deck.description;
  const coverSlide = createSlideFromTemplate('cover', theme, {
    coverStyle: deck.coverStyle,
    tag: (deck.tag || deck.categoryLabel || 'APRESENTAÇÃO').toUpperCase(),
    title: coverTitle,
    subtitle: coverSubtitle,
    footer: deck.source === 'open-source'
      ? `${deck.author} · ${deck.license} · Editável no Storage Lab`
      : 'Professor(a) · Turma · Editável no Storage Lab'
  }, {
    title: coverTitle,
    kicker: 'Capa',
    note: creditNote
  });
  const bodySlides = script.map(([tplId, content]) => createSlideFromTemplate(tplId, theme, content));
  const slides = [coverSlide, ...bodySlides];
  const questions = deck.hasQuiz ? [
    deckQuestion(
      'Qual característica torna uma apresentação mais clara para toda a turma?',
      ['Texto em excesso em todos os slides', 'Uma ideia central por slide com boa hierarquia', 'Fontes muito pequenas sem contraste', 'Pular a introdução e o resumo'],
      1,
      'Hierarquia visual limpa ajuda o aluno a acompanhar a fala sem cansaço.'
    ),
    deckQuestion(
      'Qual recurso ajuda a verificar se a turma acompanhou o conteúdo?',
      ['Perguntas interativas intercaladas com a explicação', 'Leitura silenciosa de 40 linhas', 'Remover todos os exemplos', 'Trocar o tema a cada frase'],
      0,
      'Alternar explicação breve com perguntas curtas aumenta a participação.'
    ),
    deckQuestion(
      'O que vale revisar antes de encerrar a aula?',
      ['Os 2 ou 3 aprendizados essenciais do encontro', 'Somente a capa', 'Apenas detalhes secundários', 'Nada, encerrar sem síntese'],
      0,
      'Um resumo de fechamento consolida o que foi trabalhado.'
    )
  ] : [];

  const lesson = {
    ...newLesson(),
    title: coverTitle,
    description: coverSubtitle,
    slides,
    questions
  };
  if (options.thumbnail) lesson.thumbnail = options.thumbnail;
  return lesson;
}

function buildOutlineFor(deck) {
  if (deck.id === 'basic') return ['Título do slide'];
  const script = (categoryScripts[deck.category] || categoryScripts.escolar)(deck.name);
  return [deck.coverTitle || deck.name, ...script.map(([, c]) => c.title || 'Slide')];
}

// ============================================================================
// 1. MODELOS NATIVOS DO STORAGE LAB (20 modelos, começando pelo 'basic')
// ============================================================================
const nativeDeckDefs = [
  // [id, name, desc, category, theme, coverStyle, tag, hasQuiz]
  ['basic', 'Template básico do site', 'Comece simples com o slide padrão do Storage Lab e adicione layouts quando quiser.', 'minimalista', 'studio-orbit', 'orbit-soft', 'PADRÃO'],
  ['modern-class', 'Aula Moderna', 'Apresentação completa de 7 slides com capa em painel, roteiro, colunas, pilares e encerramento.', 'escolar', 'studio-orbit', 'split-left', 'AULA COMPLETA'],
  ['school-notebook', 'Caderno Escolar', 'Visual de caderno pautado com lombada lateral, ótimo para aulas didáticas e explicações guiadas.', 'escolar', 'studio-journal', 'notebook-cover', 'CADERNO'],
  ['tech-neon', 'Tecnologia & Código', 'Estrutura escura técnica com grade de cartão, comparativos de arquitetura e benchmarks.', 'tecnologia', 'studio-signal', 'blueprint-tech', 'TECNOLOGIA'],
  ['science-tech', 'Ciências & Laboratório', 'Deck voltado a experimentos, gráficos, hipóteses e análise de resultados científicos.', 'ciencias', 'ocean', 'split-right', 'CIÊNCIAS'],
  ['history-timeline', 'História & Narrativa', 'Moldura editorial clássica com linha do tempo, fontes históricas, causas e debate.', 'humanas', 'sand', 'frame-classic', 'HISTÓRIA'],
  ['academic-tcc', 'Seminário & TCC', 'Estrutura formal para bancas, relatórios de pesquisa, metodologia e resultados.', 'academico', 'paper', 'swiss-grid', 'ACADÊMICO'],
  ['case-study', 'Estudo de Caso', 'Apresentação limpa para análise de cenários, indicadores e plano de ação.', 'negocios', 'sage', 'band-top', 'PROJETO'],
  ['workshop', 'Oficina & Dinâmica', 'Composição geométrica vibrante para oficinas criativas, dinâmicas e desafios em grupo.', 'criativo', 'citrus', 'bauhaus-blocks', 'OFICINA'],
  ['lesson-plus-quiz', 'Aula + Quiz Pronto', 'Revisão enxuta já integrada com 3 perguntas interativas prontas para jogar ao vivo.', 'quiz', 'iris', 'split-right', 'AULA + QUIZ', true],
  ['math-exercises', 'Matemática & Exatas', 'Enquadramento técnico limpo para fórmulas, resolução passo a passo e exercícios.', 'ciencias', 'glacier', 'blueprint-tech', 'EXATAS'],
  ['literature-essay', 'Literatura & Redação', 'Tipografia serifa em moldura suave para análise de obras, citações e repertório.', 'humanas', 'rose', 'frame-classic', 'LITERATURA'],
  ['biology-lab', 'Biologia & Ecossistemas', 'Paleta natural equilibrada para ciclos biológicos, laboratório e sustentabilidade.', 'ciencias', 'lagoon', 'ribbon-side', 'BIOLOGIA'],
  ['geography-world', 'Geografia & Atualidades', 'Faixas laterais organizadas para mapas, dados territoriais e debates contemporâneos.', 'humanas', 'ocean', 'ribbon-side', 'GEOGRAFIA'],
  ['pitch-project', 'Pitch & Feira de Projetos', 'Enquadramento widescreen de alto impacto para apresentar ideias, protótipos e resultados.', 'negocios', 'cosmos', 'cinema-frame', 'PITCH'],
  ['debate-class', 'Debate & Seminário Ativo', 'Layout direto em contraste quente para argumentação, contrapontos e mediação em sala.', 'escolar', 'ember', 'split-left', 'DEBATE'],
  ['minimal-white', 'Minimalista Editorial', 'Máximo respiro visual e tipografia limpa — sem distrações para apresentações autorais.', 'minimalista', 'paper', 'minimal-type', 'EDITORIAL'],
  ['pastel-class', 'Pastel Didático', 'Caderno suave e acolhedor pensado para ensino fundamental, tutoriais e oficinas leves.', 'escolar', 'pastel', 'notebook-cover', 'ENSINO'],
  ['data-report', 'Relatório de Dados', 'Grade suíça escura de alto contraste para dashboards, métricas e fechamento trimestral.', 'negocios', 'midnight', 'swiss-grid', 'DADOS'],
  ['review-quiz-pack', 'Revisão de Prova + Quiz', 'Faixa superior clara para revisão rápida de conteúdos seguida de rodada interativa.', 'quiz', 'studio-orbit', 'band-top', 'REVISÃO + QUIZ', true]
];

// ============================================================================
// 2. OPENPRESENTATION GALLERY (MIT — 28 decks: 14 paletas × Claro e Escuro)
// ============================================================================
const opfDeckDefs = [
  // [id, name, desc, category, theme, coverStyle]
  ['opf-corporate-blue-light', 'Corporate Blue · Claro', 'Azul institucional nítido para relatórios, seminários e apresentações formais.', 'negocios', 'opf-corporate-blue-light', 'swiss-grid'],
  ['opf-corporate-blue-dark', 'Corporate Blue · Escuro', 'Versão noturna em azul corporativo para auditórios e projeções de alto contraste.', 'negocios', 'opf-corporate-blue-dark', 'blueprint-tech'],
  ['opf-cool-horizon-light', 'Cool Horizon · Claro', 'Horizonte claro equilibrado para ciências, explicações técnicas e aulas expositivas.', 'ciencias', 'opf-cool-horizon-light', 'split-left'],
  ['opf-cool-horizon-dark', 'Cool Horizon · Escuro', 'Fundo azul profundo com destaque ciano suave para aulas de tecnologia e diagramas.', 'tecnologia', 'opf-cool-horizon-dark', 'blueprint-tech'],
  ['opf-bold-red-light', 'Bold Red · Claro', 'Contraste editorial em vermelho forte para debates, jornalismo e temas de impacto.', 'criativo', 'opf-bold-red-light', 'band-top'],
  ['opf-bold-red-dark', 'Bold Red · Escuro', 'Palco escuro com acento carmim intenso para pitch, cinema e narrativas marcantes.', 'criativo', 'opf-bold-red-dark', 'cinema-frame'],
  ['opf-forest-green-light', 'Forest Green · Claro', 'Tons botânicos serenos voltados a biologia, ecologia, meio ambiente e saúde.', 'ciencias', 'opf-forest-green-light', 'frame-classic'],
  ['opf-forest-green-dark', 'Forest Green · Escuro', 'Verde floresta profundo com leitura limpa para projetos ambientais e geografia.', 'ciencias', 'opf-forest-green-dark', 'split-right'],
  ['opf-deep-purple-light', 'Deep Purple · Claro', 'Paleta criativa em violeta suave para arte, oficinas e aulas interdisciplinares.', 'criativo', 'opf-deep-purple-light', 'bauhaus-blocks'],
  ['opf-deep-purple-dark', 'Deep Purple · Escuro', 'Estilo moderno escuro para cultura digital, inovação e design.', 'tecnologia', 'opf-deep-purple-dark', 'cinema-frame'],
  ['opf-golden-yellow-light', 'Golden Yellow · Claro', 'Dourado luminoso e acolhedor para história, literatura e apresentações culturais.', 'humanas', 'opf-golden-yellow-light', 'ribbon-side'],
  ['opf-golden-yellow-dark', 'Golden Yellow · Escuro', 'Fundo escuro com detalhes dourados para apresentações de destaque e cerimônias.', 'criativo', 'opf-golden-yellow-dark', 'cinema-frame'],
  ['opf-luxury-light', 'Editorial Clássico · Claro', 'Minimalismo refinado com acento quente para dissertações e seminários formais.', 'academico', 'opf-luxury-light', 'frame-classic'],
  ['opf-luxury-dark', 'Grafite Dourado · Escuro', 'Fundo grafite com tipografia elegante para história, filosofia e citações.', 'humanas', 'opf-luxury-dark', 'frame-classic'],
  ['opf-pastel-red-light', 'Coral Suave · Claro', 'Tons quentes delicados para educação, narrativas humanas e projetos sociais.', 'escolar', 'opf-pastel-red-light', 'notebook-cover'],
  ['opf-pastel-red-dark', 'Terracota Noite · Escuro', 'Contraste aconchegante escuro para apresentações culturais e literatura.', 'humanas', 'opf-pastel-red-dark', 'split-left'],
  ['opf-steel-blue-light', 'Steel Blue · Claro', 'Azul aço técnico para engenharia, matemática, gráficos e indicadores.', 'ciencias', 'opf-steel-blue-light', 'swiss-grid'],
  ['opf-steel-blue-dark', 'Steel Blue · Escuro', 'Visual técnico escuro ideal para dados, estatística e laboratórios.', 'tecnologia', 'opf-steel-blue-dark', 'blueprint-tech'],
  ['opf-burnt-orange-light', 'Burnt Orange · Claro', 'Laranja queimado energético para aberturas, oficinas e chamadas à ação.', 'criativo', 'opf-burnt-orange-light', 'split-right'],
  ['opf-burnt-orange-dark', 'Burnt Orange · Escuro', 'Escuro vibrante com contraste âmbar para projetos de empreendedorismo e feiras.', 'negocios', 'opf-burnt-orange-dark', 'bauhaus-blocks'],
  ['opf-boost-light', 'Boost · Claro', 'Paleta viva e organizada para aulas dinâmicas e revisões com quiz.', 'quiz', 'opf-boost-light', 'band-top'],
  ['opf-boost-dark', 'Boost · Escuro', 'Energia alta em fundo escuro para gincanas, tecnologia e desafios em sala.', 'quiz', 'opf-boost-dark', 'bauhaus-blocks'],
  ['opf-vibes-light', 'Vibes · Claro', 'Combinação contemporânea para projetos criativos, música e cultura jovem.', 'criativo', 'opf-vibes-light', 'ribbon-side'],
  ['opf-vibes-dark', 'Vibes · Escuro', 'Fundo escuro elétrico com destaque vivo para games, robótica e cultura digital.', 'tecnologia', 'opf-vibes-dark', 'split-right'],
  ['opf-slate-gray-light', 'Slate Gray · Claro', 'Cinza neutro impecável que valoriza textos longos, tabelas e fotos.', 'minimalista', 'opf-slate-gray-light', 'minimal-type'],
  ['opf-slate-gray-dark', 'Slate Gray · Escuro', 'Ardósia limpa de baixo cansaço visual para apresentações longas e técnicas.', 'minimalista', 'opf-slate-gray-dark', 'minimal-type'],
  ['opf-black-and-white-light', 'Monocromático · Branco', 'Preto no branco de alto contraste inspirado em livros e design suíço.', 'minimalista', 'opf-black-and-white-light', 'swiss-grid'],
  ['opf-black-and-white-dark', 'Monocromático · Preto', 'Alto contraste editorial em preto puro para fotografia, arquitetura e sínteses.', 'minimalista', 'opf-black-and-white-dark', 'minimal-type']
];

// ============================================================================
// 3. MATERIAL SIMPLE (MIT — Darshan Soni · 11 edições cromáticas autênticas)
// ============================================================================
const materialDeckDefs = [
  ['lo-material-blue', 'Material Simple · Azul', 'Faixa superior em azul Material para aulas expositivas, projetos e gestão.', 'escolar', 'lo-material-blue', 'band-top'],
  ['lo-material-teal', 'Material Simple · Verde-Água', 'Equilíbrio calmo em verde-água para ciências da saúde, biologia e tecnologia.', 'ciencias', 'lo-material-teal', 'band-top'],
  ['lo-material-green', 'Material Simple · Verde', 'Design Material em verde para sustentabilidade, agronomia e projetos escolares.', 'ciencias', 'lo-material-green', 'ribbon-side'],
  ['lo-material-purple', 'Material Simple · Roxo', 'Faixa violeta limpa para design, comunicação, oficinas e criatividade.', 'criativo', 'lo-material-purple', 'band-top'],
  ['lo-material-red', 'Material Simple · Vermelho', 'Destaque forte em vermelho Material para alertas, debates e tópicos urgentes.', 'humanas', 'lo-material-red', 'band-top'],
  ['lo-material-pink', 'Material Simple · Rosa', 'Paleta viva e legível para campanhas, artes visuais e projetos culturais.', 'criativo', 'lo-material-pink', 'split-left'],
  ['lo-material-orange', 'Material Simple · Laranja', 'Energia e clareza em laranja para oficinas práticas, dinâmicas e apresentações de grupo.', 'escolar', 'lo-material-orange', 'band-top'],
  ['lo-material-lime', 'Material Simple · Lima', 'Toque contemporâneo em lima-oliva para biologia, nutrição e inovação.', 'ciencias', 'lo-material-lime', 'ribbon-side'],
  ['lo-material-yellow', 'Material Simple · Âmbar', 'Âmbar luminoso com leitura firme para revisões, tutoriais e roteiros.', 'escolar', 'lo-material-yellow', 'band-top'],
  ['lo-material-brown', 'Material Simple · Café', 'Tons terrosos elegantes para história, arquitetura, geografia e literatura.', 'humanas', 'lo-material-brown', 'frame-classic'],
  ['lo-material-grey', 'Material Simple · Grafite', 'Neutro universal que se adapta a qualquer disciplina ou relatório técnico.', 'minimalista', 'lo-material-grey', 'swiss-grid']
];

// ============================================================================
// 4. LIBREOFFICE DESIGN TEAM (CC0 1.0 · 48 modelos verificados de lo-cft, lo4 e lo5)
// ============================================================================
// Formato: [id, name, desc, category, theme, coverStyle, author, upstreamPath]
const loCc0DeckDefs = [
  // lo-cft (20 modelos CC0)
  ['lo-bright-blue', 'Bright Blue', 'Azul limpo e direto da coleção oficial Call for Templates do LibreOffice.', 'escolar', 'lo-bright-blue', 'ribbon-side', 'Alexander Wilms', 'lo-cft/bright-blue'],
  ['lo-clean-inspiration', 'Inspiração Limpa', 'Cinza claro com acentos azul e verde para aulas organizadas e relatórios.', 'escolar', 'lo-clean-inspiration', 'swiss-grid', 'Alexander Wilms', 'lo-cft/clean-inspiration'],
  ['lo-dna', 'DNA & Genética', 'Paleta científica azul-aço pensada para biologia, genética e pesquisa.', 'ciencias', 'lo-dna', 'blueprint-tech', 'Sci_citation', 'lo-cft/dna'],
  ['lo-fire-red', 'Fire Red', 'Fundo claro com acento vermelho carmesim para impacto imediato sem poluição.', 'negocios', 'lo-fire-red', 'split-left', 'Mateus Machado Luna', 'lo-cft/fire-red'],
  ['lo-four-colors', 'Quatro Cores', 'Quatro tons complementares em mosaico para disciplinas criativas e projetos.', 'criativo', 'lo-four-colors', 'bauhaus-blocks', 'Mateus Machado Luna', 'lo-cft/four-colors'],
  ['lo-hexagons', 'Hexágonos Escuro', 'Fundo escuro técnico com contraste cobre e azul para computação e química.', 'tecnologia', 'lo-hexagons', 'blueprint-tech', 'Ron Faile', 'lo-cft/hexagons'],
  ['lo-lush-green', 'Verde Botânico', 'Verde fresco sobre papel claro para botânica, ecologia e educação ambiental.', 'ciencias', 'lo-lush-green', 'frame-classic', 'Mateus Machado Luna', 'lo-cft/lush-green'],
  ['lo-metropolis', 'Metrópole Azul', 'Azul urbano profundo para apresentações executivas, geografia urbana e economia.', 'negocios', 'lo-metropolis', 'split-right', 'Alexander Wilms', 'lo-cft/metropolis'],
  ['lo-orange-green', 'Folha & Citrus', 'Verde-oliva e laranja vivo para projetos escolares, agricultura e biologia.', 'ciencias', 'lo-orange-green', 'bauhaus-blocks', 'Mateus Machado Luna', 'lo-cft/orange-green'],
  ['lo-portfolio', 'Portfólio Bronze', 'Fundo noturno com detalhes em bronze para portfólios, fotografia e arte.', 'criativo', 'lo-portfolio', 'cinema-frame', 'William Gathoye', 'lo-cft/portfolio'],
  ['lo-progress', 'Progresso Industrial', 'Visual estruturado azul e cobre ideal para engenharia, cronogramas e metas.', 'negocios', 'lo-progress', 'swiss-grid', 'Alrt84', 'lo-cft/progress'],
  ['lo-projections', 'Projeções Douradas', 'Branco editorial com detalhes dourados sóbrios para finanças e planejamento.', 'negocios', 'lo-projections', 'frame-classic', 'Alrt84', 'lo-cft/projections'],
  ['lo-red-scribble', 'Traço Carmim', 'Papel claro com energia editorial carmim para literatura, artes e oficinas.', 'criativo', 'lo-red-scribble', 'ribbon-side', 'Mateus Machado Luna', 'lo-cft/red-scribble'],
  ['lo-scipaper-left', 'Artigo Científico · Lateral', 'Layout acadêmico limpo com faixa verde-ciência para seminários e artigos.', 'academico', 'lo-scipaper-left', 'split-left', 'Sci_citation', 'lo-cft/scipaper-left'],
  ['lo-scipaper-top', 'Caderno Científico · Topo', 'Cabeçalho técnico em verde-petróleo para bancas, pôsteres e relatórios.', 'academico', 'lo-scipaper-top', 'band-top', 'Sci_citation', 'lo-cft/scipaper-top'],
  ['lo-simple-blue', 'Azul Simples', 'Simplicidade clássica azul sobre branco para qualquer aula sem distrações.', 'minimalista', 'lo-simple-blue', 'minimal-type', 'Mateus Machado Luna', 'lo-cft/simple-blue'],
  ['lo-smooth-black', 'Preto Suave', 'Preto elegante com cinza azulado para apresentações em projetor com sala escura.', 'minimalista', 'lo-smooth-black', 'cinema-frame', 'Mateus Machado Luna', 'lo-cft/smooth-black'],
  ['lo-three-notes', 'Três Notas', 'Cinza perolado com acento turquesa para resumos, sínteses e estudos em grupo.', 'escolar', 'lo-three-notes', 'notebook-cover', 'Mateus Machado Luna', 'lo-cft/three-notes'],
  ['lo-typography-blue', 'Tipografia Azul', 'Ênfase total na tipografia sobre azul royal profundo para palestras.', 'minimalista', 'lo-typography-blue', 'minimal-type', 'Alexander Wilms', 'lo-cft/typography-blue'],
  ['lo-typography-gold', 'Tipografia Ouro', 'Papel creme-ouro com letras firmes para humanidades, história e filosofia.', 'humanas', 'lo-typography-gold', 'frame-classic', 'Alexander Wilms', 'lo-cft/typography-gold'],

  // lo4-design-candidates (10 modelos CC0)
  ['lo-cinema', 'Cinema 16:9', 'Enquadramento escuro inspirado em sala de cinema para storytelling e audiovisual.', 'criativo', 'lo-cinema', 'cinema-frame', 'artyom.gilvanov', 'lo4-design-candidates/cinema'],
  ['lo-fiery', 'Brasa Solar', 'Paleta quente terracota e âmbar para energia visual em apresentações temáticas.', 'criativo', 'lo-fiery', 'split-left', 'Daniel Hulse', 'lo4-design-candidates/fiery'],
  ['lo-katana', 'Katana Minimal', 'Minimalismo japonês em cinza grafite e branco frio para máxima precisão.', 'minimalista', 'lo-katana', 'minimal-type', 'erx700', 'lo4-design-candidates/katana'],
  ['lo-orange-cube', 'Cubo Laranja', 'Neutro areia com bloco geométrico laranja forte para design e engenharia.', 'tecnologia', 'lo-orange-cube', 'bauhaus-blocks', 'Srividya Bharadwaj', 'lo4-design-candidates/orange-cube'],
  ['lo-org-blue', 'Organograma Azul', 'Azul petróleo escuro estruturado para processos, equipes e gestão.', 'negocios', 'lo-org-blue', 'blueprint-tech', 'Ron Faile Jr.', 'lo4-design-candidates/org-chart-blue'],
  ['lo-org-gray', 'Organograma Pedra', 'Cinza pedra quente com contraste suave para relatórios institucionais.', 'negocios', 'lo-org-gray', 'swiss-grid', 'Ron Faile Jr.', 'lo4-design-candidates/org-chart-gray'],
  ['lo-pixel', 'Pixel Digital', 'Azul claro geométrico inspirado em computação, lógica e introdução à programação.', 'tecnologia', 'lo-pixel', 'bauhaus-blocks', 'KadlecOn', 'lo4-design-candidates/pixel'],
  ['lo-round', 'Círculos Limpos', 'Branco puro com azul marinho profundo para apresentações claras e contemporâneas.', 'minimalista', 'lo-round', 'orbit-soft', 'Zirk', 'lo4-design-candidates/round-template'],
  ['lo-transversal', 'Transversal Turquesa', 'Turquesa marcante em painel dividido para ciências, saúde e comunicação.', 'ciencias', 'lo-transversal', 'split-right', 'erx700', 'lo4-design-candidates/transversal'],
  ['lo-triangle', 'Triângulos Noite', 'Contraste escuro geométrico com azul elétrico e ouro para tecnologia e dados.', 'tecnologia', 'lo-triangle', 'bauhaus-blocks', 'Zirk', 'lo4-design-candidates/triangle-template'],

  // lo5-design-candidates (18 modelos CC0)
  ['lo-beehive', 'Colmeia Âmbar', 'Fundo marfim iluminado por amarelo mel e azul ardósia para biologia e economia.', 'ciencias', 'lo-beehive', 'bauhaus-blocks', 'Ashisuto', 'lo5-design-candidates/beehive'],
  ['lo-blue-curve', 'Curva Azul', 'Azul celeste fluido sobre branco para aulas limpas e tutoriais visuais.', 'escolar', 'lo-blue-curve', 'orbit-soft', 'Alejandro Moreno Calvo', 'lo5-design-candidates/blue-curve'],
  ['lo-classy-red', 'Classy Red Editorial', 'Editorial sofisticado em vermelho vinho e papel creme para seminários e literatura.', 'humanas', 'lo-classy-red', 'frame-classic', 'Alejandro Moreno Calvo', 'lo5-design-candidates/classy-red'],
  ['lo-cosmos-light', 'Cosmos Botânico', 'Branco mineral com verde musgo e terra para geografia, natureza e ciências.', 'ciencias', 'lo-cosmos-light', 'frame-classic', 'Ashisuto', 'lo5-design-candidates/cosmos'],
  ['lo-daruma', 'Daruma Vermelho', 'Inspiração japonesa em vermelho vivo sobre marfim — direto e memorável.', 'criativo', 'lo-daruma', 'split-left', 'Jun NOGATA', 'lo5-design-candidates/daruma'],
  ['lo-forest-bird', 'Bosque Claro', 'Branco natural com verde folha e madeira suave para aulas leves de ciências.', 'escolar', 'lo-forest-bird', 'ribbon-side', 'Ashisuto', 'lo5-design-candidates/forest-bird'],
  ['lo-leaf', 'Folha Viva', 'Verde intenso com destaque lima para ecologia, energia limpa e sustentabilidade.', 'ciencias', 'lo-leaf', 'split-right', 'Ashisuto', 'lo5-design-candidates/leaf'],
  ['lo-lights', 'Luzes Noturnas', 'Noite profunda com magenta luminoso para música, artes cênicas e eventos.', 'criativo', 'lo-lights', 'cinema-frame', 'fsanchez', 'lo5-design-candidates/lights'],
  ['lo-neuron', 'Neuron Ciências', 'Tema escuro técnico com acento verde-lima para biologia, neurociência e IA.', 'tecnologia', 'lo-neuron', 'blueprint-tech', 'fsanchez', 'lo5-design-candidates/neuron'],
  ['lo-notebook', 'Caderno Clássico', 'Folha branca limpa com margem azul marinho feita sob medida para sala de aula.', 'escolar', 'lo-notebook', 'notebook-cover', 'Ashisuto', 'lo5-design-candidates/notebook'],
  ['lo-pencil', 'Lápis Escolar', 'Papel claro com acento âmbar e bordô para aulas práticas, desenhos e exercícios.', 'escolar', 'lo-pencil', 'notebook-cover', 'Ashisuto', 'lo5-design-candidates/pencil'],
  ['lo-peter-river', 'Peter River Limpo', 'Azul sereno inspirado em design flat para tecnologia, educação e negócios.', 'negocios', 'lo-peter-river', 'band-top', 'Alejandro Moreno Calvo', 'lo5-design-candidates/peter-river'],
  ['lo-piano', 'Piano Concerto', 'Preto clássico com azul aço prateado para música, teatro e apresentações formais.', 'criativo', 'lo-piano', 'cinema-frame', 'Ashisuto', 'lo5-design-candidates/piano'],
  ['lo-sakura', 'Sakura Primavera', 'Branco suave com rosa cerejeira para artes, línguas, literatura e cultura.', 'humanas', 'lo-sakura', 'orbit-soft', 'Jun NOGATA', 'lo5-design-candidates/sakura'],
  ['lo-simple-clear', 'Claro Direto', 'Estrutura corporativa e acadêmica impecável sobre cinza gelo e azul marinho.', 'academico', 'lo-simple-clear', 'swiss-grid', 'Ashisuto', 'lo5-design-candidates/simple-clear'],
  ['lo-simple-dark', 'Escuro Direto', 'Versão escura minimalista para projeções nítidas de código, fórmulas e gráficos.', 'tecnologia', 'lo-simple-dark', 'minimal-type', 'Ashisuto', 'lo5-design-candidates/simple-dark'],
  ['lo-technical-office', 'Escritório Técnico', 'Branco técnico com azul ciano industrial para engenharia, TI e processos.', 'academico', 'lo-technical-office', 'blueprint-tech', 'Antonio Faccioli', 'lo5-design-candidates/technical-office'],
  ['lo-vivid-blue', 'Azul Vívido', 'Azul vibrante equilibrado com fundo claro para aulas envolventes e oficinas.', 'escolar', 'lo-vivid-blue', 'split-left', 'Ashisuto', 'lo5-design-candidates/vivid-blue']
];

// ============================================================================
// 5. APACHE OPENOFFICE COMMUNITY (BSD / Apache 2.0 / CC-BY 3.0 · 12 modelos)
// ============================================================================
// Formato: [id, name, desc, category, theme, coverStyle, author, license, licShort, licUrl, upstreamPath]
const aooDeckDefs = [
  ['aoo-aquarelle', 'Aquarela Editorial', 'Papel rosado suave com ouro antigo para artes, literatura e projetos humanistas.', 'humanas', 'aoo-aquarelle', 'frame-classic', 'Volker Ahrendt', 'BSD', 'BSD', BSD_URL, 'apache-oo/aquarelle'],
  ['aoo-blue-gulls', 'Gaivotas Azuis', 'Céu azul claro e aberto para geografia, meio ambiente e aulas introdutórias.', 'escolar', 'aoo-blue-gulls', 'orbit-soft', 'Shenfeng Liu', 'BSD', 'BSD', BSD_URL, 'apache-oo/blue-gulls'],
  ['aoo-purple-arch', 'Arquitetura Púrpura', 'Roxo profundo arquitetônico com acento âmbar para história da arte e design.', 'criativo', 'aoo-purple-arch', 'split-left', 'Nick Burch', 'Apache 2.0', 'APACHE', APACHE_URL, 'apache-oo/purple-architecture'],
  ['aoo-sunflowers', 'Girassóis', 'Paleta solar amarela e oliva inspirada no campo para biologia e artes.', 'ciencias', 'aoo-sunflowers', 'ribbon-side', 'Motaz M. Elewa', 'BSD', 'BSD', BSD_URL, 'apache-oo/sunflowers'],
  ['aoo-winter-mtns', 'Montanhas de Inverno', 'Azul glacial limpo e sereno para geografia física, clima e seminários.', 'academico', 'aoo-winter-mtns', 'band-top', 'Ilko Hoepping', 'BSD', 'BSD', BSD_URL, 'apache-oo/winter-mountains'],
  ['aoo-black-edges', 'Bordas Grafite', 'Grafite sólido com cinza metálico para relatórios executivos e engenharia.', 'negocios', 'aoo-black-edges', 'swiss-grid', 'Xin Li', 'BSD', 'BSD', BSD_URL, 'apache-oo/xinxinli-black-edges'],
  ['aoo-blue-curves', 'Ondas Azuis', 'Azul oceânico intenso com destaque luminoso para tecnologia e apresentações em telão.', 'tecnologia', 'aoo-blue-curves', 'split-right', 'Xin Li', 'BSD', 'BSD', BSD_URL, 'apache-oo/xinxinli-blue-curves'],
  ['aoo-blue-grid', 'Grade Azul', 'Azul marinho técnico em grade estruturada para matemática, redes e estatística.', 'tecnologia', 'aoo-blue-grid', 'blueprint-tech', 'Xin Li', 'BSD', 'BSD', BSD_URL, 'apache-oo/xinxinli-blue-grid'],
  ['aoo-green-poly', 'Polígonos Verdes', 'Verde floresta geométrico para ciências da terra, biologia e projetos sustentáveis.', 'ciencias', 'aoo-green-poly', 'bauhaus-blocks', 'Xin Li', 'BSD', 'BSD', BSD_URL, 'apache-oo/xinxinli-green-polygons'],
  ['aoo-paper-crane', 'Origami Papel', 'Cinza papel sereno com azul ardósia para apresentações calmas e organizadas.', 'minimalista', 'aoo-paper-crane', 'minimal-type', 'Xin Li', 'BSD', 'BSD', BSD_URL, 'apache-oo/xinxinli-paper-crane'],
  ['aoo-kanagawa', 'Grande Onda', 'Papel marfim clássico e azul índigo inspirado em gravuras históricas.', 'humanas', 'aoo-kanagawa', 'frame-classic', 'R. Stacey', 'CC-BY 3.0', 'CC-BY', CCBY_URL, 'apache-oo/kanagawa'],
  ['aoo-graph-paper', 'Papel Milimetrado', 'Estilo papel quadriculado técnico em índigo para física, química e matemática.', 'academico', 'aoo-graph-paper', 'notebook-cover', 'Oschloe', 'CC-BY 3.0', 'CC-BY', CCBY_URL, 'apache-oo/oschloe-graph-paper-pencils']
];

function hydrateDeck(raw) {
  const deck = {
    ...raw,
    categoryLabel: categoryLabelMap[raw.category] || 'Geral',
    tone: deckTone(raw.theme),
    slideOutline: [],
    slideCount: raw.id === 'basic' ? 1 : (raw.hasQuiz ? 5 : 7),
    quizCount: raw.hasQuiz ? 3 : 0,
    credit: raw.source === 'open-source' ? {
      author: raw.author,
      license: raw.license,
      sourceUrl: raw.sourceUrl,
      licenseUrl: raw.licenseUrl
    } : null
  };
  deck.slideOutline = buildOutlineFor(deck);
  deck.slideCount = deck.slideOutline.length;
  deck.slidesCount = deck.slideCount;
  deck.questionsCount = deck.quizCount;
  deck.buildLesson = (opts = {}) => {
    const options = typeof opts === 'string' ? {theme: opts} : (opts || {});
    if (deck.id === 'basic') {
      const lesson = {
        ...newLesson(),
        title: options.title?.trim() || 'Nova aula',
        description: options.description?.trim() || '',
        slides: [createSlideFromTemplate('basic')]
      };
      if (options.thumbnail) lesson.thumbnail = options.thumbnail;
      return lesson;
    }
    return buildStandardDeck(deck, options);
  };
  return deck;
}

export const deckTemplates = [
  ...nativeDeckDefs.map(([id, name, description, category, theme, coverStyle, tag, hasQuiz]) => hydrateDeck({
    id, name, description, category, theme, coverStyle, tag, hasQuiz: Boolean(hasQuiz),
    source: 'native',
    collection: 'storage-lab',
    collectionLabel: 'Storage Lab',
    author: 'Storage Lab',
    license: 'Integrado · Livre para editar',
    licenseShort: 'SL',
    sourceUrl: '',
    licenseUrl: ''
  })),
  ...opfDeckDefs.map(([id, name, description, category, theme, coverStyle]) => hydrateDeck({
    id, name, upstreamName: name, description, category, theme, coverStyle,
    tag: 'OPENPRESENTATION · MIT',
    hasQuiz: category === 'quiz',
    source: 'open-source',
    collection: 'openpresentation',
    collectionLabel: 'OpenPresentation Gallery',
    author: 'OpenPresentation',
    license: 'MIT',
    licenseShort: 'MIT',
    sourceUrl: OPF_REPO,
    licenseUrl: OPF_LIC
  })),
  ...materialDeckDefs.map(([id, name, description, category, theme, coverStyle]) => hydrateDeck({
    id, name, upstreamName: name, description, category, theme, coverStyle,
    tag: 'MATERIAL SIMPLE · MIT',
    hasQuiz: false,
    source: 'open-source',
    collection: 'material-simple',
    collectionLabel: 'Material Simple',
    author: 'Darshan Soni',
    license: 'MIT',
    licenseShort: 'MIT',
    sourceUrl: MAT_REPO,
    licenseUrl: MAT_LIC
  })),
  ...loCc0DeckDefs.map(([id, name, description, category, theme, coverStyle, author, upstreamPath]) => hydrateDeck({
    id, name, upstreamName: name, description, category, theme, coverStyle,
    tag: 'LIBREOFFICE · CC0',
    hasQuiz: false,
    source: 'open-source',
    collection: 'libreoffice-cc0',
    collectionLabel: 'LibreOffice Design Team',
    author: `${author} · LibreOffice`,
    license: 'CC0 1.0',
    licenseShort: 'CC0',
    sourceUrl: `${LO_REPO}/tree/master/${upstreamPath}`,
    licenseUrl: CC0_URL
  })),
  ...aooDeckDefs.map(([id, name, description, category, theme, coverStyle, author, license, licenseShort, licenseUrl, upstreamPath]) => hydrateDeck({
    id, name, upstreamName: name, description, category, theme, coverStyle,
    tag: `OPENOFFICE · ${licenseShort}`,
    hasQuiz: false,
    source: 'open-source',
    collection: 'apache-oo',
    collectionLabel: 'Apache OpenOffice',
    author,
    license,
    licenseShort,
    sourceUrl: `${LO_REPO}/tree/master/${upstreamPath}`,
    licenseUrl: licenseUrl || AOO_REPO
  }))
];

export const deckGalleryTabs = [
  {id: 'all', label: 'Todos'},
  {id: 'native', label: 'Storage Lab'},
  {id: 'open-source', label: 'Comunidade aberta'},
  {id: 'favorites', label: 'Salvos'},
  {id: 'external', label: 'Sites externos'}
];

export const templateThemeChoices = [
  ['studio-orbit', 'Órbita (Storage Lab)', 'native'],
  ['studio-journal', 'Caderno (Storage Lab)', 'native'],
  ['studio-signal', 'Sinal Escuro (Storage Lab)', 'native'],
  ['paper', 'Papel Editorial', 'native'],
  ['ocean', 'Oceano', 'native'],
  ['sand', 'Areia Clássica', 'native'],
  ['sage', 'Sálvia', 'native'],
  ['iris', 'Íris', 'native'],
  ['midnight', 'Meia-noite', 'native'],
  ['cosmos', 'Cosmos', 'native'],
  ['lo-material-blue', 'Material Azul (MIT)', 'open-source'],
  ['lo-material-teal', 'Material Verde-Água (MIT)', 'open-source'],
  ['lo-classy-red', 'Classy Red (CC0)', 'open-source'],
  ['lo-neuron', 'Neuron Escuro (CC0)', 'open-source'],
  ['lo-simple-clear', 'Claro Direto (CC0)', 'open-source'],
  ['lo-cinema', 'Cinema 16:9 (CC0)', 'open-source'],
  ['opf-forest-green-light', 'Floresta OpenPresentation (MIT)', 'open-source'],
  ['opf-luxury-dark', 'Grafite Dourado (MIT)', 'open-source']
].filter(([id]) => canvasThemes[id]).map(([id, label, group]) => ({id, label, group}));

export function getDeckTemplate(id) {
  return deckTemplates.find(d => d.id === id) || deckTemplates[0];
}

export function createDeckFromTemplate(deckId, opts = {}) {
  const deck = getDeckTemplate(deckId);
  return deck.buildLesson(opts);
}

export function createLessonFromDeckTemplate(deckId, themeOverride) {
  return createDeckFromTemplate(deckId, typeof themeOverride === 'string' ? {theme: themeOverride} : themeOverride);
}

// Cache leve em memória para previews ultrarrápidos no catálogo e carrossel
const coverCache = new Map();
const deckSlidesCache = new Map();

export function previewSlideForTemplate(templateId, themeId = 'studio-orbit') {
  return createSlideFromTemplate(templateId, themeId);
}

export function templatePreviewSlide(templateId, themeId = 'studio-orbit') {
  return previewSlideForTemplate(templateId, themeId);
}

export function deckCoverPreview(deckOrId, themeOverride) {
  const deck = typeof deckOrId === 'string' ? getDeckTemplate(deckOrId) : deckOrId;
  const theme = canvasThemes[themeOverride] ? themeOverride : deck.theme;
  const key = `${deck.id}:${theme}`;
  if (coverCache.has(key)) return coverCache.get(key);
  let slide;
  if (deck.id === 'basic') {
    slide = createSlideFromTemplate('basic', theme);
  } else {
    slide = createSlideFromTemplate('cover', theme, {
      coverStyle: deck.coverStyle,
      tag: (deck.tag || deck.categoryLabel || 'APRESENTAÇÃO').toUpperCase(),
      title: deck.coverTitle || deck.name,
      subtitle: deck.coverSubtitle || deck.description,
      footer: deck.source === 'open-source'
        ? `${deck.author} · ${deck.license}`
        : 'Storage Lab · Pronto para editar'
    });
  }
  if (coverCache.size > 260) coverCache.clear();
  coverCache.set(key, slide);
  return slide;
}

export function previewSlideForDeck(deckId, themeOverride) {
  return deckCoverPreview(deckId, themeOverride);
}

export function deckPreviewSlides(deckOrId, themeOverride) {
  const deck = typeof deckOrId === 'string' ? getDeckTemplate(deckOrId) : deckOrId;
  const theme = canvasThemes[themeOverride] ? themeOverride : deck.theme;
  const key = `${deck.id}:${theme}`;
  if (deckSlidesCache.has(key)) return deckSlidesCache.get(key);
  const lesson = deck.buildLesson({theme});
  if (deckSlidesCache.size > 48) deckSlidesCache.clear();
  deckSlidesCache.set(key, lesson);
  return lesson;
}

export function searchDecks({query = '', sourceTab = 'all', category = 'all', tone = 'all', favorites = new Set()} = {}) {
  const q = String(query || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return deckTemplates.filter(deck => {
    if (sourceTab === 'native' && deck.source !== 'native') return false;
    if (sourceTab === 'open-source' && deck.source !== 'open-source') return false;
    if (sourceTab === 'favorites' && !favorites.has(deck.id)) return false;
    if (category !== 'all' && deck.category !== category) return false;
    if (tone !== 'all' && deck.tone !== tone) return false;
    if (!q) return true;
    const hay = `${deck.name} ${deck.description} ${deck.categoryLabel} ${deck.author} ${deck.collectionLabel} ${deck.license} ${deck.coverStyle}`
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return q.split(/\s+/).every(part => hay.includes(part));
  });
}

export function findSimilarDecks(deck, limit = 4) {
  return deckTemplates
    .filter(item => item.id !== deck.id)
    .map(item => ({
      item,
      score: (item.category === deck.category ? 3 : 0)
        + (item.tone === deck.tone ? 1 : 0)
        + (item.collection === deck.collection ? 1 : 0)
        + (item.coverStyle !== deck.coverStyle ? 0.5 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.item);
}
