import {AI_PHOTO_LIMIT,AI_PHOTOS_PER_SHEET} from './storage-ai-options.js';

export function canAttachPhoto(file){
  return /^image\/(png|jpeg|webp)$/.test(file.type)&&file.size<=12*1024*1024;
}

function whiteCanvas(width,height){
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,width,height);
  return ctx;
}

function scaledPhoto(image,maxSide){
  const scale=Math.min(1,maxSide/Math.max(image.width,image.height));
  const width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
  const ctx=whiteCanvas(width,height);
  ctx.drawImage(image,0,0,width,height);
  return ctx.canvas.toDataURL('image/jpeg',.78);
}

function sheet(){
  const ctx=whiteCanvas(680,610);
  ctx.fillStyle='#eef2fa';
  ctx.fillRect(0,0,680,610);
  return ctx;
}

function drawReference(ctx,image,index){
  const position=index%AI_PHOTOS_PER_SHEET;
  const x=12+(position%2)*334,y=12+Math.floor(position/2)*198;
  const scale=Math.min(318/image.width,164/image.height);
  const width=image.width*scale,height=image.height*scale;
  ctx.fillStyle='#fff';
  ctx.fillRect(x,y,322,184);
  ctx.drawImage(image,x+(322-width)/2,y+(164-height)/2,width,height);
  ctx.fillStyle='#132d4a';
  ctx.font='bold 15px Arial';
  ctx.fillText('Imagem '+(index+1),x+10,y+179);
}

export async function prepareSlidePhotos(files){
  if(files.length>AI_PHOTO_LIMIT)throw Error('Use até '+AI_PHOTO_LIMIT+' fotos por apresentação.');
  const images=[],references=[],sheets=files.length>3;
  let preview;
  for(const [index,file] of files.entries()){
    if(!canAttachPhoto(file))throw Error('Use PNG, JPEG ou WebP de até 12 MB por foto.');
    const image=await createImageBitmap(file).catch(()=>{throw Error('Não foi possível abrir uma das fotos.');});
    try{
      let data=scaledPhoto(image,1440);
      if(data.length>560000)data=scaledPhoto(image,1000);
      if(data.length>560000)data=scaledPhoto(image,760);
      images.push(data);
      if(!sheets)references.push(scaledPhoto(image,550));
      else{
        if(index%AI_PHOTOS_PER_SHEET===0)preview=sheet();
        drawReference(preview,image,index);
        if((index+1)%AI_PHOTOS_PER_SHEET===0||index===files.length-1)references.push(preview.canvas.toDataURL('image/jpeg',.70));
      }
    }finally{image.close();}
  }
  return {images,references,photoSheet:sheets};
}
