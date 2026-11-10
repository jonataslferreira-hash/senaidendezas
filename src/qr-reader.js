import jsQR from 'jsqr';
export function qrRoomCode(value){try{const code=new URL(value).searchParams.get('s');return /^\d{6}$/.test(code||'')?code:null;}catch{return /^\d{6}$/.test(value)?value:null;}}
export async function scanRoomCode(){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('A câmera precisa de HTTPS e de um navegador compatível.');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).catch(()=>{throw Error('Permita a câmera para ler o QR Code. Você também pode digitar o código da sala.');});
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='qr-reader';dialog.innerHTML='<header><h2>Ler QR Code</h2><button type="button" aria-label="Fechar câmera">×</button></header><div class="qr-camera"><video autoplay playsinline muted></video><div class="qr-reticle"></div></div><p role="status">Aponte a câmera para o QR Code da sala.</p>';
  const video=dialog.querySelector('video'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let timer,closed=false;
  const finish=code=>{if(closed)return;closed=true;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());video.srcObject=null;dialog.close();dialog.remove();resolve(code);};
  const scan=()=>{if(closed)return;if(video.readyState>=2){canvas.width=Math.min(640,video.videoWidth);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);ctx.drawImage(video,0,0,canvas.width,canvas.height);const result=jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});if(result){const code=qrRoomCode(result.data);if(code){finish(code);return;}dialog.querySelector('p').textContent='Esse QR Code não contém uma sala. Aponte para o código da apresentação.';}}timer=setTimeout(scan,200);};
  dialog.querySelector('button').onclick=()=>finish(null);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});document.body.append(dialog);dialog.showModal();video.srcObject=stream;video.play().then(scan).catch(()=>finish(null));
 });
}
