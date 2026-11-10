import {validateAudio} from './audio-data.js';
import {validateCustomModel} from './model-files.js';

const cues = {
  chime: {name:'Sino', notes:[523,659,784], step:.12, decay:12},
  success: {name:'Acerto', notes:[392,523,659,784], step:.12, decay:10},
  alert: {name:'Alerta', notes:[660,440,660], step:.19, decay:16},
  suspense: {name:'Suspense', notes:[130,147,139,165], step:.38, decay:5},
  transition: {name:'Transição', notes:[330,440,590], step:.07, decay:15}
};

export function createSlideSound(cue){
  if(!Object.hasOwn(cues,cue))return null;
  const {name,notes,step,decay}=cues[cue];
  const rate=16000, frames=Math.round((notes.length*step+.30)*rate);
  const bytes=new Uint8Array(44+frames*2), wav=new DataView(bytes.buffer);
  const fourCC=(offset,value)=>bytes.set(new TextEncoder().encode(value),offset);
  fourCC(0,'RIFF');wav.setUint32(4,bytes.length-8,true);fourCC(8,'WAVE');fourCC(12,'fmt ');
  wav.setUint32(16,16,true);wav.setUint16(20,1,true);wav.setUint16(22,1,true);
  wav.setUint32(24,rate,true);wav.setUint32(28,rate*2,true);wav.setUint16(32,2,true);wav.setUint16(34,16,true);
  fourCC(36,'data');wav.setUint32(40,frames*2,true);
  for(let i=0;i<frames;i++){
    const time=i/rate;
    let sample=0;
    for(let n=0;n<notes.length;n++){
      const t=time-n*step;
      if(t<0)break;
      const angle=2*Math.PI*notes[n]*t;
      const envelope=Math.min(1,t/.012)*Math.exp(-decay*t);
      sample+=envelope*(Math.sin(angle)+.18*Math.sin(angle*2));
    }
    const fade=Math.min(1,(frames-i)/320);
    wav.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample*.22*fade))*32767),true);
  }
  let binary='';
  for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return validateAudio({name:name+'.wav',data:'data:audio/wav;base64,'+btoa(binary),duration:frames/rate,volume:.35,loop:false});
}

function vector(value,min,max){
  return Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)
    ? value.map(n=>Math.max(min,Math.min(max,n)))
    : null;
}

export async function createSlideModel(spec){
  if(!Array.isArray(spec?.parts))return null;
  const parts=spec.parts.slice(0,16).flatMap(part=>{
    if(!['box','sphere','cylinder','cone'].includes(part?.shape))return [];
    const position=vector(part.position,-10,10),size=vector(part.size,.05,10);
    if(!position||!size)return [];
    return [{...part,position,size,rotation:vector(part.rotation,-360,360)||[0,0,0]}];
  });
  if(!parts.length)return null;
  const THREE=await import('three');
  const geometries={
    box:()=>new THREE.BoxGeometry(1,1,1),
    sphere:()=>new THREE.SphereGeometry(.5,16,10),
    cylinder:()=>new THREE.CylinderGeometry(.5,.5,1,16),
    cone:()=>new THREE.ConeGeometry(.5,1,16)
  };
  const obj=['mtllib model.mtl'],mtl=[];
  let vertexOffset=1;
  for(const [index,part] of parts.entries()){
    const geometry=geometries[part.shape]();
    try{
      const rotation=new THREE.Euler(...part.rotation.map(n=>n*Math.PI/180));
      const positions=geometry.getAttribute('position'),faces=geometry.index;
      const rgb=/^#[a-f0-9]{6}$/i.test(part.color)?part.color:'#6b86c9';
      const channels=rgb.slice(1).match(/../g).map(byte=>(parseInt(byte,16)/255).toFixed(4));
      const label=String(part.name||'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,48)||'Peca '+(index+1);
      obj.push('o '+label,'usemtl part'+index,part.shape==='box'?'s off':'s 1');
      mtl.push('newmtl part'+index,'Kd '+channels.join(' '));
      const point=new THREE.Vector3(),scale=new THREE.Vector3(...part.size);
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).multiply(scale).applyEuler(rotation);
        obj.push('v '+point.toArray().map((n,j)=>(n+part.position[j]).toFixed(5)).join(' '));
      }
      for(let i=0;i<faces.count;i+=3)obj.push('f '+[0,1,2].map(j=>faces.getX(i+j)+vertexOffset).join(' '));
      vertexOffset+=positions.count;
    }finally{geometry.dispose();}
  }
  const files=[['model.obj',obj],['model.mtl',mtl]].map(([name,lines])=>({name,data:'data:text/plain;base64,'+btoa(lines.join('\n'))}));
  return validateCustomModel({format:'obj',name:String(spec.name||'Modelo criado por IA').slice(0,120),data:JSON.stringify({main:'model.obj',files})});
}
