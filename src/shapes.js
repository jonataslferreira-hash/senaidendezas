export const shapes = {
  rectangle:{label:'Retângulo',path:''},
  ellipse:{label:'Círculo',path:''},
  triangle:{label:'Triângulo',path:'50,3 97,97 3,97'},
  diamond:{label:'Losango',path:'50,3 97,50 50,97 3,50'},
  arrow:{label:'Seta',path:'3,31 58,31 58,6 97,50 58,94 58,69 3,69'},
  star:{label:'Estrela',path:'50,3 62,36 97,37 69,58 79,94 50,73 21,94 31,58 3,37 38,36'},
  icon:{label:'Ícone',path:''},
  custom:{label:'Desenhar forma',path:''}
};

// Ícones de objetos desenhados com traço: continuam editáveis, mudam de cor
// com o elemento e não dependem de arquivos externos.
export const shapeIcons = {
  monitor:{label:'Monitor',paths:['M8 16h84v50H8z','M40 76h20','M30 86h40']},
  laptop:{label:'Notebook',paths:['M20 18h60v40H20z','M8 68h84l-8 12H16z']},
  keyboard:{label:'Teclado',paths:['M8 34h84v32H8z','M20 44h.1 M34 44h.1 M48 44h.1 M62 44h.1 M76 44h.1','M20 56h.1 M34 56h.1 M62 56h.1 M76 56h.1','M42 56h16']},
  mouse:{label:'Mouse',paths:['M50 12c13 0 21 11 21 28v18c0 17-9 28-21 28s-21-11-21-28V40c0-17 8-28 21-28z','M50 16v22']},
  cloud:{label:'Nuvem',paths:['M30 74h40a15 15 0 0 0 2-30 22 22 0 0 0-42-3 17 17 0 0 0 0 33z']},
  bulb:{label:'Ideia',paths:['M50 10a20 20 0 0 0-12 36l4 6v8h16v-8l4-6A20 20 0 0 0 50 10z','M42 70h16','M44 80h12']},
  robot:{label:'Robô',paths:['M28 34h44v32H28z','M28 44H18v12h10 M72 44h10v12H72','M50 16v10','M40 48h.1 M60 48h.1','M42 58h16']},
  gear:{label:'Engrenagem',paths:['M50 34a16 16 0 1 0 0 32 16 16 0 0 0 0-32z','M50 10v14 M50 76v14 M10 50h14 M76 50h14','M22 22l10 10 M68 68l10 10 M78 22 68 32 M32 68 22 78']},
  folder:{label:'Pasta',paths:['M10 30h26l8 8h46v44H10z']},
  globe:{label:'Mundo',paths:['M50 12a38 38 0 1 0 0 76 38 38 0 0 0 0-76z','M12 50h76','M50 12c14 12 14 64 0 76','M50 12c-14 12-14 64 0 76']},
  lock:{label:'Cadeado',paths:['M30 46h40v34H30z','M38 46v-8a12 12 0 0 1 24 0v8','M50 58h.1']},
  wifi:{label:'Wi-Fi',paths:['M18 42a46 46 0 0 1 64 0','M30 56a28 28 0 0 1 40 0','M42 68a13 13 0 0 1 16 0','M50 80h.1']},
  battery:{label:'Bateria',paths:['M14 34h62v32H14z','M76 44h10v12H76z','M24 42h28v16H24z']},
  rocket:{label:'Foguete',paths:['M50 10c10 8 16 22 16 38l-8 10H42l-8-10c0-16 6-30 16-38z','M34 56l-10 16 14-4','M66 56l10 16-14-4','M50 34h.1','M42 74l8 14 8-14']},
  chip:{label:'Processador',paths:['M32 28h36v44H32z','M40 18v10 M50 18v10 M60 18v10 M40 72v10 M50 72v10 M60 72v10','M22 38h10 M22 50h10 M22 62h10 M68 38h10 M68 50h10 M68 62h10']},
  database:{label:'Banco de dados',paths:['M24 24c0-7 12-12 26-12s26 5 26 12-12 12-26 12-26-5-26-12z','M24 24v52c0 7 12 12 26 12s26-5 26-12V24','M24 50c0 7 12 12 26 12s26-5 26-12']},
  server:{label:'Servidor',paths:['M22 18h56v26H22z','M22 56h56v26H22z','M32 31h.1 M32 69h.1','M44 31h20 M44 69h20']},
  camera:{label:'Câmera',paths:['M12 34h18l7-9h26l7 9h18v44H12z','M50 42a14 14 0 1 0 0 28 14 14 0 0 0 0-28z']},
  phone:{label:'Celular',paths:['M34 10h32v80H34z','M44 18h12','M46 80h8']},
  printer:{label:'Impressora',paths:['M26 20h48v18H26z','M18 38h64v30H18z','M30 68h40v20H30z','M28 48h.1']},
  lightning:{label:'Energia',paths:['M58 8 26 54h22l-6 38 32-48H52z']},
  neural:{label:'Rede neural',paths:['M24 24m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0','M24 76m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0','M76 24m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0','M76 76m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0','M50 50m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0','M28 28l16 16 M28 72l16-16 M72 28 56 44 M72 72 56 56']},
  chart:{label:'Gráfico',paths:['M14 86h72','M14 86V14','M26 70l18-22 14 10 22-30']},
  pin:{label:'Local',paths:['M50 88S24 60 24 40a26 26 0 0 1 52 0c0 20-26 48-26 48z','M50 32h.1']}
};

export function iconGraphic(background, name, strokeWidth = 7){
  const icon=shapeIcons[name]||shapeIcons.monitor;
  const width=Math.max(4,Math.min(14,Number(strokeWidth)||7));
  const paths=icon.paths.map(d=>`<path d="${d}" fill="none" stroke="${background}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg class="canvas-shape-path" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${paths}</svg>`;
}


export function shapeFields(e){
  const shapePoints=Array.isArray(e.shapePoints)?e.shapePoints.slice(0,100)
    .filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))
    .map(p=>p.map(n=>Math.min(100,Math.max(0,n)))):[];
  const validType=Object.hasOwn(shapes,e.shapeType)&&(e.shapeType!=='custom'||shapePoints.length>=3);
  return {
    shapeType:validType?e.shapeType:'rectangle',shapePoints,
    iconName:Object.hasOwn(shapeIcons,e.iconName)?e.iconName:'monitor',
    borderWidth:Math.max(0,Math.min(40,Number(e.borderWidth)||0)),
    borderColor:/^#[0-9a-f]{6}$/i.test(e.borderColor)?e.borderColor:'#ffffff',
    cornerRadius:e.cornerRadius==null?null:Math.max(0,Math.min(100,Number(e.cornerRadius)||0))
  };
}

function roundedPolygon(points,radius){
  const toward=([x,y],[tx,ty])=>{
    const length=Math.hypot(tx-x,ty-y),ratio=length?Math.min(.45,radius/length):0;
    return (x+(tx-x)*ratio).toFixed(2)+','+(y+(ty-y)*ratio).toFixed(2);
  };
  return points.map((p,i)=>{
    const before=toward(p,points.at(i-1)),after=toward(p,points[(i+1)%points.length]);
    return (i?'L':'M')+before+'Q'+p.join(',')+' '+after;
  }).join('')+'Z';
}

export function shapeGraphic(e) {
  const s=shapeFields(e);
  if(s.shapeType==='icon')return iconGraphic(e.background,s.iconName,s.borderWidth||7);
  const paint=`fill="${e.background}" stroke="${s.borderColor}" stroke-width="${s.borderWidth/4}" stroke-linejoin="round"`;
  const points=s.shapeType==='custom'?s.shapePoints:shapes[s.shapeType].path.split(' ').filter(Boolean).map(pair=>pair.split(',').map(Number));
  const body=s.shapeType==='ellipse'?`<ellipse cx="50" cy="50" rx="45" ry="45" ${paint}/>`:
    s.cornerRadius&&points.length?`<path d="${roundedPolygon(points,s.cornerRadius/4)}" ${paint}/>`:
    `<polygon points="${points.map(p=>p.join(',')).join(' ')}" ${paint}/>`;
  return s.shapeType==='rectangle'
    ? `<div class="canvas-shape" style="background:${e.background};${s.cornerRadius===null?'':`border-radius:${s.cornerRadius/12.8}cqw;`}${s.borderWidth? `border:${s.borderWidth/12.8}cqw solid ${s.borderColor};`:''}"></div>`
    : `<svg class="canvas-shape-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
}

export async function pickShape() {
  const dialog=document.createElement('dialog');
  dialog.className='studio-dialog shape-dialog';
  const formShapes=Object.entries(shapes).filter(([id])=>id!=='icon').map(([id,shape])=>{
    const preview=id==='custom'?'＋':shapeGraphic({shapeType:id,background:'currentColor'});
    return `<button value="${id}"><span class="shape-option-preview" aria-hidden="true">${preview}</span>${shape.label}</button>`;
  }).join('');
  const formIcons=Object.entries(shapeIcons).map(([id,icon])=>
    `<button value="icon:${id}" title="${icon.label}"><span class="shape-option-preview" aria-hidden="true">${iconGraphic('currentColor',id,8)}</span>${icon.label}</button>`
  ).join('');
  dialog.innerHTML=`<form method="dialog"><h2>Adicionar forma</h2><p class="shape-section-label">Formas</p><div class="shape-options">${formShapes}</div><p class="shape-section-label">Ícones de objetos</p><div class="shape-options shape-icons">${formIcons}</div><button value="cancel">Cancelar</button></form>`;
  (document.querySelector('#app')||document.body).append(dialog);
  dialog.showModal();
  await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
  const type=dialog.returnValue;
  dialog.remove();
  if(typeof type==='string'&&type.startsWith('icon:')&&Object.hasOwn(shapeIcons,type.slice(5)))return {shapeType:'icon',iconName:type.slice(5)};
  if(type!=='custom')return Object.hasOwn(shapes,type)?{shapeType:type}:null;

  dialog.innerHTML='<form method="dialog"><h2>Desenhe sua forma</h2><p>Toque na área para marcar pelo menos três pontos. A forma fecha automaticamente.</p><svg viewBox="0 0 100 100" aria-label="Área para desenhar"><polygon></polygon></svg><div><button value="cancel">Cancelar</button><button type="button" data-reset>Limpar</button><button value="apply" disabled>Adicionar forma</button></div></form>';
  (document.querySelector('#app')||document.body).append(dialog);
  const svg=dialog.querySelector('svg'), points=[], apply=dialog.querySelector('[value=apply]');
  const paint=()=>{svg.firstElementChild.setAttribute('points',points.map(p=>p.join(',')).join(' '));apply.disabled=points.length<3;};
  svg.onclick=e=>{
    if(points.length===100)return;
    const rect=svg.getBoundingClientRect();
    points.push([Math.round((e.clientX-rect.left)*100/rect.width),Math.round((e.clientY-rect.top)*100/rect.height)]);
    paint();
  };
  dialog.querySelector('[data-reset]').onclick=()=>{points.length=0;paint();};
  dialog.returnValue='';
  dialog.showModal();
  await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
  dialog.remove();
  return dialog.returnValue==='apply'?{shapeType:'custom',shapePoints:points}:null;
}
