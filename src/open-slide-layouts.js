import catalog from './open-layout-catalog.json' with {type:'json'};
import {canvasThemes, newElement, layoutPanelColor} from './canvas-data.js';

export const openLayouts = new Map(catalog.map(layout => ['opf-'+layout.id, layout]));
const decorPrefix = 'opf-decor-';
const mediaTypes = new Set(['image', 'model', 'simulation']);

function regionsIn({direction, regions}, frame) {
  const horizontal = direction === 'row';
  const axis = horizontal ? 'x' : 'y', size = horizontal ? 'w' : 'h';
  const gap = horizontal ? 3 : 4;
  const space = frame[size] - gap * (regions.length - 1);
  const weights = regions.map(region => typeof region.size === 'number'
    ? region.size : region.name === 'title' && !horizontal ? .45 : 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let offset = frame[axis];
  return regions.flatMap((region, index) => {
    const box = {...frame, [axis]:offset, [size]:space * weights[index] / total};
    offset += box[size] + gap;
    return region.regions ? regionsIn(region, box) : [{...region, box}];
  });
}

function place(items, {x,y,w,h}, across) {
  const gap = Math.min(2,(across?w:h)/Math.max(1,items.length*3));
  const available = (across ? w : h) - gap * (items.length - 1);
  const extent = Math.max(.5, available / items.length);
  items.forEach((item,index) => {
    Object.assign(item, across
      ? {x:x+index*(extent+gap),y,w:extent,h}
      : {x,y:y+index*(extent+gap),w,h:extent});
    if(item.type === 'text'){
      const width = item.w * 12.8, height = item.h * 7.2;
      const lines = size => item.text.split('\n').reduce((sum,line) => sum + Math.max(1,Math.ceil(line.length * size * .64 / width)),0);
      while(item.fontSize > 14 && lines(item.fontSize) * item.fontSize * 1.24 > height) item.fontSize--;
    }
  });
}

export function applyOpenLayout(slide, key) {
  const layout = openLayouts.get(key);
  if(!layout) return false;
  const elements = slide.elements.filter(element => !element.id.startsWith(decorPrefix));
  const text = elements.filter(element => element.type === 'text' && !element.locked);
  const title = text.find(element => element.role === 'title') || text[0];
  const body = text.filter(element => element !== title);
  const media = elements.filter(element => mediaTypes.has(element.type) && !element.locked);
  const regions = regionsIn(layout,{x:7,y:8,w:86,h:81});
  const heading = regions.find(region => region.name === 'title') || regions[0];
  const mediaRegion = regions.find(region => region.role === 'media');
  let content = regions.filter(region => region !== heading && (region !== mediaRegion || !media.length));
  if(!content.length && body.length){
    const {box} = heading;
    content = [{box:{...box,y:box.y+box.h*.42,h:box.h*.58}}];
    heading.box = {...box,h:box.h*.36};
  }
  if(title) place([title],heading.box,false);
  const columns = /^(process|timeline|flow|chevrons|metrics|scorecard|pillars|team|cycle)$/.test(layout.id);
  const bodyGroups = content.map(() => []);
  body.forEach((item,index) => bodyGroups[index % content.length].push(item));
  for(const [index,group] of bodyGroups.entries()) if(group.length) place(group,content[index].box,columns && group.length<=5);
  if(media.length){
    const available = mediaRegion?.box || regions.findLast(region => region !== heading && !content.some((entry,i)=>entry===region&&bodyGroups[i].length))?.box;
    if(available) place(media,available,available.w>=available.h);
    else {
      const main = content[0]?.box || heading.box;
      place(media,{...main,x:main.x+main.w*.57,w:main.w*.43},false);
      for(const item of [...body,...(title?[title]:[])]) {
        if(item.x===main.x&&item.y>=main.y&&item.y<main.y+main.h) place([item],{x:item.x,y:item.y,w:Math.min(item.w,main.w*.52),h:item.h},false);
      }
    }
  }
  const theme = canvasThemes[slide.visualTheme] || canvasThemes.midnight;
  const decorations = [];
  const panelColor = layoutPanelColor(slide.background || theme.background, theme.accent);
  const shape = (x,y,w,h,background,shapeType='rectangle') => {
    if(elements.length+decorations.length>=40) return;
    const id = decorPrefix+(background===panelColor?'panel-':'')+crypto.randomUUID();
    decorations.push(newElement('shape',{id,x,y,w,h,background,shapeType,cornerRadius:0}));
  };
  if(theme.ornament==='orbit'){
    shape(63,-25,49,66,panelColor,'ellipse');
    shape(87,-9,21,28,theme.end,'ellipse');
    for(const [x,y] of [[81,5],[90,23],[94,9],[3,84]])shape(x,y,1.1,1.8,theme.accent,'ellipse');
  }else if(theme.ornament==='journal'){
    shape(0,0,4,100,panelColor);
    shape(5,0,.45,100,theme.accent);
    for(let y=13;y<90;y+=13)shape(0,y,2.4,.4,theme.accent);
  }else if(theme.ornament==='signal'){
    shape(0,0,100,7,panelColor);
    for(let x=8;x<97;x+=12)shape(x,3,5,.8,theme.accent);
  }
  shape(7,94,86,1,theme.accent);
  if(columns){
    for(const item of body) shape(item.x-.5,item.y-.65,item.w+1,item.h+1.3,panelColor);
    const count = Math.max(3,Math.min(5,body.length));
    for(let index=0;index<count;index++) shape(7+index*86/count,91,2,3,theme.accent,'ellipse');
  }else if(layout.direction==='row'){
    shape(4,6,47,85,panelColor);
    shape(0,0,2,100,theme.accent);
    shape(4,5,9,.6,theme.accent);
  }else {
    shape(7,4,14,.85,theme.accent);
    shape(87,4,6,.85,theme.accent);
  }
  slide.elements = [...decorations,...elements];
  slide.layout = key;
  return true;
}
