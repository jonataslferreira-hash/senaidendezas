import known from './spotify-known.js';
import { spotifyItem } from './editor-playlist.js';
export async function spotifyMetadata(value) {
  const item=spotifyItem(value);if(!item)throw Error('Cole o link de uma música, playlist ou álbum do Spotify.');
  const {id,type}=item,fallbackTitle=type==='playlist'?'Playlist do Spotify':type==='album'?'Álbum do Spotify':'Música do Spotify',fallbackArtist=type==='playlist'||type==='album'?'Spotify':'Artista';
  try{
    const response=await fetch('https://open.spotify.com/oembed?url='+encodeURIComponent('https://open.spotify.com/'+type+'/'+id),{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();const info=await response.json();
    // O nome do cantor vem do oEmbed do Spotify (author_name); sem rede, cai no
    // catálogo local — nunca mais um genérico "Spotify" no player.
    const artist=String(info.author_name||'').replace(/^Spotify\s*[·•-]\s*/i,'').trim()||known[id]?.artist||fallbackArtist;
    return {id,type,title:String(info.title||known[id]?.title||fallbackTitle).slice(0,200),cover:typeof info.thumbnail_url==='string'&&info.thumbnail_url.startsWith('https://')?info.thumbnail_url:known[id]?.cover||'',artist};
  }catch{
    // Embedding remains possible when metadata is blocked or temporarily offline.
    return {id,type,title:known[id]?.title||fallbackTitle,cover:known[id]?.cover||'',artist:known[id]?.artist||fallbackArtist};
  }
}
