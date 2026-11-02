export async function handleMusic(request,env,headers){
  if(new URL(request.url).pathname!=='/music/spotify')return null;
  const json=(body,status=200)=>Response.json(body,{status,headers});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(Number(request.headers.get('Content-Length'))>1024)return json({error:'too_large'},413);
  try{
    const text=await request.text();if(text.length>1024)return json({error:'too_large'},413);
    const {id}=JSON.parse(text);if(!/^[A-Za-z0-9]{22}$/.test(id))return json({error:'invalid_track'},400);
    const response=await fetch('https://open.spotify.com/oembed?url='+encodeURIComponent('https://open.spotify.com/track/'+id),{signal:AbortSignal.timeout(10000)});
    if(!response.ok)return json({error:'spotify_unavailable'},502);
    const info=await response.json(),result={title:String(info.title||'Música no Spotify').slice(0,200),cover:typeof info.thumbnail_url==='string'&&info.thumbnail_url.startsWith('https://')?info.thumbnail_url:'',artist:'No Spotify'};
    // oEmbed does not promise artist/duration. Optional official Web API fills these fields.
    if(env.SPOTIFY_CLIENT_ID&&env.SPOTIFY_CLIENT_SECRET){
      try{
        const auth=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.SPOTIFY_CLIENT_ID+':'+env.SPOTIFY_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(8000)}),token=await auth.json();
        if(token.access_token){const trackResponse=await fetch('https://api.spotify.com/v1/tracks/'+id,{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(8000)});if(trackResponse.ok){const track=await trackResponse.json();result.artist=(track.artists||[]).map(a=>a.name).join(', ').slice(0,200);result.duration=track.duration_ms;}}
      }catch{/* The official embed still works without Web API metadata. */}
    }return json(result);
  }catch{return json({error:'spotify_unavailable'},502);}
}
