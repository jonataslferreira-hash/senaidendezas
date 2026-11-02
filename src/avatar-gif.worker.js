import * as gifenc from 'gifenc';
const {GIFEncoder,quantize,applyPalette}=gifenc.GIFEncoder?gifenc:gifenc.default;
self.onmessage=event=>{
 try{let {frames,size}=event.data;const encode=(items,width)=>{const gif=GIFEncoder();for(const frame of items){const pixels=new Uint8Array(frame.pixels),palette=quantize(pixels,64,{format:'rgb444'}),indexed=applyPalette(pixels,palette,'rgb444');gif.writeFrame(indexed,width,width,{palette,delay:frame.delay,repeat:0});}gif.finish();return gif.bytes();};
  let bytes=encode(frames,size);
  if(bytes.byteLength>256*1024){const canvas=new OffscreenCanvas(112,112),ctx=canvas.getContext('2d'),source=new OffscreenCanvas(size,size),src=source.getContext('2d');frames=frames.filter((_,i)=>i%2===0).map(frame=>{src.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels),size,size),0,0);ctx.drawImage(source,0,0,112,112);return{pixels:ctx.getImageData(0,0,112,112).data.buffer,delay:frame.delay*2};});bytes=encode(frames,112);}
  if(bytes.byteLength>256*1024)throw Error('O trecho ficou grande. Use um vídeo com menos movimento ou um GIF menor.');const buffer=bytes.slice().buffer;self.postMessage({buffer},[buffer]);
 }catch(error){self.postMessage({error:error.message});}
};
