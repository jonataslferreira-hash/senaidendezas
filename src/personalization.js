export const themes=[
  ['violet','Violeta','#a57bce'],
  ['ocean','Oceano','#3d96b5'],
  ['forest','Floresta','#4b9a72'],
  ['rose','Rosa','#ce6a9e'],
  ['sunset','Pôr do sol','#d98250'],
  ['amber','Dourado','#bd9440'],
  ['teal','Turquesa','#369f99'],
  ['indigo','Índigo','#7379ce'],
  // Gradientes: continuam sendo uma única "cor do espaço" para o perfil.
  ['aurora','Aurora','linear-gradient(135deg,#4fe0c4 0%,#6aa6f0 50%,#a877ea 100%)'],
  ['candy','Candy','linear-gradient(135deg,#f06aa8 0%,#f79a8a 50%,#fbbf6a 100%)'],
  ['galaxy','Galáxia','linear-gradient(135deg,#3f63d6 0%,#8a5bd0 52%,#e06ac4 100%)'],
  ['citrus','Citrino','linear-gradient(135deg,#d9e04f 0%,#7fd67a 50%,#3ac7bd 100%)'],
  // Sorteado: cada clique no botão tira duas cores novas (guardadas neste aparelho).
  ['surprise','Sortear gradiente','conic-gradient(from 210deg,#f06aa8,#fbbf6a,#4fe0c4,#6aa6f0,#a877ea,#f06aa8)']
];
const SURPRISE_KEY='sl-surprise-gradient';
export function surpriseHues(roll=false,random=Math.random){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(SURPRISE_KEY)||'null');}catch{/* sem armazenamento */}
  if(!roll&&Array.isArray(saved)&&saved.length===2&&saved.every(Number.isFinite))return saved;
  // A segunda cor fica de 70° a 160° adiante no círculo cromático: sempre bem diferente da primeira.
  const start=Math.floor(random()*360),hues=[start,start+70+Math.floor(random()*91)];
  try{localStorage.setItem(SURPRISE_KEY,JSON.stringify(hues));}catch{/* sem armazenamento */}
  return hues;
}
export const surpriseSwatch=([start,end])=>`linear-gradient(135deg,hsl(${start} 82% 64%) 0%,hsl(${(start+end)/2} 78% 68%) 50%,hsl(${end} 82% 64%) 100%)`;
export function applySurprise(theme,root=document.documentElement){
  const names=['--palette-start','--palette-end','--personal-hue','--personal-secondary'];
  if(theme!=='surprise'){for(const name of names)root.style.removeProperty(name);return;}
  const [start,end]=surpriseHues();
  root.style.setProperty('--palette-start',String(start));root.style.setProperty('--palette-end',String(end));
  root.style.setProperty('--personal-hue',String(start%360));root.style.setProperty('--personal-secondary',String(end%360));
}
export const styles=[['classic','Clássico'],['glass','Liquid Glass'],['aero','Frutiger Aero'],['minimal','Minimalista'],['editorial','Office'],['arcade','8-Bit']];
export const validTheme=value=>themes.some(([id])=>id===value)?value:'violet';
export const validStyle=value=>value==='material'?'editorial':styles.some(([id])=>id===value)?value:'classic';
