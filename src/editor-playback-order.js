// Spotify é um player externo: não expõe um evento confiável de fim da playlist.
// O avanço automático controla apenas os áudios reproduzidos pelo Storage Lab.
export function nextEditorTrack(tracks,index,{shuffle=false,repeat='all',played=[],random=Math.random}={}){
 const available=tracks.map((track,i)=>({track,i})).filter(({track})=>track.kind!=='spotify');
 if(!available.length||tracks[index]?.kind==='spotify')return {index:null,played:[]};
 if(repeat==='one')return {index,played:[...played]};
 if(!shuffle){const following=available.find(entry=>entry.i>index);return {index:following?.i??(repeat==='all'?available[0].i:null),played:[]};}
 const visited=new Set(played);if(tracks[index])visited.add(tracks[index].id);
 let candidates=available.filter(({track})=>!visited.has(track.id));
 if(!candidates.length&&repeat==='all'){
  visited.clear();if(available.length>1&&tracks[index])visited.add(tracks[index].id);
  candidates=available.filter(({track})=>!visited.has(track.id));
 }
 if(!candidates.length)return {index:null,played:[...visited]};
 const pick=Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)));
 return {index:candidates[pick].i,played:[...visited]};
}
