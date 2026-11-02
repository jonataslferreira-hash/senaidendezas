import * as Y from 'yjs';
export { Y };
export const encode = bytes => { let text=''; for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384)); return btoa(text); };
export const decode = value => Uint8Array.from(atob(value), c=>c.charCodeAt(0));
const textFields=new Set(['title','description','tag','intro','callout','note','prompt','answer','text','imageAlt','explanation','points','options']);
const isText = (value,key) => textFields.has(key) && typeof value === 'string' && value.length < 20000;
function shared(value, key = '') {
  if(isText(value,key))return new Y.Text(value);
  if(Array.isArray(value)) {
    if(['slides','questions','elements'].includes(key) || value.length && value.every(item=>item && typeof item==='object' && typeof item.id==='string')) {
      const map=new Y.Map(),items=new Y.Map(),order=new Y.Array();map.set('$list',true);map.set('items',items);map.set('order',order);
      for(const item of value)items.set(item.id,shared(item));order.insert(0,value.map(item=>item.id));return map;
    }
    const array=new Y.Array();array.insert(0,value.map(item=>shared(item,key)));return array;
  }
  if(value && typeof value==='object'){const map=new Y.Map();for(const [key,item]of Object.entries(value))if(item!==undefined)map.set(key,shared(item,key));return map;}
  return value;
}
export function readShared(value) {
  if(value instanceof Y.Text)return value.toString();
  if(value instanceof Y.Array)return value.toArray().map(readShared);
  if(value instanceof Y.Map){
    if(value.get('$list')) { const seen=new Set(),items=value.get('items');return value.get('order').toArray().filter(id=>!seen.has(id)&&seen.add(id)&&items.has(id)).map(id=>readShared(items.get(id))); }
    return Object.fromEntries([...value.entries()].map(([key,item])=>[key,readShared(item)]));
  }
  return value;
}
function changeText(text, value) {
  const before=text.toString();let start=0,end=0;
  while(start<before.length && start<value.length && before[start]===value[start])start++;
  while(end<before.length-start && end<value.length-start && before[before.length-1-end]===value[value.length-1-end])end++;
  const remove=before.length-start-end;if(remove)text.delete(start,remove);
  const add=value.slice(start,value.length-end);if(add)text.insert(start,add);
}
function reconcile(old, value, replace, key = '') {
  if(old===value)return;
  if(old instanceof Y.Text && isText(value,key)){changeText(old,value);return;}
  if(old instanceof Y.Map && old.get('$list') && Array.isArray(value) && value.every(v=>v&&typeof v.id==='string')){
    const items=old.get('items'),order=old.get('order');
    for(const item of value)reconcile(items.get(item.id),item,v=>items.set(item.id,v));
    const ids=value.map(item=>item.id);
    for(let i=order.length-1;i>=0;i--)if(!ids.includes(order.get(i)))order.delete(i,1);
    for(let i=0;i<ids.length;i++)if(order.get(i)!==ids[i]){const position=order.toArray().indexOf(ids[i],i);if(position>=0)order.delete(position,1);order.insert(i,[ids[i]]);}
    if(order.length>ids.length)order.delete(ids.length,order.length-ids.length);return;
  }
  if(old instanceof Y.Map && !Array.isArray(value) && value && typeof value==='object'){
    for(const key of old.keys())if(!Object.hasOwn(value,key))old.delete(key);
    for(const [key,item]of Object.entries(value))if(item!==undefined)reconcile(old.get(key),item,v=>old.set(key,v),key);return;
  }
  if(old instanceof Y.Array && Array.isArray(value)){
    for(let i=0;i<value.length;i++)if(i<old.length)reconcile(old.get(i),value[i],v=>{old.delete(i,1);old.insert(i,[v]);},key);else old.insert(i,[shared(value[i],key)]);
    if(old.length>value.length)old.delete(value.length,old.length-value.length);return;
  }
  if(JSON.stringify(readShared(old))!==JSON.stringify(value))replace(shared(value,key));
}
export function writeLesson(doc, lesson) { doc.transact(()=>{ const root=doc.getMap('root');reconcile(root.get('lesson'),lesson,value=>root.set('lesson',value)); },'local'); }
export const readLesson = doc => readShared(doc.getMap('root').get('lesson'));
