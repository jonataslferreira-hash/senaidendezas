import palettes from './open-theme-palettes.json' with {type:'json'};

// Adapted from the OpenPresentation Gallery themes and color schemes (MIT).
// https://github.com/OpenPresentation/gallery
// The gradient combinations and system font substitutions are for Storage Lab.
export const openSlideThemes = {
  'opf-minimal': {
    name: 'Minimal · Horizonte escuro', background: '#011842', end: '#1B4F72',
    color: '#FFFFFF', accent: '#7BDBB2', heading: 'Verdana', body: 'Arial',
    layout: 'opf-two-column', use: 'tecnologia, diagramas e conteúdo técnico'
  },
  'opf-classic': {
    name: 'Classic · Horizonte claro', background: '#FFFFFF', end: '#F0F0F0',
    color: '#011842', accent: '#2874A6', heading: 'Georgia', body: 'Arial',
    layout: 'opf-text', use: 'explicações, conceitos e apresentações formais'
  },
  'opf-bold': {
    name: 'Bold · Laranja queimado', background: '#FFF3E6', end: '#FCBF49',
    color: '#341B00', accent: '#003049', heading: 'Trebuchet MS', body: 'Verdana',
    layout: 'opf-cover', use: 'aberturas, chamadas e conclusões enérgicas'
  },
  'opf-forest': {
    name: 'Floresta', background: '#EEF5F0', end: '#C8D5B9',
    color: '#263F2E', accent: '#263F2E', heading: 'Georgia', body: 'Verdana',
    use: 'natureza, sustentabilidade e ciências'
  },
  'opf-purple': {
    name: 'Roxo profundo', background: '#F8F2FC', end: '#F8F2FC',
    color: '#2B0B3E', accent: '#7F35B2', heading: 'Trebuchet MS', body: 'Arial',
    use: 'arte, criatividade e introduções'
  },
  'opf-luxury': {
    name: 'Grafite dourado', background: '#000000', end: '#2C2C2C',
    color: '#EFEFEF', accent: '#FCBF49', heading: 'Georgia', body: 'Arial',
    use: 'história, citações e seções de destaque'
  },
  'opf-pastel': {
    name: 'Coral suave', background: '#FFEFEE', end: '#E6B89C',
    color: '#000000', accent: '#004D52', heading: 'Georgia', body: 'Verdana',
    use: 'narrativas, educação e temas humanos'
  },
  'opf-vibes': {
    name: 'Violeta elétrico', background: '#2C2C2C', end: '#5230F2',
    color: '#FFFFFF', accent: '#B8E109', heading: 'Trebuchet MS', body: 'Verdana',
    use: 'games, cultura digital e desafios'
  }
};

const looks = {
  'black-and-white':'quote','bold-red':'statement',boost:'hero','burnt-orange':'cover',
  'cool-horizon':'two-column','corporate-blue':'comparison','deep-purple':'hero',
  'forest-green':'image-beside','golden-yellow':'pillars',luxury:'quote',
  'pastel-red':'gallery','slate-gray':'text','steel-blue':'metrics',vibes:'process'
};
const luminance = color => [1,3,5].reduce((sum,offset,index)=>{
  const channel=parseInt(color.slice(offset,offset+2),16)/255;
  return sum+[.2126,.7152,.0722][index]*(channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
},0);
const contrast = (a,b) => {
  const [lo,hi]=[luminance(a),luminance(b)].sort((x,y)=>x-y);
  return (hi+.05)/(lo+.05);
};
for(const palette of palettes){
  for(const dark of [false,true]){
    const background=dark?palette.dark1:palette.light1;
    const end=dark?palette.dark2:palette.light2;
    const color=dark?'#ffffff':'#000000';
    const accent=[palette.accent1,palette.accent2,palette.accent3,palette.accent4,palette.accent5,palette.accent6]
      .find(candidate=>contrast(candidate,background)>=4.5&&contrast(candidate,end)>=4.5)||color;
    openSlideThemes[`opf-${palette.id}-${dark?'dark':'light'}`]={
      name:`${palette.name} · ${dark?'Escuro':'Claro'}`,background,end,color,accent,
      heading:dark?'Trebuchet MS':'Georgia',body:'Arial',layout:'opf-'+looks[palette.id]
    };
  }
}
