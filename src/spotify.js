import known from './spotify-known.js';
import { spotifyItem } from './editor-playlist.js';
export async function spotifyMetadata(value) {
  const item=spotifyItem(value);if(!item)throw Error('Cole o link de uma música, playlist ou álbum do Spotify.');
  const {id,type}=item,fallbackTitle=type==='playlist'?'Playlist do Spotify':type==='album'?'Álbum do Spotify':'Música do Spotify',fallbackArtist=type==='playlist'||type==='album'?'Spotify':'Artista';
  try{
    // Duas rotas do oEmbed: o domínio open.spotify.com e o endpoint público
    // padrão (oembed.com). Se a primeira falhar (CORS/bloqueio), tenta a outra.
    let info=null;
    for(const endpoint of ['https://open.spotify.com/oembed?url=','https://oembed.com/providers?url=']){
      try{
        const response=await fetch(endpoint+encodeURIComponent('https://open.spotify.com/'+type+'/'+id),{signal:AbortSignal.timeout(10000)});
        if(!response.ok)continue;
        const data=await response.json();
        if(data&&(data.title||data.author_name)){info=data;break;}
      }catch{/* tenta o próximo */}
    }
    if(!info)throw Error();
    // O nome do cantor vem do oEmbed do Spotify (author_name); sem rede, cai no
    // catálogo local — nunca mais um genérico "Spotify" no player.
    const artist=String(info.author_name||'').replace(/^Spotify\s*[·•-]\s*/i,'').trim()||known[id]?.artist||fallbackArtist;
    return {id,type,title:String(info.title||known[id]?.title||fallbackTitle).slice(0,200),cover:typeof info.thumbnail_url==='string'&&info.thumbnail_url.startsWith('https://')?info.thumbnail_url:known[id]?.cover||'',artist};
  }catch{
    // Embedding remains possible when metadata is blocked or temporarily offline.
    return {id,type,title:known[id]?.title||fallbackTitle,cover:known[id]?.cover||'',artist:known[id]?.artist||fallbackArtist};
  }
}
