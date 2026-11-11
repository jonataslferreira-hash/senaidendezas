import {canvasThemes,newElement,mixHex} from './canvas-data.js';
import {aiLayouts,aiThemes} from './storage-ai-options.js';

// Cores e fontes pedidas no texto precisam chegar ao slide. Sem isso, o modelo
// escolhe um tema qualquer e a apresentação sai fora do combinado.
const plainWords=value=>String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
const mentions=(text,...names)=>names.some(name=>new RegExp('(?<![\\p{L}\\p{N}])'+name+'(?![\\p{L}\\p{N}])','u').test(text));

export function requestedPalette(prompt){
  const text=plainWords(prompt);
  if(!text)return '';
  // Um tema citado pelo nome tem prioridade ("usa a paleta ocean").
  for(const id of aiThemes){
    const theme=canvasThemes[id];
    if(mentions(text,id)||theme?.name&&mentions(text,plainWords(theme.name)))return id;
  }
  const blue=mentions(text,'azul','azuis','blue');
  const green=mentions(text,'verde','verdes','green');
  const pink=mentions(text,'rosa','rosas','pink','rose');
  const pastel=mentions(text,'pastel','pastelizado','suave','suaves','claro','clara');
  const dark=mentions(text,'preto','preta','escuro','escura','dark','noite','noturno','noturna');
  const purple=mentions(text,'roxo','roxa','roxos','lilas','purple','violeta');
  // Fundo escuro combinado com uma cor: usa a versão escura daquela família.
  if(dark&&purple)return 'midnight';
  if(dark&&blue)return 'cosmos';
  if(dark&&green)return 'sage';
  if(dark&&pink)return 'ember';
  if(dark)return 'midnight';
  // Duas ou três cores pedidas: a paleta pastel mostra todas nas formas.
  const colorCount=[blue,green,pink].filter(Boolean).length;
  if(colorCount>=2||pastel&&colorCount>=1)return 'pastel';
  if(blue)return pastel?'pastel':'ocean';
  if(green)return pastel?'pastel':'sage';
  if(pink)return pastel?'pastel':'rose';
  if(purple)return 'iris';
  if(mentions(text,'laranja','orange','amarelo','amarela','yellow','dourado','dourada'))return 'citrus';
  if(mentions(text,'vermelho','vermelha','red','vinho','bordo'))return 'ember';
  if(mentions(text,'bege','areia','creme','beige','sand'))return 'sand';
  if(mentions(text,'branco','branca','white','limpo','limpa'))return 'paper';
  return '';
}

export function requestedFont(prompt){
  const text=plainWords(prompt);
  if(!text)return '';
  if(/windows\s*11|segoe|fonte do windows|fonte padrao do windows/i.test(text))return 'Segoe UI';
  if(mentions(text,'calibri'))return 'Calibri';
  if(mentions(text,'arial'))return 'Arial';
  if(mentions(text,'georgia'))return 'Georgia';
  if(mentions(text,'times','serifada','serif'))return 'Times New Roman';
  if(mentions(text,'verdana'))return 'Verdana';
  if(mentions(text,'trebuchet'))return 'Trebuchet MS';
  if(mentions(text,'comic'))return 'Comic Sans MS';
  if(mentions(text,'tahoma'))return 'Tahoma';
  return '';
}

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

// Contraste calculado (WCAG) para nunca deixar texto da cor do fundo nem da
// forma decorativa que está atrás dele.
function channel(value){value/=255;return value<=.03928?value/12.92:Math.pow((value+.055)/1.055,2.4);}
function luminance(hex){
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  return .2126*channel(r)+.7152*channel(g)+.0722*channel(b);
}
function contrast(a,b){
  const one=luminance(a),two=luminance(b);
  return (Math.max(one,two)+.05)/(Math.min(one,two)+.05);
}
function readable(color,background,bold){
  const fallback=contrast(color||background,background)>=(bold?3.1:4.5)?color:null;
  if(fallback)return fallback;
  return luminance(background)>.42?'#1a2432':'#ffffff';
}

export function composeAISlide({spec,index,title,body,images,model,previous}){
  const safeSpec=spec&&typeof spec==='object'?spec:{};
  const fallbackTheme=aiThemes[index%aiThemes.length];
  const wanted=aiThemes.includes(safeSpec.theme)?safeSpec.theme:previous?.theme;
  const palette=aiThemes.includes(wanted)?wanted:fallbackTheme;
  const theme=canvasThemes[palette]||canvasThemes[fallbackTheme];
  const end=theme.end||gradientEnds[palette]||theme.background;
  const isLight=parseInt(theme.background.slice(1,3),16)>150;
  const font=typeof safeSpec.font==='string'&&safeSpec.font.trim()?safeSpec.font.trim().slice(0,80):'';
  const mediaCount=images.length+Number(Boolean(model));
  const proposed=safeSpec.composition;
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
  const preferred=aiLayouts.includes(safeSpec.layout)?safeSpec.layout:layoutOrder[index%layoutOrder.length];
  const layout=allowed.includes(preferred)&&preferred!==previous?.layout
    ?preferred:allowed.find(name=>name!==previous?.layout)||allowed[0];
  const mirrored=!customComposition&&layout==='split'&&index%2===0;
  let {title:titleFrame,body:bodyFrame,visual,align='left'}=mediaCount?mediaLayouts[layout]:textLayouts[layout];
  if(customComposition){titleFrame=customFrames.title;bodyFrame=customFrames.body;if(mediaCount)visual=customFrames.visual;align=proposed.align==='center'?'center':proposed.align==='right'?'right':'left';}
  if(mirrored){
    titleFrame=[48,...titleFrame.slice(1)];bodyFrame=[48,...bodyFrame.slice(1)];visual=[6,visual[1],36,visual[3]];
  }
  const elements=[];
  let decor=0;
  const decorId=kind=>`ai-decor-${kind}-${index}-${decor++}`;
  const shape=(frame,background,cornerRadius=0,kind='accent')=>newElement('shape',{id:decorId(kind),...rect(frame),background,cornerRadius});
  const ellipse=(frame,background,kind='tint')=>newElement('shape',{id:decorId(kind),...rect(frame),shapeType:'ellipse',background});
  const veil=mixHex(theme.background,isLight?'#000000':'#ffffff',isLight?.045:.07);
  const tints=Array.isArray(theme.tints)&&theme.tints.length?theme.tints:[theme.accent];
  const tintAt=step=>tints[(index+step)%tints.length];
  const tintStrong=step=>isLight?mixHex(theme.background,tintAt(step),.62):tintAt(step);
  const titleColor=readable(theme.accent,theme.background,true);
  const bodyColor=readable(theme.color,theme.background,false);
  const titleText=fitContent(String(title||''),titleFrame,true);
  const bodyText=fitContent(String(body||''),bodyFrame,false);
  const bodyAlign=align==='center'&&bodyText.includes('•')?'left':align;

  // Formas de apoio: só entram em espaços livres. Antes, o círculo pastel podia
  // cair atrás do título e deixar o texto ilegível.
  const protectedFrames=[titleFrame,bodyFrame,visual].filter(Boolean);
  const taken=[];
  const free=(box,pad=1.7)=>![...protectedFrames,...taken].some(([x,y,w,h])=>
    box[0]<x+w+pad&&box[0]+box[2]>x-pad&&box[1]<y+h+pad&&box[1]+box[3]>y-pad);
  const blobColors=step=>mixHex(theme.background,tintAt(step),isLight?.58:.26);
  const blobCandidates=[
    [-26,-36,62,82],[-28,46,62,90],[68,-34,58,80],[70,42,54,86],
    [-24,70,56,66],[46,-42,64,70],[4,-44,58,66]
  ];
  const blob=blobCandidates.find(box=>free(box));
  if(blob){elements.push(ellipse(blob,blobColors(0)));taken.push(blob);}
  const spotCandidates=[[0,78,11,19],[85,74,11,18],[-4,-10,14,26],[86,-8,14,24]];
  const spot=spotCandidates.find(box=>free(box));
  if(spot){elements.push(ellipse(spot,blobColors(1)));taken.push(spot);}
  const lineCandidates=[[7,93.4,17,.55],[92.4,20,.5,18],[7,12,12,.5],[49,10.5,10,.6]];
  const line=lineCandidates.find(box=>free(box));
  if(line){elements.push(shape(line,theme.accent,10,'accent'));taken.push(line);}
  const dotSpots=[[8,88.5],[84,88.5],[86,7],[4,9]];
  const dot=dotSpots.find(([x,y])=>free([x,y,9,5.5]));
  if(dot){
    for(let i=0;i<3;i++)elements.push(ellipse([dot[0]+i*2.6,dot[1],1.35,2.35],tintStrong(i+2)));
    taken.push([dot[0],dot[1],9,5.5]);
  }
  const diamondSpot=[[88,7,5,5],[6,88,5,5],[88,86,5,5],[5,7,5,5]].find(box=>free(box,1));
  if(diamondSpot){elements.push(newElement('shape',{id:decorId('accent'),...rect(diamondSpot),shapeType:'diamond',background:theme.accent}));taken.push(diamondSpot);}

  if(layout==='editorial'&&!customComposition)elements.push(shape([49.1,15,.3,67],theme.accent,0,'accent'));
  if(layout==='statement')elements.push(shape([46,12,8,.75],theme.accent,10,'accent'));
  if(layout==='cover')elements.push(shape([mediaCount?7:44,17,12,1],theme.accent,10,'accent'));
  if(layout==='feature')elements.push(shape([7,27.8,16,.8],theme.accent,10,'accent'));
  if(layout==='split')elements.push(shape([mirrored?48:7,8,7,.7],theme.accent,10,'accent'));
  if(layout==='gallery')elements.push(shape([7,41,86,.4],theme.accent,0,'accent'));
  if(layout==='statement'||layout==='cover'){
    const symbolX=align==='center'?titleFrame[0]+titleFrame[2]/2-4:titleFrame[0];
    const symbolY=Math.max(3,titleFrame[1]-11);
    elements.push(newElement('text',{id:decorId('accent'),x:symbolX,y:symbolY,w:8,h:7,text:'✦',fontFamily:font||theme.heading||'Georgia',
      fontSize:layout==='cover'?34:30,color:mixHex(theme.background,titleColor,.78),align:'left',bold:true}));
  }
  elements.push(
    newElement('text',{...rect(titleFrame),role:'title',text:titleText,align,bold:true,color:titleColor,
      fontFamily:font||theme.heading||(['cover','editorial'].includes(layout)?'Georgia':'Arial'),
      fontSize:fitFont(titleText,titleFrame,layout==='cover'?73:59,true),verticalAlign:layout==='editorial'?'center':'start'}),
    newElement('text',{...rect(bodyFrame),text:bodyText,align:bodyAlign,color:bodyColor,fontFamily:font||theme.body||'Arial',fontSize:fitFont(bodyText,bodyFrame,layout==='gallery'?28:34,false),
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
