const senaiLogo = new URL('./assets/institutions/senai.png', import.meta.url).href;
// Marca nacional aplicada às unidades SENAI identificadas no cadastro oficial/ROR.
export const institutionLogo = name => ['senai dendezeiros','servico nacional de aprendizagem industrial','senai','senai sao paulo','faculdade senai taubate','universidade senai cimatec','senai innovation institute for embedded systems'].includes(fold(name).trim()) ? senaiLogo : '';
const logos=new Map();
export const knownInstitutionId=name=>({'universidade federal da bahia':'Q159102','instituto federal da bahia':'Q4842556'})[fold(name).trim()]||'';
export const institutionLogoInfo=(name,id)=>institutionLogo(name)||id==='Q2274367'?{url:institutionLogo(name)||senaiLogo,credit:(import.meta.env?.BASE_URL||'./')+'institution-credits.txt'}:logos.get(id||knownInstitutionId(name))||null;
export async function fetchInstitutionLogos(ids,fetcher=fetch){
 const wanted=[...new Set(ids.filter(id=>/^Q[1-9][0-9]{0,11}$/.test(id)&&!logos.has(id)))].slice(0,10);if(!wanted.length)return;
 const url=new URL('https://www.wikidata.org/w/api.php');for(const [key,value] of Object.entries({action:'wbgetentities',ids:wanted.join('|'),props:'claims',format:'json',origin:'*'}))url.searchParams.set(key,value);
 const response=await fetcher(url,{signal:AbortSignal.timeout(8000),credentials:'omit'});if(!response.ok)throw Error('Logos indisponíveis');const data=await response.json();
 for(const id of wanted){const claims=data.entities?.[id]?.claims?.P154||[];const ranked=claims.filter(c=>c.rank!=='deprecated').sort((a,b)=>(b.rank==='preferred')-(a.rank==='preferred'));const name=ranked.map(c=>c.mainsnak?.datavalue?.value).find(v=>typeof v==='string'&&v.length<200&&!/[\u0000-\u001f\/?#]/.test(v)&&/\.(?:svg|png|jpe?g|webp)$/i.test(v));
  if(name)logos.set(id,{url:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(name)+'?width=200',credit:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(name)});else logos.set(id,null);
 }
}
// As sugestões usam o cadastro público ROR. O texto continua livre, inclusive
// para instituições que não estejam no cadastro ou quando a rede falhar.
const fallback=[
 {name:'SENAI Dendezeiros',aliases:['SENAI Salvador Dendezeiros','Dendezeiros'],place:'Salvador, Bahia',logo:senaiLogo},
 {name:'Serviço Nacional de Aprendizagem Industrial',aliases:['SENAI'],place:'Brasil',logo:senaiLogo},
 {name:'Universidade SENAI CIMATEC',aliases:['SENAI CIMATEC','SENAI BA'],place:'Salvador, Bahia',logo:senaiLogo},
 {name:'Instituto Federal da Bahia',aliases:['IFBA'],place:'Salvador, Bahia',wikidata:'Q4842556'},
 {name:'Universidade Federal da Bahia',aliases:['UFBA'],place:'Salvador, Bahia',wikidata:'Q159102'},
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
  const external=Array.isArray(item.external_ids)?item.external_ids.find(x=>x?.type==='wikidata'):null;const wikidata=Array.isArray(external?.all)?external.all.find(id=>typeof id==='string'&&/^Q[1-9][0-9]{0,11}$/.test(id)):undefined;
  const parents=(item.relationships||[]).filter(r=>r?.type==='parent'&&/^https:\/\/ror\.org\/[0-9a-hjkmnp-tv-z]{9}$/.test(r.id||'')).slice(0,2).map(r=>r.id);
  return [{name:entry.value.trim(),place,...(wikidata?{wikidata}:{}),...(parents.length?{parents}:{})}];
 });
}
export class InstitutionSearch {
 constructor(root){
  this.root=root;this.items=[];this.active=-1;this.sequence=0;
  root.addEventListener('input',e=>{if(e.target.id==='profile-school'){if(this.selected?.name!==e.target.value)this.selected=null;this.search(e.target);}});
  root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-institution-index]')&&!e.target.closest('[data-logo-credit]'))e.preventDefault();});
  root.addEventListener('click',e=>{if(e.target.closest('[data-logo-credit]'))return;const option=e.target.closest('[data-institution-index]');if(option)this.select(Number(option.dataset.institutionIndex));else if(!e.target.closest('.institution-search'))this.close();});
  root.addEventListener('keydown',e=>{if(e.target.id!=='profile-school')return;const list=root.querySelector('#institution-options');if(!list||list.hidden)return;
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();this.active=this.active<0?(e.key==='ArrowDown'?0:this.items.length-1):(this.active+(e.key==='ArrowDown'?1:-1)+this.items.length)%this.items.length;this.render();}
   else if(e.key==='Enter'&&this.active>=0){e.preventDefault();this.select(this.active);}
   else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();}
  });
 }
 close(){clearTimeout(this.timer);this.controller?.abort();this.sequence++;this.items=[];this.active=-1;const input=this.root.querySelector('#profile-school'),list=this.root.querySelector('#institution-options');if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}if(list){list.hidden=true;list.replaceChildren();}const status=this.root.querySelector('#institution-status');if(status)status.textContent='';}
 render(){
  const input=this.root.querySelector('#profile-school'),list=this.root.querySelector('#institution-options');if(!input||!list)return;
  list.replaceChildren();this.items.forEach((item,index)=>{const option=document.createElement('div');option.id='institution-option-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected',String(index===this.active));option.dataset.institutionIndex=String(index);const info=institutionLogoInfo(item.name,item.wikidata),image=item.logo||info?.url;if(image){const logo=document.createElement('img');logo.src=image;logo.loading='lazy';logo.referrerPolicy='no-referrer';logo.onerror=()=>logo.remove();logo.alt='';logo.className='institution-logo';option.append(logo);}const text=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name;text.append(name);if(item.place){const place=document.createElement('small');place.textContent=item.place;text.append(place);}if(image&&(item.logoCredit||info?.credit)){const credit=document.createElement('a');credit.href=item.logoCredit||info.credit;credit.target='_blank';credit.rel='noopener noreferrer';credit.dataset.logoCredit='';credit.textContent='Créditos';credit.setAttribute('aria-label','Créditos da marca de '+item.name);text.append(credit);}option.append(text);list.append(option);});
  list.hidden=!this.items.length;input.setAttribute('aria-expanded',String(Boolean(this.items.length)));if(this.active>=0)input.setAttribute('aria-activedescendant','institution-option-'+this.active);else input.removeAttribute('aria-activedescendant');
 }
 async loadLogos(sequence){
  const items=this.items;try{await fetchInstitutionLogos(items.map(item=>item.wikidata).filter(Boolean));if(sequence!==this.sequence)return;this.render();
   await Promise.all(items.filter(item=>!institutionLogoInfo(item.name,item.wikidata)&&item.parents?.length).slice(0,5).map(async item=>{
    for(const parent of item.parents){try{const response=await fetch('https://api.ror.org/v2/organizations/'+parent.split('/').pop(),{signal:AbortSignal.timeout(8000),credentials:'omit'});if(!response.ok)continue;const parsed=parseInstitutions({items:[await response.json()]})[0];if(!parsed)continue;await fetchInstitutionLogos([parsed.wikidata].filter(Boolean));if(sequence!==this.sequence)return;const info=institutionLogoInfo(parsed.name,parsed.wikidata);if(info&&parsed.wikidata){logos.set(parsed.wikidata,info);item.logo=info.url;item.logoCredit=info.credit;item.wikidata=parsed.wikidata;break;}}catch{/* sem vínculo ou marca confiável */}}
   }));if(sequence===this.sequence)this.render();
  }catch{/* Logo não disponível: o nome continua selecionável. */}
 }
 select(index){const input=this.root.querySelector('#profile-school'),item=this.items[index];if(!input||!item)return;this.selected={name:item.name,wikidata:item.wikidata||''};input.value=item.name;input.dispatchEvent(new Event('change',{bubbles:true}));this.close();input.focus();}
 search(input){
  this.close();const query=input.value.trim(),status=this.root.querySelector('#institution-status');if(query.length<3){if(status)status.textContent='Digite pelo menos 3 letras para buscar.';return;}
  this.items=localInstitutions(query);this.render();this.loadLogos(this.sequence);if(status)status.textContent='Buscando instituições…';const seq=this.sequence;
  this.timer=setTimeout(async()=>{
   this.controller=new AbortController();const controller=this.controller;const timer=setTimeout(()=>controller.abort(),8000);
   try{const url=new URL('https://api.ror.org/v2/organizations');url.searchParams.set('query',query);const response=await fetch(url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('Busca indisponível');const data=await response.json();if(seq!==this.sequence||input!==this.root.querySelector('#profile-school')||input.value.trim()!==query)return;
    const seen=new Set();this.items=[...localInstitutions(query),...parseInstitutions(data)].filter(item=>{const key=fold(item.name);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,10);this.active=-1;this.render();this.loadLogos(seq);if(status)status.textContent=this.items.length?'':'Nenhuma sugestão encontrada. Você pode escrever o nome completo.';
   }catch{if(seq===this.sequence&&input===this.root.querySelector('#profile-school')&&status)status.textContent='Busca indisponível. Você pode escrever o nome completo.';}finally{clearTimeout(timer);}
  },350);
 }
}
