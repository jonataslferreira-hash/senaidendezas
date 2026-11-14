import {optimizeImage} from './image-optimize.js';
import {r2ApiUrl} from './cloud-files.js';
import {createClient} from '@supabase/supabase-js';
import {supabaseUrl,supabaseKey} from './auth-config.js';

// A busca passa primeiro pelo Worker do Storage Lab, que reúne Wikimedia
// Commons, Wikipédia e Openverse, guarda o resultado em cache e devolve a
// origem e a licença de cada imagem. Sem o Worker, o site ainda consulta os
// catálogos diretamente do navegador.

const WORKER_TIMEOUT=16000;
const clean=value=>String(value??'').trim();

let sharedClient=null;
function accountClient(){
  const current=globalThis.storageLabAccount?.client;
  if(current)return current;
  if(!sharedClient)sharedClient=createClient(supabaseUrl,supabaseKey);
  return sharedClient;
}

async function workerHeaders(){
  if(!r2ApiUrl)return null;
  const {data,error}=await accountClient().auth.getSession();
  if(error||!data?.session)return null;
  return {Authorization:'Bearer '+data.session.access_token};
}

async function workerJson(path){
  const local=import.meta.env.DEV;
  const headers=local?{}:await workerHeaders();
  if(!headers)return null;
  try{
    const response=await fetch((local?'':r2ApiUrl)+path,{headers,signal:AbortSignal.timeout(WORKER_TIMEOUT)});
    if(!response.ok)return null;
    return await response.json();
  }catch{return null;}
}

async function hasTransparentBackground(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, 32, 32);
    const { data } = context.getImageData(0, 0, 32, 32);
    let transparent = 0, visible = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] <= 16) transparent++;
      if (data[i] >= 128) visible++;
    }
    return transparent >= 16 && visible >= 16;
  } finally {
    bitmap.close();
  }
}

// SVG vem como texto: o navegador converte para PNG antes deoptimizar, porque
// o editor de slides trabalha com imagens rasterizadas.
async function rasterizeSvg(blob){
  const markup=await blob.text();
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'}));
  try{
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('svg inválido'));image.src=url;});
    const width=Math.max(1,Math.round(image.naturalWidth||512)),height=Math.max(1,Math.round(image.naturalHeight||512));
    const scale=Math.min(1,1200/Math.max(width,height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const converted=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!converted)throw Error('svg inválido');
    return converted;
  }finally{URL.revokeObjectURL(url);}
}

// O arquivo original guarda a transparência e a resolução; a miniatura do
// buscador entra quando o site de origem não deixa baixar.
async function fetchChoiceBlob(choice){
  if(choice.blob)return choice.blob;
  for(const url of [choice.original,choice.url].filter((value,index,list)=>value&&list.indexOf(value)===index)){
    const blob=await fetchImageBlob(url).catch(()=>null);
    if(blob&&blob.type.startsWith('image/')&&blob.size<=6_000_000)return blob;
  }
  return null;
}

// "hello kitty png", "carro sem fundo": o pedido é por um recorte transparente.
const transparentHint=/\b(?:png|transparente?s?|transparent|sem\s+fundo|fundo\s+removido|recortad[oa]s?)\b/iu;
const transparentWords=new RegExp(transparentHint.source,'giu');
export const wantsTransparentImage=query=>transparentHint.test(String(query||''));

async function fetchImageBlob(url){
  const direct=await fetch(url,{signal:AbortSignal.timeout(15000),credentials:'omit'}).then(response=>response.ok?response.blob():null).catch(()=>null);
  if(direct&&direct.type.startsWith('image/'))return direct;
  // O proxy do Worker alcança origens que bloqueiam o navegador (Flickr, por
  // exemplo) e devolve sempre a mesma origem exibida na ficha da imagem.
  const headers=await workerHeaders();
  if(headers){
    try{
      const response=await fetch(r2ApiUrl+'/storage-ai/images/raw?url='+encodeURIComponent(url),{headers,signal:AbortSignal.timeout(20000)});
      if(response.ok){
        const blob=await response.blob();
        if(blob.type.startsWith('image/'))return blob;
      }
    }catch{/* tenta o caminho direto */}
  }
  return direct;
}

function imageCredit(info) {
  const metadata=info.extmetadata||{};
  const licenseMarkup=metadata.LicenseShortName?.value||metadata.License?.value||'';
  const licenseNode=document.createElement('template');
  licenseNode.innerHTML=licenseMarkup;
  const license=licenseNode.content.textContent.trim().replace(/\s+/g,' ').toLowerCase();
  const source=info.descriptionurl;
  if(!/^https:\/\/commons\.wikimedia\.org\//.test(source||''))return null;
  if(/\b(?:pd|public domain|domínio público|cc0|cc-zero)\b/.test(license)&&metadata.AttributionRequired?.value!=='true'){
    return {source,license:/cc0|cc-zero/.test(license)?'CC0':'domínio público'};
  }
  const match=/cc[- ]?(by(?:[- ]sa)?)[- ]?(\d\.\d)/i.exec(license);
  const attribution=document.createElement('template');
  attribution.innerHTML=metadata.Attribution?.value||metadata.Artist?.value||'';
  const author=attribution.content.textContent.trim().replace(/\s+/g,' ').slice(0,300);
  if(!match||!author)return null;
  const variant=match[1].toLowerCase().replace(/\s+/g,'-');
  return {source,author,license:'CC '+variant.toUpperCase()+' '+match[2],licenseUrl:'https://creativecommons.org/licenses/'+variant+'/'+match[2]+'/'};
}

// translate:false mantém o pedido no idioma original — o Bing entende
// português; a tradução só ajuda os catálogos que são quase todos em inglês.
export function normalizeImageQuery(query,{translate=true}={}) {
  return (translate?expandImageQuery(String(query||'')):String(query||''))
    .replace(/[“”‘’"]/g,'')
    .replace(/\b(?:por favor|poderia|pode|quero|quero que|coloque|colocar|adicione|adicionar|insira|inserir|troque|trocar|substitua|substituir)\b/gi,' ')
    .replace(/\b(?:esta|esse|essa|este|a|o)\s+(?:imagem|foto|figura|ilustração|ilustracao)\s+(?:por|para)\b/gi,' ')
    .replace(/\b(?:uma?|a|o|as|os)\s+(?:imagem|foto|figura|ilustração|ilustracao)\s+(?:de|sobre)?\b/gi,' ')
    .replace(/\b(?:imagem|foto|figura|ilustração|ilustracao)\s+(?:de|sobre)\b/gi,' ')
    .replace(/\b(?:um|uma|o|a)\s+(?=[\p{L}\p{N}])/gu,' ')
    .replace(/\b(?:nessa|nesta|neste|nesse)\s+(?:página|pagina|slide)\b/gi,' ')
    .replace(/\b(?:com|de)\s+fundo\s+(?:transparente|removido)\b/gi,' ')
    .replace(/[^\p{L}\p{N}\s-]/gu,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,120);
}

// Os catálogos são quase todos em inglês. Pedidos em português ("área de
// trabalho do windows") não encontram nada; traduzir os termos mais comuns
// resolve a maioria dos assuntos escolares sem depender do modelo.
const imageQueryTranslations=[
  ['área de trabalho','desktop'],['area de trabalho','desktop'],['tela do computador','computer screen'],
  ['inteligência artificial','artificial intelligence'],['inteligencia artificial','artificial intelligence'],
  ['aprendizado de máquina','machine learning'],['aprendizado de maquina','machine learning'],
  ['placa-mãe','motherboard'],['placa mae','motherboard'],['memória ram','ram memory'],['memoria ram','ram memory'],
  ['disco rígido','hard disk'],['disco rigido','hard disk'],['nuvem','cloud computing'],
  ['sistema solar','solar system'],['meio ambiente','environment'],['aquecimento global','global warming'],
  ['sistemas operacionais','operating systems'],['sistema operacional','operating system'],
  ['sistema','system'],['operacional','operating'],
  ['mudança climática','climate change'],['mudanca climatica','climate change'],
  ['revolução industrial','industrial revolution'],['revolucao industrial','industrial revolution'],
  ['revolução francesa','french revolution'],['revolucao francesa','french revolution'],
  ['idade média','middle ages'],['idade media','middle ages'],['corpo humano','human body'],
  ['energia solar','solar energy'],['computador','computer'],['notebook','laptop'],['celular','smartphone'],
  ['teclado','keyboard'],['monitor','computer monitor'],['servidor','server'],['rede','network'],
  ['redes','networks'],['segurança','security'],['seguranca','security'],['programação','programming'],
  ['programacao','programming'],['código','code'],['codigo','code'],['algoritmo','algorithm'],
  ['dados','data'],['robótica','robotics'],['robotica','robotics'],['robô','robot'],['robo','robot'],
  ['planeta','planet'],['terra','earth'],['lua','moon'],['estrela','star'],['galáxia','galaxy'],
  ['galaxia','galaxy'],['universo','universe'],['fotossíntese','photosynthesis'],['fotossintese','photosynthesis'],
  ['planta','plant'],['célula','cell'],['celula','cell'],['cérebro','brain'],['cerebro','brain'],
  ['coração','heart'],['coracao','heart'],['pulmão','lung'],['pulmao','lung'],['vacina','vaccine'],
  ['vírus','virus'],['virus','virus'],['bactéria','bacteria'],['bacteria','bacteria'],['doença','disease'],
  ['doenca','disease'],['átomo','atom'],['atomo','atom'],['molécula','molecule'],['molecula','molecule'],
  ['energia','energy'],['eletricidade','electricity'],['água','water'],['agua','water'],
  ['ecossistema','ecosystem'],['floresta','forest'],['oceano','ocean'],['poluição','pollution'],
  ['poluicao','pollution'],['reciclagem','recycling'],['alimentação','food'],['alimentacao','food'],
  ['nutrição','nutrition'],['nutricao','nutrition'],['saúde','health'],['saude','health'],
  ['história','history'],['historia','history'],['guerra','war'],['escravidão','slavery'],
  ['escravidao','slavery'],['independência','independence'],['independencia','independence'],
  ['democracia','democracy'],['eleição','election'],['eleicao','election'],['economia','economy'],
  ['dinheiro','money'],['trabalho','work'],['escola','school'],['professor','teacher'],['livro','book'],
  ['leitura','reading'],['arte','art'],['música','music'],['musica','music'],['teatro','theater'],
  ['futebol','football'],['esporte','sport'],['futuro','future'],['inovação','innovation'],
  ['inovacao','innovation'],['empresa','company'],['bandeira','flag'],['mapa','map'],['animal','animal'],
  ['animais','animals'],['fruta','fruit'],['vegetais','vegetables']
];
const translationPatterns=imageQueryTranslations.map(([portuguese,english])=>({
  english,
  pattern:new RegExp('(?<![\\p{L}\\p{N}])'+portuguese.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','giu')
}));
export function expandImageQuery(query){
  let text=String(query||'').replace(/\b(hello kitty)\s+(?:personagem|character)\b/gi,'$1');
  for(const {pattern,english} of translationPatterns)text=text.replace(pattern,english);
  return text.replace(/\s+/g,' ').trim();
}

const searchWords=value=>String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]+/gu)||[];
const imageStopWords=new Set('com sem para por uma dos das que and the with from foto imagem ilustracao photo image illustration futuro future conclusao conclusion introducao introduction mudancas changes logo logotipo logomarca png svg personagem personagens character characters boneco boneca toy brinquedo desenho cartoon anime manga mascote mascot fundo background transparente transparent render wallpaper papel parede hd 4k'.split(' '));
const subjectWords=value=>[...new Set(searchWords(value).filter(word=>word.length>2&&!imageStopWords.has(word)).map(word=>word.replace(/s$/,'')))];
const isLogoQuery=value=>searchWords(value).some(word=>['logo','logotipo','logomarca'].includes(word));
const isLogoTitle=value=>searchWords(value).some(word=>['logo','logotipo','logomarca','icon','icone','symbol','simbolo'].includes(word));

function choiceFromWorker(item){
  return {
    title:clean(item.title).slice(0,200),
    file:clean(item.file).slice(0,200),
    thumbnail:clean(item.thumbnail),
    url:clean(item.url),
    source:clean(item.source),
    author:clean(item.author),
    license:clean(item.license),
    licenseUrl:clean(item.licenseUrl),
    catalog:clean(item.catalog)||'Catálogo livre',
    kind:clean(item.kind),
    original:/^https:\/\//.test(clean(item.original))?clean(item.original):'',
    transparent:item.transparent===true,
    width:Number(item.width)||0,
    height:Number(item.height)||0,
    score:Number(item.score)||0
  };
}

// PDFs, DJVUs e TIFFs de páginas escaneadas não são fotos de slide.
const documentFile=/\.(?:pdf|djvu|djv|tiff?|bmp|docx?|pptx?|xlsx?|odt|ods|odp|epub|txt|zip|gz|ogg|ogv|webm|mp4)$/i;
const isDocumentChoice=choice=>/^(?:application\/|image\/(?:vnd\.djvu|tiff|x-tiff|x-ms-bmp))/i.test(choice.kind||'')||
  documentFile.test(choice.file||'')||documentFile.test(choice.title||'');

// Palavras que só dizem "marca" ou "assunto genérico" não bastam para aceitar
// uma imagem: no Commons, "windows" devolve fotos de janelas de prédios e
// "conclusion" devolve qualquer coisa. Elas continuam valendo como reforço,
// mas nunca como único motivo.
const ambiguousWords=new Set('window office word excel powerpoint teams edge chrome drive cloud mouse apple python java swift rust future conclusion introduction evolution system operating desktop user interface update folder file browser store paint photos camera xbox'.split(' '));

// Expressões técnicas de duas palavras que valem como assunto mesmo quando
// cada palavra sozinha é ambígua ("operating system", "neural network").
const strongPhrases=['operating system','artificial intelligence','machine learning','neural network',
  'hard disk','solid state drive','computer virus','solar system','world war','cold war','climate change',
  'industrial revolution','human body','solar energy','global warming','computer science','social media',
  'video game','open source','data center','user interface','graphics card','computer network'];

// As palavras que decidem se a imagem tem a ver com o pedido.
export function strongQueryWords(value){
  const raw=searchWords(value);
  // "windows" sozinho é janela de prédio; com uma pista de marca/versão
  // ("Windows 11", "Microsoft Windows", "Windows screenshot") volta a ser o
  // sistema operacional.
  const guided=raw.some(word=>['microsoft','copilot','pc','10','11','12','screenshot','os'].includes(word));
  const brand=new Set(['window','microsoft','copilot','office','excel','word','powerpoint','teams','edge','xbox']);
  return subjectWords(value).filter(word=>word.length>3&&(!ambiguousWords.has(word)||guided&&brand.has(word)));
}

// Quantas palavras (ou expressões) fortes do pedido aparecem na imagem.
function relevanceOf(choice,strong,phrases){
  const text=subjectWords([choice.title,choice.file].filter(Boolean).join(' ')).join(' ');
  let relevance=strong.filter(word=>text.split(' ').includes(word)).length;
  for(const phrase of phrases)if((' '+text+' ').includes(' '+phrase+' '))relevance++;
  return relevance;
}

export async function findSlideImage(query, { transparent = false, aspectRatio = 1.5 } = {}) {
  if(typeof query!=='string'||!query.trim())return null;
  transparent=transparent||wantsTransparentImage(query);
  const subject=normalizeImageQuery(query);
  if(!subject)return null;
  const strong=strongQueryWords(subject);
  const subjectText=subjectWords(subject).join(' ');
  const phrases=strongPhrases.filter(phrase=>(' '+subjectText+' ').includes(' '+phrase+' '));
  const minimum=strong.length?Math.max(1,Math.ceil(strong.length/2)):1;
  const logo=isLogoQuery(subject);
  const broader=subject.replace(/\b(?:gaming|gamer|transparent|png)\b/gi,'').replace(/\s+/g,' ').trim();
  // Palavras que explicam o pedido ("de", "do", "da") atrapalham a busca: o
  // produto e o tema ficam mais claros quando sobra só o que significa.
  const meaningful=broader.split(/\s+/).filter(word=>word.length>3&&!imageStopWords.has(word));
  const keywords=meaningful.slice(0,4).join(' ');
  const tail=meaningful.at(-1)||'';
  const searches=[subject,broader,keywords,tail].filter((term,i,terms)=>term&&terms.indexOf(term)===i);

  const prepare=async(choice,needAlpha)=>{
    try{
      const blob=await fetchChoiceBlob(choice);
      if(!blob)return null;
      const prepared=blob.type==='image/svg+xml'?await rasterizeSvg(blob):blob;
      const alpha=await hasTransparentBackground(prepared).catch(()=>false);
      if(needAlpha&&!alpha)return null;
      const file=await optimizeImage(new File([prepared],'imagem-livre',{type:prepared.type||'image/png'}),{maxSide:800});
      if(file.size>1_400_000)return null;
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      return {data,alt:choice.title,transparent:alpha,...creditOf(choice)};
    }catch{return null;}
  };

  // 1. Buscador (Bing, pelo Worker). A ordem dele já é a de relevância — é o
  // que faz "windows" virar o sistema operacional e não uma janela de prédio.
  // Por isso aqui não há filtro por palavras do título: só saem documentos.
  let web=[];
  const spoken=normalizeImageQuery(query,{translate:false}).replace(transparentWords,' ').replace(/\s+/g,' ').trim();
  for(const term of [spoken,subject,broader].filter((value,i,list)=>value&&list.indexOf(value)===i).slice(0,2)){
    const payload=await workerJson('/storage-ai/images?source=bing&q='+encodeURIComponent(term)+'&page=1&limit=24'+(transparent?'&transparent=1':''));
    web=(payload?.items||[]).map(choiceFromWorker).filter(choice=>choice.thumbnail&&choice.url&&!isDocumentChoice(choice));
    if(web.length)break;
  }
  if(transparent)for(const choice of web.slice(0,8)){
    const image=await prepare(choice,true);
    if(image)return image;
  }

  // 2. Catálogos livres (Commons). Sem um buscador de verdade por trás, o
  // título precisa citar o assunto para a imagem ser aceita.
  const candidates=[];
  if(!web.length&&(strong.length||phrases.length)){
    const formats=transparent?['filemime:png','filemime:svg']:[logo?'':'filetype:bitmap'];
    for(const term of searches)for(const format of formats){
      const params=new URLSearchParams({
        action:'query',format:'json',formatversion:'2',origin:'*',generator:'search',
        gsrsearch:term+' '+format,gsrnamespace:'6',gsrlimit:'12',
        prop:'imageinfo',iiprop:'url|size|mime|thumbmime|extmetadata',iiurlwidth:'800',
        iiextmetadatafilter:'License|LicenseShortName|LicenseUrl|AttributionRequired|Artist|Attribution|ImageDescription'
      });
      const signal=AbortSignal.timeout(6500);
      try{
        const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{signal});
        if(!response.ok)continue;
        const {query:results}=await response.json();
        for(const page of results?.pages||[]){
          const info=page.imageinfo?.[0];
          if(!info||documentFile.test(page.title||'')||/^(?:application\/|image\/(?:vnd\.djvu|tiff|x-tiff|x-ms-bmp))/i.test(info.mime||''))continue;
          if(!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(info?.thumburl||''))continue;
          const credit=imageCredit(info);
          if(!credit||transparent&&info.thumbmime&&!['image/png','image/webp'].includes(info.thumbmime))continue;
          candidates.push({
            title:page.title.replace(/^File:/,'').replace(/\.[^.]+$/,'').slice(0,200),
            description:String(info?.extmetadata?.ImageDescription?.value||'').replace(/<[^>]*>/g,' ').slice(0,300),
            thumbnail:info.thumburl,url:info.thumburl,...credit,catalog:'Wikimedia Commons',
            width:Number(info?.width)||0,height:Number(info?.height)||0
          });
        }
      }catch{continue;}
    }
  }
  const catalog=candidates
    .filter(choice=>!isDocumentChoice(choice))
    .filter(choice=>!logo||isLogoTitle(choice.title+' '+(choice.file||'')))
    .map(choice=>({choice,relevance:relevanceOf(choice,strong,phrases)}))
    .filter(item=>item.relevance>=minimum)
    .sort((a,b)=>{
      if(b.relevance!==a.relevance)return b.relevance-a.relevance;
      const ratio=choice=>choice.width&&choice.height?Math.abs(Math.log((choice.width/choice.height)/aspectRatio)):0;
      return ratio(a.choice)-ratio(b.choice);
    })
    .slice(0,8).map(item=>item.choice);
  if(transparent)for(const choice of catalog){
    const image=await prepare(choice,true);
    if(image)return image;
  }
  // 3. Nenhum recorte transparente serviu: vale mais entregar a imagem certa
  // (avisando que o fundo não é transparente) do que não trocar nada.
  for(const choice of [...web.slice(0,8),...catalog]){
    const image=await prepare(choice,false);
    if(image)return image;
  }
  return null;
}

function creditOf(choice){
  return {
    source:choice.source||'',
    author:choice.author||'',
    license:choice.license||'',
    licenseUrl:choice.licenseUrl||'',
    catalog:choice.catalog||'Catálogo livre'
  };
}

export function imageSourceNote(image){
  return [`Imagem: ${image.alt} · ${image.author?image.author+' · ':''}${image.catalog||'Wikimedia Commons'}${image.license?' · '+image.license:''}`,
    image.source,image.licenseUrl].filter(Boolean).join('\n');
}

export async function searchImageChoices(query,page=1,{transparent=false}={}){
  const wantsAlpha=transparent||wantsTransparentImage(query);
  const spoken=normalizeImageQuery(query,{translate:false});
  const term=spoken.replace(transparentWords,' ').replace(/\s+/g,' ').trim()||spoken;
  if(!term)return [];
  // A galeria mostra os resultados na ordem do Bing. Reordenar pelas palavras
  // do título colocava na frente imagens que só tinham o nome pedido e
  // empurrava para baixo as que o buscador considerava mais certas.
  const worker=await workerJson('/storage-ai/images?source=bing&q='+encodeURIComponent(term)+'&page='+String(page)+'&limit=24'+(wantsAlpha?'&transparent=1':''));
  // A transparência só é afirmada depois de conferida no arquivo (verifyTransparentChoice).
  const usable=payload=>(payload?.items||[]).map(choiceFromWorker)
    .filter(choice=>choice.thumbnail&&choice.url&&!isDocumentChoice(choice))
    .map(choice=>({...choice,transparent:false}));
  const found=usable(worker);
  if(found.length)return found;
  // Bing sem resposta na primeira página: os catálogos livres (Commons,
  // Wikipédia, Openverse) evitam uma galeria vazia.
  if(page===1){
    const catalogs=await workerJson('/storage-ai/images?q='+encodeURIComponent(term)+'&page=1&limit=24'+(wantsAlpha?'&transparent=1':''));
    const extra=usable(catalogs);
    if(extra.length)return extra;
    if(catalogs||worker)return [];
  }
  if(worker)return [];
  throw Error('Não foi possível consultar o Bing. Tente novamente em instantes.');
}

// Baixa o arquivo original e confere pixel a pixel se o fundo é transparente.
// A miniatura do buscador é JPEG e nunca guarda transparência, então só o
// original responde. Devolve o arquivo conferido (reaproveitado ao inserir).
export async function verifyTransparentChoice(choice){
  if(!choice.original)return null;
  try{
    const blob=await fetchImageBlob(choice.original);
    if(!blob||!blob.type.startsWith('image/')||blob.size>6_000_000||blob.type==='image/jpeg')return null;
    const prepared=blob.type==='image/svg+xml'?await rasterizeSvg(blob):blob;
    return await hasTransparentBackground(prepared)?prepared:null;
  }catch{return null;}
}

export async function importImageChoice(choice){
  const blob=await fetchChoiceBlob(choice);
  if(!blob)throw Error('Não consegui carregar esta imagem. Tente outra da lista.');
  const prepared=blob.type==='image/svg+xml'?await rasterizeSvg(blob):blob;
  const file=await optimizeImage(new File([prepared],'imagem',{type:prepared.type||'image/png'}),{maxSide:1200});
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  return {data,alt:choice.title,source:choice.source,author:choice.author,license:choice.license,licenseUrl:choice.licenseUrl,catalog:choice.catalog};
}
