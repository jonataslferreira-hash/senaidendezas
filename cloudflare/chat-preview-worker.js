// Only public video IDs are sent to allowlisted providers; arbitrary/private URLs are never fetched.
const cache = new Map();
const rates = new Map();
export async function handleChatPreview(request,user,headers,fetcher=fetch){
 const pathname=new URL(request.url).pathname;
 if(!pathname.startsWith('/chat-preview/'))return null;
 const json=(data,status=200)=>Response.json(data,{status,headers});
 if(request.method!=='GET')return json({error:'method_not_allowed'},405);
 const match=/^\/chat-preview\/(youtube|vimeo|spotify)\/([A-Za-z0-9_-]+)$/.exec(pathname);if(!match)return json({error:'invalid_preview'},400);
 const [,provider,id]=match;if(!(provider==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(id)||provider==='vimeo'&&/^[0-9]{6,12}$/.test(id)||provider==='spotify'&&/^(track|album|playlist|episode|show)-[A-Za-z0-9]{22}$/.test(id)))return json({error:'invalid_preview'},400);
 const cacheKey=provider+':'+id,now=Date.now(),hit=cache.get(cacheKey);if(hit&&hit.expires>now)return json(hit.data);
 const rate=rates.get(user.id);if(rate&&rate.until>now&&rate.count>=60)return json({error:'rate_limited'},429);
 rates.set(user.id,rate&&rate.until>now?{...rate,count:rate.count+1}:{until:now+60000,count:1});
 if(rates.size>1000)rates.delete(rates.keys().next().value);
 const target=new URL(provider==='youtube'?'https://www.youtube.com/oembed':provider==='vimeo'?'https://vimeo.com/api/oembed.json':'https://open.spotify.com/oembed');target.searchParams.set('url',provider==='youtube'?'https://www.youtube.com/watch?v='+id:provider==='vimeo'?'https://vimeo.com/'+id:'https://open.spotify.com/'+id.replace('-', '/'));target.searchParams.set('format','json');
 try{
  const response=await fetcher(target.href,{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
  if(!response.ok)return json({error:'preview_unavailable'},404);
  const text=await response.text();if(text.length>65536)throw Error('oversized');
  const value=JSON.parse(text);if(typeof value.title!=='string'||(provider!=='spotify'&&typeof value.author_name!=='string'))throw Error('invalid');
  const data={title:value.title.trim().slice(0,300),author:typeof value.author_name==='string'?value.author_name.trim().slice(0,150):''};if(!data.title)throw Error('empty');
  if(provider!=='youtube'&&typeof value.thumbnail_url==='string'){try{const image=new URL(value.thumbnail_url),allowed=provider==='vimeo'?image.hostname==='i.vimeocdn.com':image.hostname==='i.scdn.co'||/^image-cdn-[a-z]{2}\.spotifycdn\.com$/.test(image.hostname);if(image.protocol==='https:'&&allowed&&!image.username&&!image.password)data.thumbnail=image.href;}catch{}}
  cache.set(cacheKey,{data,expires:now+3600000});if(cache.size>500)cache.delete(cache.keys().next().value);return json(data);
 }catch{return json({error:'preview_unavailable'},503);}
}
