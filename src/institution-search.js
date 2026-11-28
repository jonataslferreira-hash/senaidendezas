const senaiLogo = new URL('./assets/institutions/senai.png', import.meta.url).href;
// Marca SENAI nacional, aplicada apenas à unidade confirmada abaixo.
export const institutionLogo = name => fold(name).trim() === 'senai dendezeiros' ? senaiLogo : '';
// As sugestões usam o cadastro público ROR. O texto continua livre, inclusive
// para instituições que não estejam no cadastro ou quando a rede falhar.
const fallback=[
 {name:'SENAI Dendezeiros',aliases:['SENAI Salvador Dendezeiros','Dendezeiros'],place:'Salvador, Bahia',logo:senaiLogo},
 {name:'Serviço Nacional de Aprendizagem Industrial',aliases:['SENAI'],place:'Brasil'},
 {name:'Universidade SENAI CIMATEC',aliases:['SENAI CIMATEC','SENAI BA'],place:'Salvador, Bahia'},
 {name:'Instituto Federal da Bahia',aliases:['IFBA'],place:'Salvador, Bahia'},
 {name:'Universidade Federal da Bahia',aliases:['UFBA'],place:'Salvador, Bahia'},
];
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function localInstitutions(query){const q=fold(query.trim());if(q.length<3)return [];return fallback.filter(item=>[item.name,...item.aliases].some(name=>fold(name).includes(q)));}
export function parseInstitutions(data){
 if(!Array.isArray(data?.items))return [];
 return data.items.slice(0,12).flatMap(item=>{
  const names=Array.isArray(item?.names)?item.names:[];
  const entry=names.find(n=>n?.types?.includes('ror_display'))||names.find(n=>n?.lang==='pt'&&n?.types?.includes('label'))||names.find(n=>n?.types?.includes('label'));
  if(typeof entry?.value!=='string'||!entry.value.trim()||entry.value.length>80)return [];
  const geo=item.locations?.[0]?.geonames_details;const place=[geo?.name,geo?.country_subdivision_name,geo?.country_name].filter(v=>typeof v==='string').join(', ').slice(0,160);
  return [{name:entry.value.trim(),place}];
 });
}
export class InstitutionSearch {
 constructor(root){
  this.root=root;this.items=[];this.active=-1;this.sequence=0;
  root.addEventListener('input',e=>{if(e.target.id==='profile-school')this.search(e.target);});
  root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-institution-index]'))e.preventDefault();});
  root.addEventListener('click',e=>{const option=e.target.closest('[data-institution-index]');if(option)this.select(Number(option.dataset.institutionIndex));else if(!e.target.closest('.institution-search'))this.close();});
  root.addEventListener('keydown',e=>{if(e.target.id!=='profile-school')return;const list=root.querySelector('#institution-options');if(!list||list.hidden)return;
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();this.active=this.active<0?(e.key==='ArrowDown'?0:this.items.length-1):(this.active+(e.key==='ArrowDown'?1:-1)+this.items.length)%this.items.length;this.render();}
   else if(e.key==='Enter'&&this.active>=0){e.preventDefault();this.select(this.active);}
   else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();}
  });
 }
 close(){clearTimeout(this.timer);this.controller?.abort();this.sequence++;this.items=[];this.active=-1;const input=this.root.querySelector('#profile-school'),list=this.root.querySelector('#institution-options');if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}if(list){list.hidden=true;list.replaceChildren();}const status=this.root.querySelector('#institution-status');if(status)status.textContent='';}
 render(){
  const input=this.root.querySelector('#profile-school'),list=this.root.querySelector('#institution-options');if(!input||!list)return;
  list.replaceChildren();this.items.forEach((item,index)=>{const option=document.createElement('div');option.id='institution-option-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected',String(index===this.active));option.dataset.institutionIndex=String(index);if(item.logo){const logo=document.createElement('img');logo.src=item.logo;logo.alt='';logo.className='institution-logo';option.append(logo);}const text=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name;text.append(name);if(item.place){const place=document.createElement('small');place.textContent=item.place;text.append(place);}option.append(text);list.append(option);});
  list.hidden=!this.items.length;input.setAttribute('aria-expanded',String(Boolean(this.items.length)));if(this.active>=0)input.setAttribute('aria-activedescendant','institution-option-'+this.active);else input.removeAttribute('aria-activedescendant');
 }
 select(index){const input=this.root.querySelector('#profile-school'),item=this.items[index];if(!input||!item)return;input.value=item.name;input.dispatchEvent(new Event('change',{bubbles:true}));this.close();input.focus();}
 search(input){
  this.close();const query=input.value.trim(),status=this.root.querySelector('#institution-status');if(query.length<3){if(status)status.textContent='Digite pelo menos 3 letras para buscar.';return;}
  this.items=localInstitutions(query);this.render();if(status)status.textContent='Buscando no cadastro ROR…';const seq=this.sequence;
  this.timer=setTimeout(async()=>{
   this.controller=new AbortController();const controller=this.controller;const timer=setTimeout(()=>controller.abort(),8000);
   try{const url=new URL('https://api.ror.org/v2/organizations');url.searchParams.set('query',query);const response=await fetch(url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('Busca indisponível');const data=await response.json();if(seq!==this.sequence||input!==this.root.querySelector('#profile-school')||input.value.trim()!==query)return;
    const seen=new Set();this.items=[...localInstitutions(query),...parseInstitutions(data)].filter(item=>{const key=fold(item.name);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,10);this.active=-1;this.render();if(status)status.textContent=this.items.length?'':'Nenhuma sugestão encontrada. Você pode escrever o nome completo.';
   }catch{if(seq===this.sequence&&input===this.root.querySelector('#profile-school')&&status)status.textContent='Busca indisponível. Você pode escrever o nome completo.';}finally{clearTimeout(timer);}
  },350);
 }
}
