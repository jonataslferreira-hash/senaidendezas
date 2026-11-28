import {r2ApiUrl} from './cloud-files.js';

// Hydrate only visible public provider cards. Generic/private links never leave the browser.
export class ChatPreviews {
 constructor(studio){this.studio=studio;this.cache=new Map();this.queue=[];this.active=0;this.epoch=0;this.waiting=new Set();
  this.observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){this.observer.unobserve(e.target);this.enqueue(e.target);}}, {rootMargin:'200px'}):null;
  studio.root.addEventListener('account-changed',()=>{this.epoch++;this.observer?.disconnect();this.waiting.clear();for(const job of this.queue)job.reject(Error('account changed'));this.queue=[];this.cache.clear();});
 }
 mount(slot){
  for(const card of this.waiting)if(!card.isConnected){this.observer?.unobserve(card);this.waiting.delete(card);}
  for(const card of slot.querySelectorAll('[data-video-preview]:not([data-preview-state])')){
   card.dataset.previewState='waiting';this.waiting.add(card);if(this.observer)this.observer.observe(card);else this.enqueue(card);
  }
 }
 enqueue(card){this.waiting.delete(card);if(!card.isConnected)return;const id=card.dataset.videoPreview,provider=card.dataset.previewProvider,key=provider+':'+id,entry=this.cache.get(key);
  if(entry?.data){this.apply(card,entry.data);return;}if(entry?.failed&&entry.failed>Date.now()){this.failed(card);return;}
  if(entry?.promise){entry.promise.then(data=>this.apply(card,data)).catch(()=>this.failed(card));return;}
  const epoch=this.epoch;const promise=new Promise((resolve,reject)=>this.queue.push({id,provider,epoch,resolve,reject}));this.cache.set(key,{promise});
  promise.then(data=>{if(epoch!==this.epoch)return;this.cache.set(key,{data});if(this.cache.size>200)this.cache.delete(this.cache.keys().next().value);this.apply(card,data);}).catch(()=>{if(epoch===this.epoch)this.cache.set(key,{failed:Date.now()+120000});this.failed(card);});this.pump();
 }
 pump(){while(this.active<4&&this.queue.length){const job=this.queue.shift();this.active++;this.load(job.id,job.provider,job.epoch).then(job.resolve,job.reject).finally(()=>{this.active--;this.pump();});}}
 async load(id,provider,epoch){if(!r2ApiUrl||!(provider==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(id)||provider==='vimeo'&&/^[0-9]{6,12}$/.test(id)||provider==='spotify'&&/^(track|album|playlist|episode|show)-[A-Za-z0-9]{22}$/.test(id)))throw Error('unavailable');
  const {data}=await this.studio.account.client.auth.getSession();if(!data.session||epoch!==this.epoch)throw Error('no session');
  const response=await fetch(r2ApiUrl+'/chat-preview/'+provider+'/'+id,{headers:{Authorization:'Bearer '+data.session.access_token},signal:AbortSignal.timeout(8000)});if(!response.ok||epoch!==this.epoch)throw Error('unavailable');
  const result=await response.json();if(typeof result.title!=='string'||typeof result.author!=='string')throw Error('invalid');return result;
 }
 failed(card){if(!card.isConnected)return;card.dataset.previewState='failed';const title=card.querySelector('[data-preview-title]');if(title)title.textContent='Prévia indisponível';}
 apply(card,data){if(!card.isConnected||!data)return;const title=card.querySelector('[data-preview-title]'),author=card.querySelector('[data-preview-author]');if(title)title.textContent=data.title.slice(0,300);const provider=card.dataset.previewProvider,label=provider==='vimeo'?'Vimeo':provider==='spotify'?'Spotify':'YouTube';if(author)author.textContent=data.author?data.author.slice(0,150)+' · '+label:label;if(provider!=='youtube'&&typeof data.thumbnail==='string'){try{const u=new URL(data.thumbnail),allowed=provider==='vimeo'?u.hostname==='i.vimeocdn.com':u.hostname==='i.scdn.co'||/^image-cdn-[a-z]{2}\.spotifycdn\.com$/.test(u.hostname);if(u.protocol==='https:'&&allowed&&!u.username&&!u.password){const image=card.querySelector('.chat-link-art img');if(image){image.onerror=()=>{image.hidden=true;};image.src=u.href;image.hidden=false;}}}catch{}}card.dataset.previewState='ready';}
}
