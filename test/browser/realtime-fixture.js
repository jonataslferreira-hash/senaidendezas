export function decodeRealtime(raw){
 if(typeof raw==='string')return JSON.parse(raw);
 const bytes=Buffer.from(raw);
 if(bytes[0]!==3)return JSON.parse(String(raw));
 const sizes=[...bytes.subarray(1,6)];let offset=7;
 const fields=sizes.map(size=>{const value=bytes.subarray(offset,offset+size).toString();offset+=size;return value;});
 return [fields[0],fields[1],fields[2],'broadcast',{type:'broadcast',event:fields[3],payload:JSON.parse(bytes.subarray(offset).toString())}];
}
