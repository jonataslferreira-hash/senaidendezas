export const shapes = {
  rectangle:{label:'Retângulo',path:''},
  ellipse:{label:'Círculo',path:''},
  triangle:{label:'Triângulo',path:'50,3 97,97 3,97'},
  diamond:{label:'Losango',path:'50,3 97,50 50,97 3,50'},
  arrow:{label:'Seta',path:'3,31 58,31 58,6 97,50 58,94 58,69 3,69'},
  star:{label:'Estrela',path:'50,3 62,36 97,37 69,58 79,94 50,73 21,94 31,58 3,37 38,36'},
  custom:{label:'Desenhar forma',path:''}
};

export function shapeFields(e){
  const shapePoints=Array.isArray(e.shapePoints)?e.shapePoints.slice(0,100)
    .filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))
    .map(p=>p.map(n=>Math.min(100,Math.max(0,n)))):[];
  const validType=Object.hasOwn(shapes,e.shapeType)&&(e.shapeType!=='custom'||shapePoints.length>=3);
  return {
    shapeType:validType?e.shapeType:'rectangle',shapePoints,
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
  dialog.innerHTML=`<form method="dialog"><h2>Adicionar forma</h2><div class="shape-options">${Object.entries(shapes).map(([id,shape])=>{
    const preview=id==='custom'?'＋':shapeGraphic({shapeType:id,background:'currentColor'});
    return `<button value="${id}"><span class="shape-option-preview" aria-hidden="true">${preview}</span>${shape.label}</button>`;
  }).join('')}</div><button value="cancel">Cancelar</button></form>`;
  (document.querySelector('#app')||document.body).append(dialog);
  dialog.showModal();
  await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
  const type=dialog.returnValue;
  dialog.remove();
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
