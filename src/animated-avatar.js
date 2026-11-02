const size=160;
const once=(target,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('Não foi possível ler esse vídeo. Tente MP4 ou WebM.')),8000);const finish=error=>{clearTimeout(timer);target.removeEventListener(name,ok);target.removeEventListener('error',bad);error?reject(error):resolve();},ok=()=>finish(),bad=()=>finish(Error('Formato de vídeo não suportado pelo navegador.'));target.addEventListener(name,ok,{once:true});target.addEventListener('error',bad,{once:true});});
export async function animatedAvatar(file,signal){
 if(file.size>30*1024*1024)throw Error('Use um GIF ou vídeo de até 30 MB.');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d',{willReadFrequently:true}),frames=[];
 const capture=(source,width,height,delay)=>{const side=Math.min(width,height);ctx.fillStyle='#eee6f6';ctx.fillRect(0,0,size,size);ctx.drawImage(source,(width-side)/2,(height-side)/2,side,side,0,0,size,size);frames.push({pixels:ctx.getImageData(0,0,size,size).data.buffer,delay});};
 if(file.type==='image/gif'){
  const bytes=new Uint8Array(await file.arrayBuffer());if(String.fromCharCode(...bytes.slice(0,3))!=='GIF')throw Error('GIF inválido.');const w=bytes[6]+bytes[7]*256,h=bytes[8]+bytes[9]*256;
  if(file.size<=256*1024&&w<=512&&h<=512)return file;
  if(w*h>16000000)throw Error('O GIF tem resolução muito grande. Use uma versão menor.');
  if(typeof ImageDecoder==='undefined')throw Error('Neste navegador, use um GIF de até 256 KB e 512 px.');
  const decoder=new ImageDecoder({data:bytes,type:'image/gif'});try{await decoder.tracks.ready;let duration=0;for(let i=0;i<Math.min(24,decoder.tracks.selectedTrack.frameCount)&&duration<3000;i++){signal?.throwIfAborted();const {image}=await decoder.decode({frameIndex:i}),delay=Math.max(40,Math.min(500,(image.duration||125000)/1000));capture(image,image.displayWidth,image.displayHeight,delay);image.close();duration+=delay;}}finally{decoder.close();}
 }else{
  const video=document.createElement('video'),url=URL.createObjectURL(file);video.muted=true;video.playsInline=true;video.preload='auto';video.src=url;
  try{await once(video,'loadedmetadata');if(!video.videoWidth)throw Error('Não foi possível ler esse vídeo.');await video.play();for(let i=0;i<24;i++){signal?.throwIfAborted();if(video.ended)break;capture(video,video.videoWidth,video.videoHeight,125);await new Promise(resolve=>setTimeout(resolve,125));}}finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 }
 signal?.throwIfAborted();if(!frames.length)throw Error('O arquivo não contém quadros utilizáveis.');
 const worker=new Worker(new URL('./avatar-gif.worker.js',import.meta.url),{type:'module'});
 try{const buffer=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('A conversão demorou demais. Use um vídeo menor.')),20000);const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelado','AbortError'));};signal?.addEventListener('abort',abort,{once:true});worker.onmessage=event=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);event.data.error?reject(Error(event.data.error)):resolve(event.data.buffer);};worker.onerror=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(Error('Não foi possível preparar a animação.'));};worker.postMessage({frames,size},frames.map(f=>f.pixels));});return new File([buffer],'avatar.gif',{type:'image/gif'});}finally{worker.terminate();}
}
