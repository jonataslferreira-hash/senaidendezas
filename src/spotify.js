import known from './spotify-known.js';
import { spotifyTrackId } from './editor-playlist.js';
export async function spotifyMetadata(value) {
  const id=spotifyTrackId(value);if(!id)throw Error('Cole o link de uma música do Spotify.');
  try{
    const response=await fetch('https://open.spotify.com/oembed?url='+encodeURIComponent('https://open.spotify.com/track/'+id),{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();const info=await response.json();
    return {id,title:String(info.title||known[id]?.title||'Spotify').slice(0,200),cover:typeof info.thumbnail_url==='string'&&info.thumbnail_url.startsWith('https://')?info.thumbnail_url:known[id]?.cover||'',artist:info.author_name||known[id]?.artist||''};
  }catch{
    // Embedding remains possible when metadata is blocked or temporarily offline.
    return {id,title:known[id]?.title||'Spotify',cover:known[id]?.cover||'',artist:known[id]?.artist||''};
  }
}
