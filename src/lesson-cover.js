import { studioIcon } from './studio-icons.js';

export async function cropLessonCover(file) {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file?.type) || file.size > 15*1024*1024) {
    throw Error('Escolha uma imagem PNG, JPEG, WebP ou GIF de até 15 MB.');
  }
  const bitmap = await createImageBitmap(file).catch(()=>{throw Error('Não foi possível abrir esta imagem.');});
  const dialog = document.createElement('dialog');
  dialog.className='studio-dialog cover-dialog';
  dialog.innerHTML=`<form method="dialog">
    <h2>Enquadre a capa</h2>
    <canvas width="480" height="270" aria-label="Prévia da capa. Arraste para enquadrar."></canvas>
    <label>Zoom <input type="range" min="1" max="4" step=".02" value="1"></label>
    <div><button value="cancel">Cancelar</button><button value="apply">Usar capa</button></div>
  </form>`;
  document.body.append(dialog);
  const canvas=dialog.querySelector('canvas'), zoom=dialog.querySelector('input'), ctx=canvas.getContext('2d');
  let x=0,y=0,drag;
  function draw() {
    const scale=Math.max(canvas.width/bitmap.width,canvas.height/bitmap.height)*Number(zoom.value);
    const w=bitmap.width*scale,h=bitmap.height*scale;
    x=Math.max(-(w-canvas.width)/2,Math.min((w-canvas.width)/2,x));
    y=Math.max(-(h-canvas.height)/2,Math.min((h-canvas.height)/2,y));
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,(canvas.width-w)/2+x,(canvas.height-h)/2+y,w,h);
  }
  zoom.oninput=draw;
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};};
  canvas.onpointermove=e=>{
    if(!drag)return;
    x+=(e.clientX-drag.x)*canvas.width/canvas.clientWidth;
    y+=(e.clientY-drag.y)*canvas.height/canvas.clientHeight;
    drag={x:e.clientX,y:e.clientY};
    draw();
  };
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  draw();
  dialog.showModal();
  try {
    await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
    return dialog.returnValue==='apply'?encodeCover(canvas):'';
  } finally {
    bitmap.close();
    dialog.remove();
  }
}

export function encodeCover(canvas) {
  for (const quality of [.8,.6,.4,.25]) {
    const url=canvas.toDataURL('image/webp',quality);
    if(url.length<65000)return url;
  }
  return '';
}

export function projectFields() {
  return `<label for="rename-lesson">Título da aula</label><input id="rename-lesson" maxlength="140" required>
    <label for="rename-description">Descrição</label><textarea id="rename-description" maxlength="500"></textarea>
    <label class="lesson-cover-input">${studioIcon('upload')} Escolher capa<input type="file" data-lesson-cover-file accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>`;
}
