export async function takePhoto(){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('A câmera precisa de HTTPS ou localhost. Você também pode escolher uma foto.');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:720}},audio:false}).catch(()=>{throw Error('Permita o acesso à câmera para tirar a foto.');});
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='participant-dialog camera-photo';dialog.innerHTML='<header><h2>Tirar minha foto</h2><button type="button" data-close aria-label="Fechar câmera">×</button></header><video autoplay playsinline muted></video><p role="status">Centralize seu rosto no quadrado.</p><button type="button" data-shoot disabled>Tirar foto</button>';
  const video=dialog.querySelector('video');let closed=false;
  const finish=file=>{if(closed)return;closed=true;stream.getTracks().forEach(t=>t.stop());video.srcObject=null;dialog.close();dialog.remove();resolve(file);};
  video.srcObject=stream;video.onloadeddata=()=>{dialog.querySelector('[data-shoot]').disabled=false;};video.play().catch(()=>{});
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('click',async e=>{if(e.target.closest('[data-close]'))finish(null);if(e.target.closest('[data-shoot]')){const size=Math.min(video.videoWidth,video.videoHeight);if(!size)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=480;canvas.getContext('2d').drawImage(video,(video.videoWidth-size)/2,(video.videoHeight-size)/2,size,size,0,0,480,480);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.85));if(blob)finish(new File([blob],'Minha foto.jpg',{type:'image/jpeg'}));}});document.body.append(dialog);dialog.showModal();
 });
}
