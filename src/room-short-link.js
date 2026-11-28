// Um único redirecionamento para a página inicial, criado previamente no is.gd.
// O código vai no fragmento: o navegador o preserva no redirecionamento e o
// serviço não precisa receber nem encurtar um endereço diferente por sala.
export const ROOM_LINK_BASE = 'https://is.gd/h4bAV2';

export function isPublicRoomLink(value){
 try{
  const url=new URL(value),keys=[...url.searchParams.keys()];
  return url.protocol==='https:'&&url.hostname==='jonataslferreira-hash.github.io'&&!url.port&&!url.username&&!url.password&&
   /^\/senaidendezas\/(?:index\.html)?$/.test(url.pathname)&&!url.hash&&keys.length===1&&keys[0]==='s'&&/^\d{6}$/.test(url.searchParams.get('s')||'');
 }catch{return false;}
}
export function shortRoomLink(value){
 if(!isPublicRoomLink(value))return null;
 return `${ROOM_LINK_BASE}#s=${new URL(value).searchParams.get('s')}`;
}

// Interpretar somente o formato exato, sem sobrescrever rotas ou convites.
// localSignal é preservado para desenvolvimento e testes de sala local.
export function roomFragmentUrl(value){
 try{
  const url=new URL(value),match=/^#s=(\d{6})$/.exec(url.hash);
  if(!match||[...url.searchParams.keys()].some(key=>key!=='localSignal'))return null;
  url.searchParams.set('s',match[1]);url.hash='';return url.href;
 }catch{return null;}
}

// O mesmo redirecionamento fixo também abre apresentações. Somente o código
// viaja no fragmento; links portáteis e convites nunca são encurtados aqui.
export function presentationFragmentUrl(value){
 try {
  const url=new URL(value),match=/^#p=([A-HJKMNP-Z2-9]{6})$/i.exec(url.hash),keys=[...url.searchParams.keys()];
  if(!match || keys.some(key=>key!=='page') || keys.length>1 || (keys.length&&url.searchParams.get('page')!=='library')) return null;
  url.search='';url.searchParams.set('p',match[1].toUpperCase());url.hash='';return url.href;
 }catch{return null;}
}
export function shortPresentationLink(code){
 return /^[A-HJKMNP-Z2-9]{6}$/i.test(code||'') ? `${ROOM_LINK_BASE}#p=${code.toUpperCase()}` : null;
}
