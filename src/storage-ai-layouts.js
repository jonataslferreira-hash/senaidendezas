import {canvasThemes,newElement} from './canvas-data.js';
import {aiLayouts,aiThemes} from './storage-ai-options.js';

export function planSlidePhotos(specs,total){
  const assigned=new Set();
  const limit=Math.max(3,Math.ceil(total/specs.length));
  const placements=specs.map(spec=>{
    const requested=Array.isArray(spec?.photos)?spec.photos:[spec?.photo];
    const indices=[];
    for(const index of requested){
      if(indices.length===limit)break;
      if(!Number.isInteger(index)||index<0||index>=total||assigned.has(index))continue;
      indices.push(index);
      assigned.add(index);
    }
    return indices;
  });
  for(let index=0;index<total;index++){
    if(assigned.has(index))continue;
    placements.reduce((fewest,slide)=>slide.length<fewest.length?slide:fewest).push(index);
  }
  for(const [index,slide] of placements.entries()){
    if(slide.length||specs[index]?.model||specs[index]?.model3D)continue;
    const donor=placements.reduce((most,other)=>other.length>most.length?other:most);
    if(donor.length>1)slide.push(donor.pop());
  }
  return placements;
}

const gradientEnds={
  midnight:'#352047',ocean:'#1d4764',sage:'#1a5144',ember:'#673044',
  paper:'#eee7f9',iris:'#e8d7f6',glacier:'#d0ebf2',sand:'#f6dfb5',
  cosmos:'#453a87',citrus:'#ffd19f',lagoon:'#1e6572',rose:'#f9c9d3'
};
const lightThemes=new Set(['paper','iris','glacier','sand','citrus','rose']);
const layoutsByMedia={
  none:['statement','editorial','cover'],
  single:['split','feature','cover'],
  multiple:['gallery','split','feature']
};
const layoutOrder=['cover','split','editorial','feature','statement','gallery'];
const mediaLayouts={
  cover:    {title:[7,20,46,32],body:[7,57,45,32],visual:[58,8,36,84]},
  split:    {title:[7,13,47,26],body:[7,44,47,45],visual:[60,12,34,77]},
  feature:  {title:[7,7,86,19],body:[7,72,86,21],visual:[7,28,86,40]},
  gallery:  {title:[7,7,86,18],body:[7,25,86,16],visual:[7,44,86,48]}
};
const textLayouts={
  cover:     {title:[10,20,80,31],body:[16,57,68,30],align:'center'},
  statement: {title:[14,18,72,32],body:[17,55,66,33],align:'center'},
  editorial: {title:[8,15,41,61],body:[53,17,38,66],align:'left'}
};

const rect=([x,y,w,h])=>({x,y,w,h});

function fitFont(value,frame,max,bold){
  const [, ,w,h]=frame;
  for(let size=max;size>16;size-=2){
    const capacity=Math.max(1,Math.floor(w*12.8/(size*(bold ? .62 : .57))));
    const lines=value.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil((line.length+3)/capacity)),0);
    if(lines*size*1.22<h*7.2)return size;
  }
  return 16;
}

// Texto que não cabe no quadro deixa o slide feio e ilegível. O corte acontece
// só quando o corpo passa do limite, no tamanho menor de leitura, e termina
// em uma palavra inteira.
function fitContent(value,frame,bold){
  const [, ,w,h]=frame;
  const size=16;
  const capacity=Math.max(8,Math.floor(w*12.8/(size*(bold ? .62 : .57))));
  const lines=Math.max(1,Math.floor(h*7.2/(size*1.22)));
  const maxChars=Math.max(16,capacity*lines);
  if(!value||value.length<=maxChars)return value;
  const clipped=value.slice(0,maxChars).replace(/\s+\S*$/,'');
  return (clipped||value.slice(0,maxChars)).trimEnd()+'…';
}

function tiles(area,count){
  const [x,y,w,h]=area;
  const cols=Math.min(count,Math.max(1,Math.ceil(Math.sqrt(count*w/h*1.1))));
  const rows=Math.ceil(count/cols);
  const gap=1.35, width=(w-gap*(cols-1))/cols, height=(h-gap*(rows-1))/rows;
  return Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cols),used=Math.min(cols,count-row*cols);
    return [x+(cols-used)*(width+gap)/2+(i%cols)*(width+gap),y+row*(height+gap),width,height];
  });
}

export function composeAISlide({spec,index,title,body,images,model,previous}){
  const fallbackTheme=aiThemes[index%aiThemes.length];
  const palette=aiThemes.includes(spec.theme)?spec.theme:(previous?.theme||fallbackTheme);
  const theme=canvasThemes[palette], end=theme.end||gradientEnds[palette];
  const isLight=theme.end?parseInt(theme.background.slice(1,3),16)>150:lightThemes.has(palette);
  const mediaCount=images.length+Number(Boolean(model));
  const proposed=spec?.composition;
  const frame=value=>{
    if(!value||typeof value!=='object')return null;
    const box=['x','y','w','h'].map(key=>Number(value[key]));
    if(box.some(number=>!Number.isFinite(number))||box[0]<0||box[1]<0||box[2]<8||box[3]<6||box[0]+box[2]>100||box[1]+box[3]>100)return null;
    return box;
  };
  const customFrames={title:frame(proposed?.title),body:frame(proposed?.body),visual:frame(proposed?.visual)};
  const overlaps=(a,b)=>a&&b&&a[0]<b[0]+b[2]-2&&a[0]+a[2]>b[0]+2&&a[1]<b[1]+b[3]-2&&a[1]+a[3]>b[1]+2;
  const customComposition=customFrames.title&&customFrames.body&&(!mediaCount||customFrames.visual)&&
    !overlaps(customFrames.title,customFrames.body)&&!overlaps(customFrames.title,customFrames.visual)&&!overlaps(customFrames.body,customFrames.visual);
  const allowed=mediaCount>=5?['gallery','feature']:layoutsByMedia[mediaCount===0?'none':mediaCount===1?'single':'multiple'];
  const preferred=aiLayouts.includes(spec.layout)?spec.layout:layoutOrder[index%layoutOrder.length];
  const layout=allowed.includes(preferred)&&preferred!==previous?.layout
    ?preferred:allowed.find(name=>name!==previous?.layout)||allowed[0];
  const mirrored=!customComposition&&layout==='split'&&index%2===0;
  let {title:titleFrame,body:bodyFrame,visual,align='left'}=mediaCount?mediaLayouts[layout]:textLayouts[layout];
  if(customComposition){titleFrame=customFrames.title;bodyFrame=customFrames.body;if(mediaCount)visual=customFrames.visual;align=spec.composition.align==='center'?'center':spec.composition.align==='right'?'right':'left';}
  if(mirrored){
    titleFrame=[48,...titleFrame.slice(1)];bodyFrame=[48,...bodyFrame.slice(1)];visual=[6,visual[1],36,visual[3]];
  }
  const elements=[];
  const shape=(frame,background,cornerRadius=0)=>newElement('shape',{...rect(frame),background,cornerRadius});
  const ellipse=(frame,background,extra={})=>newElement('shape',{...rect(frame),shapeType:'ellipse',background,...extra});
  const mix=(from,to,ratio)=>{const parse=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const [a,b,c]=parse(from),[d,e,f]=parse(to);
    return '#'+[a+(d-a)*ratio,b+(e-b)*ratio,c+(f-c)*ratio].map(value=>Math.round(value).toString(16).padStart(2,'0')).join('');};
  const soft=mix(theme.background,theme.accent,isLight?.1:.17);
  const veil=mix(theme.background,isLight?'#000000':'#ffffff',isLight?.045:.07);
  const titleText=fitContent(String(title||''),titleFrame,true);
  const bodyText=fitContent(String(body||''),bodyFrame,false);
  const bodyAlign=align==='center'&&bodyText.includes('•')?'left':align;
  // Formas de apoio: ficam nas margens, atrás do texto, e dão o acabamento de
  // modelo pronto (círculos suaves recortados pela borda, linhas finas, losangos).
  const blobIndex=index%4;
  if(blobIndex===0){
    elements.push(ellipse([-13,54,44,80],soft));
    elements.push(shape([86,6,11,.45],theme.accent,10));
    elements.push(ellipse([91,82,4,7],veil));
  }else if(blobIndex===1){
    elements.push(ellipse([69,-20,46,82],soft));
    elements.push(ellipse([2,76,10,18],soft));
    elements.push(ellipse([3.6,78.6,6.8,12.8],theme.background));
    elements.push(shape([6,10,7,.6],theme.accent,10));
  }else if(blobIndex===2){
    elements.push(ellipse([85,28,28,50],soft));
    elements.push(shape([5,91.5,24,.4],theme.accent,10));
    elements.push(ellipse([80,88,1.3,2.3],theme.accent));
    elements.push(ellipse([83,88,1.3,2.3],theme.accent));
    elements.push(ellipse([86,88,1.3,2.3],theme.accent));
  }else{
    elements.push(ellipse([-16,-26,54,70],soft));
    elements.push(newElement('shape',{x:89,y:7,w:6,h:6,shapeType:'diamond',background:theme.accent}));
    elements.push(shape([7,92,86,.45],theme.accent,10));
  }
  if(layout==='editorial')elements.push(shape([49,15,.35,67],theme.accent));
  if(layout==='statement'){
    elements.push(shape([46,12,8,.75],theme.accent,10));
  }
  if(layout==='cover')elements.push(shape([mediaCount?7:44,17,12,1],theme.accent,10));
  if(layout==='feature')elements.push(shape([7,27.8,16,.8],theme.accent,10));
  if(layout==='split')elements.push(shape([mirrored?48:7,8,7,.7],theme.accent,10));
  if(layout==='gallery')elements.push(shape([7,40.5,86,.4],theme.accent));
  if(layout==='statement'||layout==='cover'){
    elements.push(newElement('text',{x:layout==='cover'?(mediaCount?7:44):14,y:9,w:8,h:7,text:'✦',fontSize:layout==='cover'?34:30,color:theme.accent,align:'left',bold:true}));
  }
  elements.push(
    newElement('text',{...rect(titleFrame),role:'title',text:titleText,align,bold:true,color:theme.accent,
      fontFamily:theme.heading||(['cover','editorial'].includes(layout)?'Georgia':'Arial'),
      fontSize:fitFont(titleText,titleFrame,layout==='cover'?73:59,true),verticalAlign:layout==='editorial'?'center':'start'}),
    newElement('text',{...rect(bodyFrame),text:bodyText,align:bodyAlign,color:theme.color,fontFamily:theme.body||'Arial',fontSize:fitFont(bodyText,bodyFrame,layout==='gallery'?28:34,false),
      verticalAlign:layout==='editorial'?'center':'start'})
  );
  if(visual){
    const [x,y,w,h]=visual;
    const modelWidth=model&&images.length?w*.43:w;
    const frames=images.length?tiles(model?[x+modelWidth+1.5,y,w-modelWidth-1.5,h]:visual,images.length):[];
    if(model)elements.push(newElement('model',{...rect([x,y,modelWidth,h]),...model}));
    for(const [i,image] of images.entries()){
      const [px,py,pw,ph]=frames[i];
      elements.push(shape([px-1.1,py-1.5,pw+2.2,ph+3],veil,6));
      elements.push(shape([px-.24,py-.32,pw+.48,ph+.64],isLight?'#ffffff':theme.accent,5));
      elements.push(newElement('image',{...rect(frames[i]),image:image.data,imageFit:'cover',imageAlt:image.alt||'Foto '+(image.index+1)+' do conjunto enviado'}));
    }
  }
  return {elements,theme:palette,layout,customComposition,background:theme.background,
    backgroundFill:{mode:'gradient',end,angle:(index*41+115)%360}};
}
