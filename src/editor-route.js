import { createUuid } from './uuid.js';
const key='sl-editor-shortcuts';
const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}};
export function editorShortcut(id,context){const entries=read();let alias=Object.keys(entries).find(a=>entries[a].id===id&&entries[a].collab===(context.collab||''));if(!alias){do{alias=createUuid().slice(0,8);}while(entries[alias]);}entries[alias]={id,...context};try{localStorage.setItem(key,JSON.stringify(entries));return alias;}catch{return null;}}
export function routeParams(search=location.search){const params=new URLSearchParams(search),alias=params.get('edit');if(alias){const saved=history.state?.editor?.alias===alias?history.state.editor:read()[alias];if(saved?.id){params.set('page','editor');params.set('lesson',saved.id);for(const k of ['tab','slide','block','collab','question'])if(saved[k])params.set(k,String(saved[k]));}}return params;}
