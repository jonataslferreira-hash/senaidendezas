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
  none:['cards','editorial','columns','timeline','highlight','statement','cover'],
  single:['split','stack','feature','banner','cover'],
  multiple:['gallery','split','stack','feature','banner']
};
const structuredTextLayouts=new Set(['cards','columns','timeline','highlight']);
const layoutOrder=['cover','cards','split','editorial','timeline','stack','columns','feature','highlight','banner','statement','gallery'];
// Layouts de texto ao lado da foto: alternam o lado para a aula não ficar toda igual.
const sideLayouts=['split','cover','stack'];
const mediaLayouts={
  cover:    {title:[7,19,42,30],body:[7,53,42,35],visual:[53,12,40,76]},
  split:    {title:[7,12,42,24],body:[7,40,42,48],visual:[53,13,40,74]},
  feature:  {title:[7,6,86,15],body:[7,74,86,19],visual:[14,26,72,44]},
  gallery:  {title:[7,6,86,15],body:[7,22,86,13],visual:[7,41,86,51]},
  // Foto larga em cima, texto embaixo: o melhor encaixe para fotos panorâmicas.
  banner:   {title:[7,55,86,15],body:[7,72,86,21],visual:[10,7,80,42]},
  // Título na largura toda, texto e foto lado a lado embaixo.
  stack:    {title:[7,7,86,16],body:[7,29,42,62],visual:[53,29,40,62]}
};
const textLayouts={
  cover:     {title:[10,20,80,30],body:[16,56,68,30],align:'center'},
  statement: {title:[12,18,76,26],body:[16,51,68,34],align:'center'},
  editorial: {title:[7,16,38,62],body:[52,16,41,64],align:'left'},
  cards:     {title:[7,10,86,15],body:[7,30,86,58],align:'left'},
  columns:   {title:[7,10,86,15],body:[7,29,86,60],align:'left'},
  timeline:  {title:[7,10,86,15],body:[7,34,86,55],align:'left'},
  highlight: {title:[10,24,30,28],body:[48,18,45,64],align:'left'}
};

const rect=([x,y,w,h])=>({x,y,w,h});

// Separa tópicos ou frases do corpo para layouts estruturados (cartões, colunas, linha do tempo).
function splitSlideItems(body){
  const raw=String(body||'').replace(/\r\n/g,'\n').trim();
  if(!raw)return [];
  const lines=raw.split('\n').map(line=>line.replace(/^\s*(?:[•\-–—*]|\d+[.)])\s*/,'').trim()).filter(Boolean);
  if(lines.length>=2)return lines;
  const sentences=raw.split(/(?<=[.!?])\s+/).map(part=>part.trim()).filter(Boolean);
  return sentences.length>=2?sentences:lines;
}

function splitItemTitle(item){
  const colon=item.indexOf(':');
  if(colon>2&&colon<=40&&colon<item.length-4){
    return {heading:item.slice(0,colon).trim(),detail:item.slice(colon+1).trim()};
  }
  const dash=item.indexOf(' — ');
  if(dash>2&&dash<=40&&dash<item.length-4){
    return {heading:item.slice(0,dash).trim(),detail:item.slice(dash+3).trim()};
  }
  return {heading:'',detail:item};
}

function fitFont(value,frame,max,bold){
  const [, ,w,h]=frame;
  for(let size=max;size>14;size-=2){
    const capacity=Math.max(1,Math.floor(w*12.8/(size*(bold ? .62 : .57))));
    const lines=value.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil((line.length+3)/capacity)),0);
    if(lines*size*1.24<h*7.2)return size;
  }
  return 14;
}

// Texto que não cabe no quadro deixa o slide feio e ilegível. O corte acontece
// só quando o corpo passa do limite, no tamanho menor de leitura, e termina
// em uma palavra inteira.
function fitContent(value,frame,bold,minSize=15){
  const [, ,w,h]=frame;
  const size=minSize;
  const capacity=Math.max(8,Math.floor(w*12.8/(size*(bold ? .62 : .57))));
  const lines=Math.max(1,Math.floor(h*7.2/(size*1.24)));
  const maxChars=Math.max(16,capacity*lines);
  if(!value||value.length<=maxChars)return value;
  const clipped=value.slice(0,maxChars).replace(/\s+\S*$/,'');
  return (clipped||value.slice(0,maxChars)).trimEnd()+'…';
}

function tiles(area,count){
  const [x,y,w,h]=area;
  const cols=Math.min(count,Math.max(1,Math.ceil(Math.sqrt(count*w/h*1.1))));
  const rows=Math.ceil(count/cols);
  const gap=1.8, width=(w-gap*(cols-1))/cols, height=(h-gap*(rows-1))/rows;
  return Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cols),used=Math.min(cols,count-row*cols);
    return [x+(cols-used)*(width+gap)/2+(i%cols)*(width+gap),y+row*(height+gap),width,height];
  });
}

// Ajusta o quadro [x,y,w,h] (em % de um slide 16:9) ao formato da foto, centralizado na área original.
// `ratio` é largura/altura da foto; 0 = desconhecido (mantém o quadro).
// Folga pequena (1.04) evita cortes bruscos em rostos, gráficos e legendas.
export function fitPhoto(frame,ratio,slack=1.04){
  if(!(ratio>0))return frame;
  const [x,y,w,h]=frame,current=w*16/(h*9);
  if(ratio>current*slack){const height=w*16/(9*ratio/slack);return [x,y+(h-height)/2,w,height];}
  if(ratio<current/slack){const width=h*9*ratio*slack/16;return [x+(w-width)/2,y,width,h];}
  return frame;
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
  // Composição livre da IA só vale com quadros bem separados e dentro da margem:
  // evita sobreposição de texto, quadros cortados e tiras estreitas.
  const roomy=(box,minW,minH)=>box&&box[2]>=minW&&box[3]>=minH&&box[0]>=4&&box[1]>=4&&box[0]+box[2]<=96&&box[1]+box[3]<=96?box:null;
  const customFrames={title:roomy(frame(proposed?.title),30,12),body:roomy(frame(proposed?.body),30,20),visual:roomy(frame(proposed?.visual),24,30)};
  const overlaps=(a,b)=>a&&b&&a[0]<b[0]+b[2]+2.5&&a[0]+a[2]+2.5>b[0]&&a[1]<b[1]+b[3]+2.5&&a[1]+a[3]+2.5>b[1];
  const customComposition=customFrames.title&&customFrames.body&&(!mediaCount||customFrames.visual)&&
    !overlaps(customFrames.title,customFrames.body)&&!overlaps(customFrames.title,customFrames.visual)&&!overlaps(customFrames.body,customFrames.visual);
  const items=splitSlideItems(body);
  const rawAllowed=mediaCount>=5?['gallery','feature']:layoutsByMedia[mediaCount===0?'none':mediaCount===1?'single':'multiple'];
  const allowed=mediaCount?rawAllowed:rawAllowed.filter(name=>!(name==='cover'&&index>0&&safeSpec.layout!=='cover')&&(items.length>=2||!['cards','columns','timeline'].includes(name)));
  const pool=allowed.length?allowed:['editorial','statement','highlight'];
  const preferred=aiLayouts.includes(safeSpec.layout)?safeSpec.layout:layoutOrder[index%layoutOrder.length];
  // Evita repetir os últimos layouts e prioriza os menos usados na apresentação.
  const recent=Array.isArray(previous?.recent)?previous.recent:previous?.layout?[previous.layout]:[];
  const used={...(previous?.used||{})};
  const avoid=recent.slice(-Math.min(4,Math.max(1,pool.length-1)));
  const byLeastUsed=list=>[...list].sort((a,b)=>(used[a]||0)-(used[b]||0));
  const fresh=byLeastUsed(pool.filter(name=>!avoid.includes(name)));
  // Foto panorâmica pede faixa larga; foto 16:9/4:3 vai bem em pilha ou dividido; foto em pé pede coluna lateral.
  const ratio=images.length===1&&!model?Number(images[0].ratio)||0:0;
  const suited=ratio>=1.55?['banner','feature','stack']:ratio>=1.2?['stack','split','feature','cover']:ratio&&ratio<.9?['split','cover','stack']:[];
  const layout=fresh.includes(preferred)&&(!suited.length||suited.includes(preferred))?preferred
    :fresh.find(name=>suited.includes(name))||byLeastUsed(suited.filter(name=>pool.includes(name)&&name!==previous?.layout))[0]
    ||(fresh.includes(preferred)?preferred:fresh[0])||byLeastUsed(pool.filter(name=>name!==previous?.layout))[0]||pool[0];
  // Cada layout lateral vai para o lado oposto do anterior.
  const sided=!customComposition&&index>0&&mediaCount>0&&sideLayouts.includes(layout),lastFlip=previous?.sideFlip??true;
  const mirrored=sided&&!lastFlip;
  const structured=!mediaCount&&!customComposition&&structuredTextLayouts.has(layout);
  let {title:titleFrame,body:bodyFrame,visual,align='left'}=mediaCount?mediaLayouts[layout]:textLayouts[layout];
  if(customComposition){titleFrame=customFrames.title;bodyFrame=customFrames.body;if(mediaCount)visual=customFrames.visual;align=proposed.align==='center'?'center':proposed.align==='right'?'right':'left';}
  if(mirrored){
    const flip=([x,y,w,h])=>[100-x-w,y,w,h];
    // O título de largura total (stack) fica onde está.
    if(titleFrame[2]<80)titleFrame=flip(titleFrame);
    bodyFrame=flip(bodyFrame);visual=flip(visual);
  }
  const elements=[];
  let decor=0;
  const decorId=kind=>`ai-decor-${kind}-${index}-${decor++}`;
  const shape=(box,background,cornerRadius=0,kind='accent')=>newElement('shape',{id:decorId(kind),...rect(box),background,cornerRadius});
  const ellipse=(box,background,kind='tint')=>newElement('shape',{id:decorId(kind),...rect(box),shapeType:'ellipse',background});
  const veil=mixHex(theme.background,isLight?'#000000':'#ffffff',isLight?.045:.075);
  const cardSurface=mixHex(theme.background,isLight?'#000000':'#ffffff',isLight?.055:.09);
  const cardSurfaceStrong=mixHex(theme.background,theme.accent,isLight?.12:.22);
  const tints=Array.isArray(theme.tints)&&theme.tints.length?theme.tints:[theme.accent];
  const tintAt=step=>tints[(index+step)%tints.length];
  const tintStrong=step=>isLight?mixHex(theme.background,tintAt(step),.62):tintAt(step);
  const titleColor=readable(theme.accent,theme.background,true);
  const bodyColor=readable(theme.color,theme.background,false);
  const cardTitleColor=readable(theme.accent,cardSurface,true);
  const cardBodyColor=readable(theme.color,cardSurface,false);
  const headingFont=font||theme.heading||(['cover','editorial'].includes(layout)?'Georgia':'Arial');
  const bodyFont=font||theme.body||'Arial';
  const titleText=fitContent(String(title||''),titleFrame,true);
  const bodyText=fitContent(String(body||''),bodyFrame,false);
  const bodyAlign=align==='center'&&bodyText.includes('•')?'left':align;

  // Formas de apoio: só entram em espaços livres para nunca atrapalhar a leitura.
  const protectedFrames=layout==='highlight'
    ?[[7,15,36,70],[47,15,46,70]]
    :[titleFrame,bodyFrame,visual].filter(Boolean);
  const taken=[];
  const free=(box,pad=1.6)=>![...protectedFrames,...taken].some(([x,y,w,h])=>
    box[0]<x+w+pad&&box[0]+box[2]>x-pad&&box[1]<y+h+pad&&box[1]+box[3]>y-pad);
  const blobColors=step=>mixHex(theme.background,tintAt(step),isLight?.58:.26);
  const blobCandidates=[
    [-26,-36,62,82],[-28,46,62,90],[68,-34,58,80],[70,42,54,86],
    [-24,70,56,66],[46,-42,64,70],[4,-44,58,66]
  ];
  const blob=blobCandidates.find(box=>free(box));
  if(blob){elements.push(ellipse(blob,blobColors(0)));taken.push(blob);}
  const spotCandidates=[[0,78,11,19],[85,74,11,18],[-4,-10,14,26],[86,-8,14,24],[88,4,8,12],[2,88,8,10]];
  const spot=spotCandidates.find(box=>free(box,.8));
  if(spot){elements.push(ellipse(spot,blobColors(1)));taken.push(spot);}
  const lineCandidates=[[7,93.8,17,.55],[92.8,20,.5,18],[7,12,12,.5],[49,10.5,10,.6]];
  const line=lineCandidates.find(box=>free(box,.8));
  if(line){elements.push(shape(line,theme.accent,10,'accent'));taken.push(line);}
  const dotSpots=[[8,91],[84,91],[85,5.5],[7,5.5]];
  const dot=dotSpots.find(([x,y])=>free([x,y,9,4.2],.6));
  if(dot){
    for(let i=0;i<3;i++)elements.push(ellipse([dot[0]+i*2.6,dot[1],1.35,2.35],tintStrong(i+2)));
    taken.push([dot[0],dot[1],9,4.2]);
  }
  const diamondSpot=[[88,6,4.5,4.5],[6,89,4.5,4.5],[89,88,4.5,4.5],[5,6,4.5,4.5]].find(box=>free(box,.8));
  if(diamondSpot){elements.push(newElement('shape',{id:decorId('accent'),...rect(diamondSpot),shapeType:'diamond',background:theme.accent}));taken.push(diamondSpot);}

  if(structured){
    if(layout==='cards'){
      const cards=items.slice(0,3),gap=2.8,w=(86-gap*(cards.length-1))/cards.length;
      elements.push(shape([7,7.2,9,.85],theme.accent,10,'accent'));
      elements.push(newElement('text',{...rect(titleFrame),role:'title',text:titleText,align:'left',bold:true,color:titleColor,fontFamily:headingFont,fontSize:fitFont(titleText,titleFrame,46,true)}));
      cards.forEach((entry,i)=>{
        const cx=7+i*(w+gap),cy=29,ch=59,accent=tintStrong(i);
        const {heading,detail}=splitItemTitle(entry);
        elements.push(shape([cx,cy,w,ch],cardSurface,14,'card'));
        elements.push(shape([cx+2.4,cy+2.8,Math.min(10,w*.32),1],accent,8,'accent'));
        elements.push(newElement('text',{x:cx+2.4,y:cy+5.4,w:w-4.8,h:7,text:String(i+1).padStart(2,'0'),bold:true,color:readable(accent,cardSurface,true),fontFamily:headingFont,fontSize:20,align:'left'}));
        if(heading){
          const hBox=[cx+2.4,cy+13.5,w-4.8,14],dBox=[cx+2.4,cy+28.5,w-4.8,ch-32];
          const hText=fitContent(heading,hBox,true,15),dText=fitContent(detail,dBox,false,14);
          elements.push(
            newElement('text',{...rect(hBox),text:hText,bold:true,color:cardTitleColor,fontFamily:headingFont,fontSize:fitFont(hText,hBox,24,true),align:'left'}),
            newElement('text',{...rect(dBox),text:dText,color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(dText,dBox,20,false),align:'left'})
          );
        } else {
          const dBox=[cx+2.4,cy+14.5,w-4.8,ch-18],dText=fitContent(detail,dBox,false,14);
          elements.push(newElement('text',{...rect(dBox),text:dText,color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(dText,dBox,22,false),align:'left'}));
        }
      });
    } else if(layout==='columns'){
      const mid=Math.ceil(items.length/2),groups=[items.slice(0,mid),items.slice(mid)].filter(g=>g.length);
      const gap=3.2,w=(86-gap*(groups.length-1))/groups.length;
      elements.push(shape([7,7.2,9,.85],theme.accent,10,'accent'));
      elements.push(newElement('text',{...rect(titleFrame),role:'title',text:titleText,align:'left',bold:true,color:titleColor,fontFamily:headingFont,fontSize:fitFont(titleText,titleFrame,46,true)}));
      groups.forEach((group,i)=>{
        const cx=7+i*(w+gap),cy=29,ch=59,accent=tintStrong(i);
        const textBlock=group.map(item=>groups.length>1&&group.length>1?'• '+item:item).join('\n\n');
        const box=[cx+3.4,cy+4.5,w-5.8,ch-9],fitted=fitContent(textBlock,box,false,15);
        elements.push(shape([cx,cy,w,ch],cardSurface,14,'card'));
        elements.push(shape([cx+1.2,cy+4,0.85,ch-8],accent,6,'accent'));
        elements.push(newElement('text',{...rect(box),text:fitted,color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(fitted,box,24,false),align:'left',verticalAlign:'center'}));
      });
    } else if(layout==='timeline'){
      const steps=items.slice(0,4),gap=2.2,w=(86-gap*(steps.length-1))/steps.length;
      elements.push(shape([7,7.2,9,.85],theme.accent,10,'accent'));
      elements.push(newElement('text',{...rect(titleFrame),role:'title',text:titleText,align:'left',bold:true,color:titleColor,fontFamily:headingFont,fontSize:fitFont(titleText,titleFrame,46,true)}));
      elements.push(shape([7+w/2,35.6,86-w,.7],theme.accent,8,'accent'));
      steps.forEach((entry,i)=>{
        const cx=7+i*(w+gap),accent=tintStrong(i),badgeColor=readable('#ffffff',accent,true);
        const {heading,detail}=splitItemTitle(entry);
        const dotX=cx+w/2-2.6;
        elements.push(ellipse([dotX,31.2,5.2,9.2],accent,'tint'));
        elements.push(newElement('text',{x:dotX,y:31.2,w:5.2,h:9.2,text:String(i+1),bold:true,color:badgeColor,fontFamily:headingFont,fontSize:20,align:'center',verticalAlign:'center'}));
        elements.push(shape([cx,44,w,44],cardSurface,12,'card'));
        if(heading){
          const hBox=[cx+2,46.8,w-4,12],dBox=[cx+2,59.5,w-4,25.5];
          const hText=fitContent(heading,hBox,true,14),dText=fitContent(detail,dBox,false,14);
          elements.push(
            newElement('text',{...rect(hBox),text:hText,bold:true,color:cardTitleColor,fontFamily:headingFont,fontSize:fitFont(hText,hBox,20,true),align:'center'}),
            newElement('text',{...rect(dBox),text:dText,color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(dText,dBox,18,false),align:'center'})
          );
        } else {
          const dBox=[cx+2,47.5,w-4,37],dText=fitContent(detail,dBox,false,14);
          elements.push(newElement('text',{...rect(dBox),text:dText,color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(dText,dBox,19,false),align:'center',verticalAlign:'center'}));
        }
      });
    } else if(layout==='highlight'){
      const firstLine=items[0]||bodyText;
      const restText=items.length>1?items.slice(1).map(item=>'• '+item).join('\n\n'):bodyText;
      const leftTitleColor=readable(theme.accent,cardSurfaceStrong,true);
      const leftSubColor=readable(theme.color,cardSurfaceStrong,false);
      elements.push(shape([7,15,36,70],cardSurfaceStrong,16,'card'));
      elements.push(shape([10,20,10,1],theme.accent,8,'accent'));
      const hTitleFrame=[10,24,30,28],hLeadFrame=[10,55,30,24];
      const hTitle=fitContent(String(title||''),hTitleFrame,true,16);
      const hLead=fitContent(items.length>1?firstLine:'',hLeadFrame,false,15);
      elements.push(newElement('text',{...rect(hTitleFrame),role:'title',text:hTitle,align:'left',bold:true,color:leftTitleColor,fontFamily:headingFont,fontSize:fitFont(hTitle,hTitleFrame,42,true),verticalAlign:'center'}));
      if(hLead)elements.push(newElement('text',{...rect(hLeadFrame),text:hLead,align:'left',color:leftSubColor,fontFamily:bodyFont,fontSize:fitFont(hLead,hLeadFrame,21,false)}));
      elements.push(shape([47,15,46,70],cardSurface,16,'card'));
      const rightFrame=[51,20,38,60],rightText=fitContent(restText,rightFrame,false,15);
      elements.push(newElement('text',{...rect(rightFrame),text:rightText,align:'left',color:cardBodyColor,fontFamily:bodyFont,fontSize:fitFont(rightText,rightFrame,26,false),verticalAlign:'center'}));
    }
  } else {
    if(layout==='editorial'&&!customComposition)elements.push(shape([48.5,16,.45,64],theme.accent,0,'accent'));
    if(layout==='statement'){
      elements.push(shape([45,14,10,.8],theme.accent,10,'accent'));
      elements.push(shape([13,48,74,39],cardSurface,16,'card'));
    }
    if(layout==='cover')elements.push(shape([mediaCount?titleFrame[0]:44,16,12,1],theme.accent,10,'accent'));
    if(layout==='banner')elements.push(shape([7,52.2,14,.75],theme.accent,10,'accent'));
    if(layout==='stack')elements.push(shape([7,24.8,14,.75],theme.accent,10,'accent'));
    if(layout==='feature')elements.push(shape([7,22.2,16,.75],theme.accent,10,'accent'));
    if(layout==='split')elements.push(shape([titleFrame[0],8.5,8,.75],theme.accent,10,'accent'));
    if(layout==='gallery')elements.push(shape([7,37.5,86,.45],theme.accent,0,'accent'));
    if(layout==='statement'||layout==='cover'){
      const symbolX=align==='center'?titleFrame[0]+titleFrame[2]/2-4:titleFrame[0];
      const symbolY=Math.max(3,titleFrame[1]-11);
      elements.push(newElement('text',{id:decorId('accent'),x:symbolX,y:symbolY,w:8,h:7,text:'✦',fontFamily:headingFont,
        fontSize:layout==='cover'?34:28,color:mixHex(theme.background,titleColor,.78),align:align==='center'?'center':'left',bold:true}));
    }
    const effectiveBodyColor=layout==='statement'?cardBodyColor:bodyColor;
    elements.push(
      newElement('text',{...rect(titleFrame),role:'title',text:titleText,align,bold:true,color:titleColor,
        fontFamily:headingFont,
        fontSize:fitFont(titleText,titleFrame,layout==='cover'?70:54,true),verticalAlign:layout==='editorial'?'center':'start'}),
      newElement('text',{...rect(bodyFrame),text:bodyText,align:bodyAlign,color:effectiveBodyColor,fontFamily:bodyFont,fontSize:fitFont(bodyText,bodyFrame,layout==='gallery'?26:32,false),
        verticalAlign:layout==='editorial'||layout==='statement'?'center':'start'})
    );
  }
  if(visual){
    const [x,y,w,h]=visual;
    const modelWidth=model&&images.length?w*.43:w;
    const frames=images.length?tiles(model?[x+modelWidth+1.5,y,w-modelWidth-1.5,h]:visual,images.length):[];
    if(model)elements.push(newElement('model',{...rect([x,y,modelWidth,h]),...model}));
    for(const [i,image] of images.entries()){
      // O quadro acompanha o formato real da foto (folga mínima de ~4%) para não cortar cabeças nem gráficos.
      frames[i]=fitPhoto(frames[i],Number(image.ratio)||0);
      const [px,py,pw,ph]=frames[i];
      if(!image.transparent){
        const vx=Math.max(2,px-1),vy=Math.max(2,py-1.3),vw=Math.min(98-vx,pw+2),vh=Math.min(98-vy,ph+2.6);
        elements.push(shape([vx,vy,vw,vh],veil,10,'card'));
        elements.push(shape([Math.max(2,px-.22),Math.max(2,py-.3),Math.min(98-px,pw+.44),Math.min(98-py,ph+.6)],isLight?'#ffffff':theme.accent,8,'accent'));
      }
      elements.push(newElement('image',{...rect(frames[i]),image:image.data,imageFit:image.transparent?'contain':'cover',imageAlt:image.alt||'Foto '+(image.index+1)+' do conjunto enviado'}));
    }
  }
  const nextUsed={...used,[layout]:(used[layout]||0)+1};
  return {elements,theme:palette,layout,recent:[...recent,layout].slice(-5),used:nextUsed,sideFlip:sided?mirrored:lastFlip,customComposition,background:theme.background,
    backgroundFill:{mode:'gradient',end,angle:(index*41+115)%360}};
}
