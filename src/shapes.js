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
  pin:{label:'Local',paths:['M50 88S24 60 24 40a26 26 0 0 1 52 0c0 20-26 48-26 48z','M50 32h.1']},
  heart:{label:'Coração',paths:['M50 82 19 51C-1 31 26 6 44 24l6 7 6-7C74 6 101 31 81 51Z']},
  sailboat:{label:'Veleiro',paths:['M48 16 22 59h26z','M57 30v29h20z','M12 67h76L75 81H25z','M15 90q9 4 18 0t18 0 18 0 18 0']},
  music:{label:'Música',paths:['M36 72V26l42-9v45','M36 72c0 6-6 11-14 11s-11-3-11-8 6-10 14-10c6 0 11 3 11 7z','M78 62c0 6-6 11-14 11s-11-3-11-8 6-10 14-10c6 0 11 3 11 7z','m36 40 42-9']},
  gamepad:{label:'Controle de jogo',paths:['M26 28h48c8 0 13 7 16 18l5 17c4 14-9 20-17 12L65 62H35L22 75c-8 8-21 2-17-12l5-17c3-11 8-18 16-18z','M19 47h22 M30 36v22','M69 42h.1 M80 51h.1']},
  film:{label:'Película',paths:['M13 16h74v68H13z M27 16v68 M73 16v68 M27 50h46','M13 33h14 M13 67h14 M73 33h14 M73 67h14']},
  vase:{label:'Vaso de cerâmica',paths:['M37 17h26v19c0 11 13 16 13 32 0 11-12 17-26 17s-26-6-26-17c0-16 13-21 13-32z','M31 60c14 9 26 9 38 0 M37 28h26']},
  cup:{label:'Xícara',paths:['M16 45h61v13c0 13-11 23-23 23H39c-13 0-23-10-23-23z','M77 49h7a9 9 0 0 1 0 18h-10 M11 88h72','M37 33c-13-9 10-12 0-21 M54 33c-13-9 10-12 0-21']},
  book:{label:'Livro aberto',paths:['M50 29c-11-11-25-12-39-8v52c14-4 28-3 39 8 11-11 25-12 39-8V21c-14-4-28-3-39 8v52','M22 35c7-1 13 0 20 4 M22 49c7-1 13 0 20 4 M58 39c7-4 13-5 20-4 M58 53c7-4 13-5 20-4']},
  flower:{label:'Flor',paths:['M50 39c-11-17-5-23 0-23s11 6 0 23c11-17 21-12 22-5s-4 12-16 14c19 0 24 9 18 15-5 6-15 3-21-9 7 15 2 22-5 21s-10-10-4-21c-10 14-18 14-23 7s2-13 17-14c-17-3-19-13-13-18s14-1 25 10z','M50 67v20 M50 85q10-12 19-10 M50 85q-9-10-19-8']},
  balloon:{label:'Balão',paths:['M50 13c-15 0-26 11-26 26 0 17 11 31 26 31s26-14 26-31c0-15-11-26-26-26z','m46 70-5 8h18l-5-8','M50 79c-10 4 8 10-3 15','M36 37c0-6 3-10 9-13']},
  moon:{label:'Lua crescente',paths:['M68 16a36 36 0 1 0 16 52A35 35 0 0 1 68 16z','M77 32h15 M84.5 24.5v15 M73 49h.1']},
  berry:{label:'Morango',paths:['M50 33c-8-14-18-11-25-3 7 0 10 3 15 7-13-2-22 3-22 13 0 17 20 36 32 36s32-19 32-36c0-10-9-15-22-13 5-4 8-7 15-7-7-8-17-11-25 3z','M50 33c-1-8 4-14 10-17','M35 49h.1 M51 49h.1 M67 49h.1 M42 61h.1 M58 61h.1 M50 72h.1']},
  paw:{label:'Patinha',paths:['M29 40c0 6-4 10-9 10s-9-5-9-11 4-10 9-10 9 5 9 11z','M46 28c0 7-4 12-9 12s-9-5-9-12 4-12 9-12 9 5 9 12z','M72 28c0 7-4 12-9 12s-9-5-9-12 4-12 9-12 9 5 9 12z','M89 39c0 6-4 11-9 11s-9-4-9-10 4-11 9-11 9 4 9 10z','M50 48c-8 0-12 5-18 13-11 15-6 24 5 24 5 0 8-3 13-3s8 3 13 3c11 0 16-9 5-24-6-8-10-13-18-13z']}
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
